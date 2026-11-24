# Desktop Admin App (Tauri v2, Windows)

**Purpose:** the shop's back-office console — catalogue, inventory, order fulfilment, payments, reports — running natively on the counter PC with a barcode scanner and a receipt printer attached.

**Stack:** Tauri v2 (Rust core) · Vite + React 19 + TS strict · Tailwind + shadcn (same tokens as web) · TanStack Query + Router · `@supabase/supabase-js` · SQLite (`tauri-plugin-sql`) for offline cache/outbox.

---

## 1. Why desktop at all (scope justification)

Three things the browser can't do well at a retail counter, and they are the reason this exists:
1. **ESC/POS thermal receipt + barcode label printing** without a print dialog per order.
2. **IMEI/serial capture** at packing speed, incl. serial-port scanners.
3. **Works when the internet drops** — queue actions locally, replay on reconnect.

Everything else it does, it does because the staff are already in this window all day.

## 2. Division of surfaces (decision — flag if wrong)

| Surface | Role |
|---|---|
| **Desktop app (this doc)** | Primary staff console. Full CRUD, fulfilment, printing, CSV, reports. |
| **Web `/admin`** | Trimmed to a **read-only ops dashboard** + order status transitions, for phone/off-site use. PRD §4.9 / SDLC Phase 6 shrinks accordingly. |
| **Edge Functions** | The only place privileged work happens: refunds, Paystack calls, role changes. |

Rationale: building the same admin twice is the expensive mistake here. Shared logic lives in `packages/core` and both surfaces import it.

## 3. Monorepo layout

```
pnpm-workspace.yaml
apps/
  web/                  # Next.js storefront + read-only ops dashboard
  desktop/              # Tauri app
    src/                # React UI
    src-tauri/          # Rust: commands, plugins, printing, keychain, outbox
packages/
  core/                 # DB types, Zod schemas, pricing, query builders, order state machine
  ui/                   # shadcn components + design tokens
```
`packages/core` must not import `next/*` or any Node-only API — it runs in the webview too.

## 4. Feature set (v1)

**Catalogue** — product/variant CRUD, drag-sort images (upload to `product-images` bucket), spec editor driven by `category.spec_schema`, publish toggle, bulk price/stock edit, duplicate-product action.
**Inventory** — receive stock (with supplier + cost), adjust with mandatory reason, low-stock view (< 3), full `inventory_movements` history, print SKU barcode labels.
**Orders** — keyboard-first queue (`j/k` navigate, `Enter` open, `p` pack, `d` dispatch), detail view, **scan-to-capture IMEI/serial per unit**, print packing slip + receipt + warranty card, cancel with reason.
**Walk-in sales** — create an in-store order, mark paid by cash or manual MoMo, print receipt, decrement stock. Requires migration 008 below.
**Payments** — payments vs orders reconciliation, mismatch flags, `oversold` queue, refund (via Edge Function), deep link to the Paystack dashboard.
**Coupons, shipping zones, customers** — CRUD / lookup with order history.
**Staff** — invite, role change, deactivate (all via Edge Function; never a direct `profiles.role` write).
**Reports** — daily/weekly sales, top SKUs, margin if cost captured, stock valuation; CSV + PDF export to local disk.
**Audit log** — filterable, shows `source` (web/desktop) and device.
**Settings** — printer selection, receipt header/footer, tax lines, offline behaviour, update channel.

Not in v1: multi-store/branch, purchase orders to suppliers, cash-drawer/shift reconciliation, employee time tracking.

## 5. Security model (non-negotiable)

