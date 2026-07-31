# ExtraMile Electronics

Self-service electronics storefront for Accra, Ghana, plus a native back-office console for the retail counter.

- **`apps/web`** — Next.js 15 storefront + a trimmed read-only ops dashboard (`/admin`).
- **`apps/desktop`** — Tauri v2 (Windows) back-office console: catalogue, inventory, fulfilment, printing, offline.
- **`packages/core`** — DB types, Zod schemas, money/pricing helpers, order state machine, query builders. No `next/*`, no Node-only APIs — runs in the webview too.
- **`packages/ui`** — shared shadcn components + design tokens.
- **`supabase`** — migrations, seed, Edge Functions.
- **`deploy`** — hosting configs for the web app: [`deploy/vercel`](./deploy/vercel) and [`deploy/netlify`](./deploy/netlify) (see [`deploy/README.md`](./deploy/README.md)).

## Non-negotiable rules

1. Money is `bigint` **pesewas** (100 = GHS 1). Never floats, never client-supplied prices.
2. RLS on every table. `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` are server-only — never `NEXT_PUBLIC_`, never imported into a Client Component or the desktop binary.
3. Authorization uses `supabase.auth.getUser()` on the server, never `getSession()`.
4. Order totals and stock checks happen in Postgres RPCs, not TypeScript.
5. Paystack webhooks: verify HMAC SHA512 over the **raw** body, then independently call `/transaction/verify/:reference` before fulfilling. Idempotent on event id.
6. Every DB change is a file in `supabase/migrations/`. No dashboard edits.
7. TypeScript strict, no `any`, Zod-validate every route input.

See [`docs/`](./docs) for the full PRD, data model, SDLC, test plan, OAuth spec, build prompts, and desktop spec.

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase + Paystack + Resend keys
pnpm dev                                        # web on http://localhost:3000
```

### Requirements

- Node ≥ 20 (see `.nvmrc`)
- pnpm 9 (`corepack use pnpm@9` or `npm i -g pnpm`)
- Docker + Supabase CLI for the local database (`supabase start`)
- Rust toolchain (for `apps/desktop`, added in phase D1)

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run the web app |
| `pnpm build` | Build all workspace packages |
| `pnpm test` | Run unit/integration tests across packages |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | ESLint (max-warnings 0) |
| `pnpm format` | Prettier write |
