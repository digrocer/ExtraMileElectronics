// Rust command surface (docs/07-DESKTOP-ADMIN.md §6, §8).
// Only SUPABASE_URL + anon key are compiled into the webview; no privileged secret
// is ever present in this binary (test D-01). There is no OAuth in the desktop: the
// device is bound once to an admin account, then a local 6-digit PIN unlocks the
// stored Supabase session on every launch (docs/07 §5).
use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use argon2::Argon2;
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use keyring::{Entry, Error as KeyringError};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;
use uuid::Uuid;

mod offline;
mod printing;

const SERVICE: &str = "com.extramile.admin";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

// ── generic secrets (Windows Credential Manager) ─────────────────────────────
#[tauri::command]
fn secure_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn secure_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn secure_clear(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Stable per-device id, generated once and persisted in the keychain.
#[tauri::command]
fn device_id() -> Result<String, String> {
    let e = entry("device_id")?;
    match e.get_password() {
        Ok(v) => Ok(v),
        Err(KeyringError::NoEntry) => {
            let id = Uuid::new_v4().to_string();
            e.set_password(&id).map_err(|err| err.to_string())?;
            Ok(id)
        }
        Err(err) => Err(err.to_string()),
    }
}

// ── PIN vault (docs/07 §5) ───────────────────────────────────────────────────
// The refresh token is sealed with AES-256-GCM under a key derived from the PIN
// (Argon2id). The derived key is cached in memory only for the unlocked session so
// that rotated refresh tokens can be re-sealed without re-prompting. Wrong PINs are
// counted; after MAX_FAILS the vault is wiped and the device must be re-enrolled.
const VAULT_KEY: &str = "pin_vault";
const FAIL_KEY: &str = "pin_fail";
const MAX_FAILS: u32 = 10;

/// In-memory cache of the Argon2-derived key for the current unlocked session.
#[derive(Default)]
struct PinState(Mutex<Option<[u8; 32]>>);

#[derive(Serialize, Deserialize)]
struct Vault {
    v: u8,
    salt: String,
    nonce: String,
    ct: String,
}

fn valid_pin(pin: &str) -> bool {
    pin.len() == 6 && pin.bytes().all(|b| b.is_ascii_digit())
}

fn derive_key(pin: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(pin.as_bytes(), salt, &mut key)
        .map_err(|e| e.to_string())?;
    Ok(key)
}

/// AES-256-GCM seal → (nonce, ciphertext+tag), both raw bytes.
fn seal(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce);
    let ct = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext)
        .map_err(|e| e.to_string())?;
    Ok((nonce.to_vec(), ct))
}

fn read_vault() -> Result<Option<Vault>, String> {
    match entry(VAULT_KEY)?.get_password() {
        Ok(s) => serde_json::from_str(&s).map(Some).map_err(|e| e.to_string()),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn write_vault(key: &[u8; 32], salt_b64: String, refresh_token: &str) -> Result<(), String> {
    let (nonce, ct) = seal(key, refresh_token.as_bytes())?;
    let vault = Vault {
        v: 1,
        salt: salt_b64,
        nonce: STANDARD.encode(nonce),
        ct: STANDARD.encode(ct),
    };
    let s = serde_json::to_string(&vault).map_err(|e| e.to_string())?;
    entry(VAULT_KEY)?.set_password(&s).map_err(|e| e.to_string())
}

fn get_fails() -> u32 {
    entry(FAIL_KEY)
        .ok()
        .and_then(|e| e.get_password().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

fn set_fails(n: u32) {
    if let Ok(e) = entry(FAIL_KEY) {
        let _ = e.set_password(&n.to_string());
    }
}

fn clear_fails() {
    if let Ok(e) = entry(FAIL_KEY) {
        let _ = e.delete_credential();
    }
}

/// True once the device has been enrolled (a PIN vault exists).
#[tauri::command]
fn pin_status() -> Result<bool, String> {
    Ok(read_vault()?.is_some())
}

/// First-time enrolment: seal the freshly obtained refresh token under `pin`.
#[tauri::command]
fn pin_enroll(pin: String, refresh_token: String, state: tauri::State<PinState>) -> Result<(), String> {
    if !valid_pin(&pin) {
        return Err("pin_must_be_6_digits".into());
    }
    let mut salt = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let key = derive_key(&pin, &salt)?;
    write_vault(&key, STANDARD.encode(salt), &refresh_token)?;
    clear_fails();
    *state.0.lock().unwrap() = Some(key);
    Ok(())
}

/// Unlock with `pin`; on success returns the stored refresh token and caches the key.
/// On failure increments the counter; wipes the vault after MAX_FAILS.
#[tauri::command]
fn pin_unlock(pin: String, state: tauri::State<PinState>) -> Result<String, String> {
    let vault = read_vault()?.ok_or("not_enrolled")?;
    let salt = STANDARD.decode(&vault.salt).map_err(|e| e.to_string())?;
    let nonce = STANDARD.decode(&vault.nonce).map_err(|e| e.to_string())?;
    let ct = STANDARD.decode(&vault.ct).map_err(|e| e.to_string())?;
    let key = derive_key(&pin, &salt)?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    match cipher.decrypt(Nonce::from_slice(&nonce), ct.as_ref()) {
        Ok(pt) => {
            clear_fails();
            *state.0.lock().unwrap() = Some(key);
            String::from_utf8(pt).map_err(|e| e.to_string())
        }
        Err(_) => {
            let fails = get_fails() + 1;
            if fails >= MAX_FAILS {
                let _ = entry(VAULT_KEY).and_then(|e| e.delete_credential().map_err(|x| x.to_string()));
                clear_fails();
                Err("wiped".into())
            } else {
                set_fails(fails);
                Err(format!("wrong_pin:{}", MAX_FAILS - fails))
            }
        }
    }
}

/// Re-seal a rotated refresh token using the cached session key (no PIN prompt).
#[tauri::command]
fn session_reseal(refresh_token: String, state: tauri::State<PinState>) -> Result<(), String> {
    let key = (*state.0.lock().unwrap()).ok_or("locked")?;
    let vault = read_vault()?.ok_or("not_enrolled")?;
    write_vault(&key, vault.salt, &refresh_token)
}

/// Drop the cached key — the next launch/use requires the PIN again (idle lock).
#[tauri::command]
fn pin_lock(state: tauri::State<PinState>) {
    *state.0.lock().unwrap() = None;
}

/// Forget this device entirely: clear the vault and require full re-enrolment.
#[tauri::command]
fn pin_reset(state: tauri::State<PinState>) -> Result<(), String> {
    *state.0.lock().unwrap() = None;
    clear_fails();
    match entry(VAULT_KEY)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(PinState::default())
        .setup(|app| {
            let db = offline::init(app.handle())?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            secure_set,
            secure_get,
            secure_clear,
            device_id,
            pin_status,
            pin_enroll,
            pin_unlock,
            session_reseal,
            pin_lock,
            pin_reset,
            offline::cache_put,
            offline::cache_query,
            offline::outbox_enqueue,
            offline::outbox_pending,
            offline::outbox_mark,
            printing::list_printers,
            printing::print_receipt,
            printing::print_label,
            printing::print_test
        ])
        .run(tauri::generate_context!())
        .expect("error while running the ExtraMile back-office");
}