| Rule | Implementation |
|---|---|
| No privileged secrets in the binary | Only `SUPABASE_URL` + `anon` key are compiled in. `service_role` and `PAYSTACK_SECRET_KEY` never leave the server. CI greps the built MSI/NSIS payload for both patterns and fails the build. |
| Authorization | Staff user session + existing RLS (`is_staff()`). The desktop app has **no** extra database power over the web admin. |
| Privileged actions | Edge Function `admin-actions` — verifies the caller's JWT, re-checks `role` server-side, then acts with `service_role`. Covers: refund, role change, staff invite, coupon over a value threshold, stock adjust > 10 units. |
| Token storage | Access token in memory only. Refresh token sealed with **AES-256-GCM** under a key derived from the 6-digit PIN (Argon2id) and stored in **Windows Credential Manager** via the Rust `keyring` crate — never `localStorage`, never a plaintext file. |
| Login | No OAuth in the desktop. The device is bound once to a real admin account (enrolment, §8), then a local **6-digit PIN** unlocks the sealed session on every launch. 10 wrong PINs wipe the vault → re-enrolment. |
| Session lifetime | Idle lock after 15 min drops the live session; PIN re-entry restores it (shared counter PC). |
| Tauri ACL (v2) | Capabilities scoped per window; only the plugins listed in §6 permitted. `withGlobalTauri: false`. Devtools disabled in release. |
| CSP | `default-src 'self'; connect-src 'self' https://<ref>.supabase.co https://api.paystack.co; img-src 'self' data: https://<ref>.supabase.co; script-src 'self'` |
| Code signing | Authenticode (Azure Trusted Signing or EV cert) — unsigned installers trip SmartScreen and staff will click through warnings, which is worse. |
| Updater | Tauri updater with a minisign keypair; private key in CI secrets only. Unsigned manifest ⇒ update rejected. |
| Audit | Every mutation writes `audit_log` with `source='desktop'`, `device_id`, actor. |
| Device registration | First launch registers a `staff_devices` row; admin can revoke a device, which forces sign-out on next refresh. |

## 6. Rust command surface (`src-tauri`)

Plugins: `sql` (SQLite), `fs` (scoped to a chosen export dir), `dialog`, `os`, `process`, `single-instance`, `updater`, `notification`, `serialport` (optional scanners). No `opener`/`deep-link` — the desktop has no OAuth (§8).

```rust
// secrets
secure_set(key: String, value: String) -> Result<()>          // keyring
secure_get(key: String) -> Result<Option<String>>
secure_clear(key: String) -> Result<()>
device_id() -> String                                          // stable machine hash

// PIN vault (§8) — the desktop's only login
pin_status() -> Result<bool>                                   // is this device enrolled?
pin_enroll(pin: String, refresh_token: String) -> Result<()>  // seal the token under a new PIN
pin_unlock(pin: String) -> Result<String>                      // returns the sealed refresh token
session_reseal(refresh_token: String) -> Result<()>            // persist a rotated token (cached key)
pin_lock() -> ()                                               // drop the cached key (idle lock)
pin_reset() -> Result<()>                                      // forget device → re-enrolment

// printing (escpos)
list_printers() -> Vec<PrinterInfo>
print_receipt(payload: ReceiptDto, printer: String) -> Result<PrintJobId>
print_packing_slip(payload: SlipDto, printer: String) -> Result<PrintJobId>
print_label(sku: String, name: String, price_pesewas: i64, copies: u8) -> Result<PrintJobId>  // Code128
print_test(printer: String) -> Result<()>

// files
pick_csv() -> Option<PathBuf>
read_csv(path: PathBuf) -> Result<Vec<HashMap<String,String>>>   // streamed, 50k row cap
write_export(name: String, bytes: Vec<u8>) -> Result<PathBuf>

// offline outbox
outbox_enqueue(kind: String, payload: Value, idempotency_key: Uuid) -> Result<i64>
outbox_flush() -> Result<FlushReport>                            // called on reconnect + every 30s
outbox_pending() -> Vec<OutboxItem>
cache_put(table: String, rows: Vec<Value>) -> Result<()>          // products, variants, open orders
cache_query(sql: String, args: Vec<Value>) -> Result<Vec<Value>>  // read-only, parameterised

// misc
check_update() -> Option<UpdateInfo>
```

Rules: every command returns `Result` with a typed error enum surfaced as a toast — no `unwrap()` in a command body. Commands touching the filesystem validate the path is inside the configured export directory.

## 7. Offline behaviour

