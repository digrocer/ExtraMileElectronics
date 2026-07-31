import { invoke } from '@tauri-apps/api/core';

/** True inside the Tauri webview; false in a plain browser (vite dev/preview). */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Secrets live in the OS keychain via the Rust `keyring` commands — never localStorage.
export async function secureSet(key: string, value: string): Promise<void> {
  if (!isTauri) return;
  await invoke('secure_set', { key, value });
}
export async function secureGet(key: string): Promise<string | null> {
  if (!isTauri) return null;
  return invoke<string | null>('secure_get', { key });
}
export async function secureClear(key: string): Promise<void> {
  if (!isTauri) return;
  await invoke('secure_clear', { key });
}

export async function deviceId(): Promise<string> {
  if (!isTauri) return 'dev-device';
  return invoke<string>('device_id');
}

// ── PIN vault (docs/07 §5) — the desktop's only login. ───────────────────────
// In a plain browser (vite dev) the vault is unavailable, so these degrade to a
// no-op "dev" session that lets the UI render without Tauri.
export async function pinStatus(): Promise<boolean> {
  if (!isTauri) return false;
  return invoke<boolean>('pin_status');
}

/** Seal the freshly obtained refresh token under a new 6-digit PIN (enrolment). */
export async function pinEnroll(pin: string, refreshToken: string): Promise<void> {
  if (!isTauri) return;
  await invoke('pin_enroll', { pin, refreshToken });
}

/** Unlock with the PIN; returns the stored refresh token. Throws on wrong PIN. */
export async function pinUnlock(pin: string): Promise<string> {
  if (!isTauri) throw new Error('pin_unavailable');
  return invoke<string>('pin_unlock', { pin });
}

/** Persist a rotated refresh token using the cached session key (no PIN prompt). */
export async function sessionReseal(refreshToken: string): Promise<void> {
  if (!isTauri) return;
  await invoke('session_reseal', { refreshToken });
}

/** Drop the cached key so the next use requires the PIN (idle lock). */
export async function pinLock(): Promise<void> {
  if (!isTauri) return;
  await invoke('pin_lock');
}

/** Forget this device: clear the vault and require full re-enrolment. */
export async function pinReset(): Promise<void> {
  if (!isTauri) return;
  await invoke('pin_reset');
}