- **Reads:** SQLite cache of active products/variants, open orders, shipping zones, coupons. Refreshed on focus + every 60s. UI shows an "offline — data as of HH:MM" bar.
- **Writes:** allowed only for a safe subset — order status transitions, serial capture, stock adjustments, walk-in cash sales. Everything else is disabled offline.
- **Replay:** each queued action carries an `idempotency_key`; the server dedupes on it (`outbox_receipts` table, unique key). Replay is ordered per order id.
- **Conflict:** optimistic concurrency on `orders.updated_at`; a rejected transition surfaces a diff dialog ("this order was already dispatched by <user> at <time>") — never silently overwritten.
- **Walk-in sale offline:** creates a local provisional order with a `local-` prefixed number; on sync, the server issues the real order number and the receipt is reprinted if the number changed.

## 8. Authentication flow (desktop)

No OAuth and no daily password. The device is bound once, then a 6-digit PIN is the only credential.

**Enrolment (first run, one-time):**

1. Admin signs in once with an admin email + password to obtain a Supabase session (the only time a password is entered on the desktop).
2. `is_staff()` is checked server-side; a non-staff account is rejected with "this account has no back-office access" and nothing is stored.
3. Admin chooses a 6-digit PIN. `pin_enroll` derives an AES-256-GCM key from the PIN (Argon2id + random salt) and seals the refresh token into Credential Manager. The derived key is cached in memory for the session.

**Daily unlock:**

1. Admin enters the PIN → `pin_unlock` decrypts and returns the sealed refresh token (GCM tag authenticates the PIN — a wrong PIN fails to decrypt).
2. Webview calls `refreshSession({ refresh_token })` → live session with a full admin JWT. `is_staff()` is re-checked.
3. Supabase rotates the refresh token on every refresh; `session_reseal` re-writes the vault with the cached key (no PIN prompt).
4. 10 consecutive wrong PINs wipe the vault; the device must be re-enrolled.

The restored session carries the same JWT the web admin uses, so the desktop's authority is identical — every capability is still gated by RLS `is_staff()` and the `admin-actions` Edge Function. The PIN is a **local** unlock, not a new server credential.

There are no OAuth redirect URLs to register for the desktop.

## 9. Migration 008 (delta to `02-DATA-MODEL.md`)

```sql
alter type pay_provider add value 'manual';           -- cash / offline MoMo, walk-in sales
create type order_channel as enum ('online','walk_in');
alter table orders add column channel order_channel not null default 'online';

alter table audit_log
  add column source text not null default 'web',      -- 'web' | 'desktop' | 'system'
  add column device_id text;

create table staff_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  user_id uuid not null references profiles(id) on delete cascade,
  label text, os text, app_version text,
  is_revoked boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table staff_devices enable row level security;
create policy staff_dev_read on staff_devices for select using (is_staff());
-- inserts/updates via admin-actions Edge Function only

create table outbox_receipts (
  idempotency_key uuid primary key,
  device_id text not null,
  kind text not null,
  result jsonb,
  created_at timestamptz not null default now()
);
alter table outbox_receipts enable row level security;   -- no policies: service_role only

-- inventory receiving needs cost for stock valuation reports
alter table inventory_movements add column unit_cost bigint, add column supplier text;
```

## 10. Packaging & release

- Bundles: **MSI (WiX)** for managed installs, **NSIS** for one-click. Identifier `com.<store>.admin`. Per-machine install, `RequireAdmin` only for the MSI.
- Version = git tag; `tauri.conf.json` version bumped by CI.
- Updater manifest (`latest.json`) published to a public Supabase Storage bundle or Vercel static path; signed with minisign.
- Release job: `pnpm --filter desktop build` → `tauri build` → Authenticode sign → sign manifest → upload artifacts → GitHub Release.
- Rollback: keep the previous two installers published; updater can be pointed at a pinned version.

## 11. Tests (extends `04-TEST-PLAN.md`)

| ID | Case | Expected |
|---|---|---|
D-01 (P0) | `grep` built installer + all bundled JS for `service_role`, `sk_live`, `sk_test` | zero matches; CI fails otherwise |
D-02 (P0) | Signed-in as `customer`, open desktop app | access denied, signed out, no data loaded |
D-03 (P0) | Staff attempts a refund with the app's own client (not the Edge Function) | RLS denies; only `admin-actions` succeeds |
D-04 (P0) | Outbox replay of the same action ×3 | `outbox_receipts` dedupes; stock moves once |
D-05 (P0) | Offline dispatch, then reconnect | order transitions once, one email sent |
D-06 | Concurrent transition: web marks dispatched, desktop still shows packed | desktop write rejected, diff dialog shown |
D-07 | Refresh token read from disk in plaintext | not present anywhere on disk (scan `%APPDATA%`) |
D-08 | Tampered updater manifest / wrong signing key | update rejected, app continues on current version |
D-09 | Printer offline / out of paper | typed error toast, order state unchanged, reprint available |
D-10 | ESC/POS receipt output | GHS totals, order number, Paystack ref, warranty terms, correct 80mm width |
D-11 | Code128 label scans back to the same SKU | round-trip via handheld scanner |
D-12 | HID scanner input into the serial field | captured without keystroke loss at scanner speed; 15-digit IMEI validated (Luhn) |
D-13 | CSV import of 5k rows | parity with the web importer, same validation errors, memory stable |
D-14 | Idle 15 min | app locks, requires PIN re-entry, no data visible in a screenshot |
D-14b | 10 consecutive wrong PINs | vault wiped, device returns to enrolment, no session recoverable |
D-15 | Device revoked by admin | next token refresh signs the device out |
D-16 | Walk-in offline sale then sync | real order number issued, stock correct, receipt reprint prompted |
D-17 | Clock skew ±10 min on the counter PC | JWT still validates; timestamps recorded server-side |
D-18 | Fresh install on clean Windows 11 | no SmartScreen block (signed), first-run enrolment + PIN works, printer discovery works |

## 12. Build prompts (append to `06-BUILD-PROMPTS.md`)

### D0 — Monorepo split
```
Convert the repo to a pnpm workspace: apps/web (existing Next.js app), packages/core,
packages/ui, and an empty apps/desktop.

Move into packages/core: database types, all Zod schemas, pricing/money helpers, the order
state machine, and query builders that take a SupabaseClient as an argument. It must not
import next/* or any Node-only API. Move shadcn components + design tokens into packages/ui.
Update apps/web imports and keep CI green.

Done when: pnpm build, pnpm test, tsc --noEmit pass, and apps/web behaves identically.
```

### D1 — Tauri scaffold + auth
```
Scaffold apps/desktop with Tauri v2 + Vite + React 19 + TS strict + TanStack Query/Router,
consuming packages/core and packages/ui.

Implement per docs/07-DESKTOP-ADMIN.md §5, §6 (secrets + PIN-vault commands), §8:
- Rust commands secure_set/secure_get/secure_clear using the keyring crate, and device_id.
- PIN vault: pin_status/pin_enroll/pin_unlock/session_reseal/pin_lock/pin_reset. The refresh
  token is sealed with AES-256-GCM under an Argon2id key derived from a 6-digit PIN, stored in
  Credential Manager; access token in memory only. 10 wrong PINs wipe the vault.
- Enrolment binds a real admin account once (email+password), then PIN-only thereafter. No OAuth.
- is_staff() gate at enrolment and unlock; non-staff is rejected with a clear message.
- Idle lock after 15 minutes drops the live session; PIN restores it.
- Tauri v2 capabilities file permitting only the plugins listed in §6; CSP from §5;
  withGlobalTauri false; devtools disabled in release.
- Compile in only SUPABASE_URL and the anon key. Add a CI step that greps the build output
  for service_role / sk_live / sk_test and fails on any match (test D-01).

Done when: D-01, D-02, D-07, D-14 pass and a staff account reaches an empty dashboard shell.
```

### D2 — Schema delta + privileged Edge Function
```
Add migration 008 exactly as in docs/07-DESKTOP-ADMIN.md §9, regenerate database types in
packages/core, and update the RLS test suite for staff_devices and outbox_receipts.

Create Supabase Edge Function `admin-actions`: verifies the caller JWT, re-reads the caller's
role from profiles server-side, then handles refund, staff_invite, role_change, device_revoke,
stock_adjust_large, coupon_create_high_value. Every branch is Zod-validated, idempotency-keyed,
and writes audit_log with source and device_id. Reject non-staff with 403 and log the attempt.

Done when: D-03 passes and no desktop code path writes profiles.role or calls Paystack directly.
```

### D3 — Offline layer
```
Implement docs/07-DESKTOP-ADMIN.md §7:
- SQLite via tauri-plugin-sql: cache tables for products, variants, open orders, zones, coupons,
  plus an outbox table (id, kind, payload, idempotency_key, attempts, created_at, error).
- Rust commands outbox_enqueue / outbox_flush / outbox_pending / cache_put / cache_query
  (cache_query is read-only and parameterised — reject any statement that is not SELECT).
- Connectivity detector; offline banner with last-sync time; write allowlist enforced in the UI
  AND in outbox_enqueue.
- Ordered replay per order id with exponential backoff; server dedupes on outbox_receipts.
- Optimistic concurrency on orders.updated_at with a conflict diff dialog.

Done when: D-04, D-05, D-06 pass, including a test that kills the network mid-flush.
```

### D4 — Hardware: printing & scanning
```
Implement docs/07-DESKTOP-ADMIN.md §6 printing commands using the escpos + barcoders crates:
list_printers, print_receipt (80mm and 58mm layouts), print_packing_slip, print_label (Code128),
print_test. Printer choice and receipt header/footer/tax lines live in Settings.

Scanning: treat HID keyboard-emulating scanners as plain input into a focused, debounced field
with IMEI Luhn validation; add an optional serial-port path behind tauri-plugin-serialport for
non-HID devices. Serial capture UI must accept one scan per unit and show progress (3 of 5).

Handle printer errors as typed Rust errors surfaced as toasts; a failed print must never change
order state, and reprint must always be available from order detail.

Done when: D-09, D-10, D-11, D-12 pass on the actual counter printer and scanner.
```

### D5 — Management screens
```
Build the desktop UI for docs/07-DESKTOP-ADMIN.md §4, reusing packages/core queries:
catalogue CRUD + image upload + spec editor, inventory receive/adjust/history + label printing,
keyboard-first order queue with fulfilment and serial capture, walk-in sale, payments and
reconciliation, refunds via admin-actions, coupons, shipping zones, customers, staff and device
management, reports with CSV/PDF export via write_export, audit log viewer, settings.

Every mutation goes through a shared mutation wrapper that: validates with Zod, routes through
the outbox when offline, attaches an idempotency key, and invalidates the right TanStack query.

Then trim apps/web /admin to a read-only ops dashboard plus order status transitions
(docs/07 §2) and delete the duplicated web CRUD screens.

Done when: D-13, D-16 pass, the UAT script in docs/04-TEST-PLAN.md §8 can be completed entirely
from the desktop app, and the web admin no longer contains write paths beyond status changes.
```

### D6 — Release pipeline
```
Implement docs/07-DESKTOP-ADMIN.md §10: MSI + NSIS bundles, version from git tag, Authenticode
signing (Azure Trusted Signing), minisign-signed updater manifest published to a public bucket,
GitHub Release upload, and a documented rollback to the previous pinned version.
Add docs/RUNBOOK.md entries: bad release rollback, revoke a device, printer down, extended outage
with a full outbox.

Done when: D-08, D-15, D-18 pass on a clean Windows 11 VM.
```

## 13. Open decisions
1. Walk-in sales in v1 or v1.1 — it pulls a POS surface into scope (receipt printing already covers most of it).
2. Cost capture on receiving — needed for margin reports; adds a field staff must fill on every intake.
3. Windows signing route: Azure Trusted Signing (cheap, monthly, no HSM) vs EV cert (higher upfront).
4. Does off-site staff need write access from the phone? If yes, the web ops dashboard grows and §2 changes.
