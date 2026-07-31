# Deployment configs

Deployment configuration for the **web storefront** (`apps/web`, a Next.js 15 app),
kept out of the app folders so hosting concerns are organised in one place.

The desktop app (`apps/desktop`, Tauri) is **not** web-hosted — it ships as a signed
Windows installer via GitHub Releases (see `.github/workflows/desktop-release.yml`),
so it has no folder here.

```
deploy/
├── vercel/    → vercel.json, .vercelignore   (Vercel deploy of apps/web)
└── netlify/   → netlify.toml                  (Netlify deploy of apps/web)
```

Both targets build the **same** app. Use one as primary and the other as a
mirror/failover, or pick whichever host you prefer — they are interchangeable.

## Important: config discovery

Vercel and Netlify each look for their config at a **fixed location** (the project's
root/base directory), not in an arbitrary subfolder. These files are the
version-controlled source of truth; activate them with **one** of the options below.

## Vercel (recommended for Next.js — native support)

Preferred — no root file needed:

1. Import the repo in Vercel.
2. Set **Root Directory** = `apps/web`. Vercel auto-detects Next.js + pnpm and builds
   the workspace. This alone deploys correctly.

To manage the settings as code instead, copy the config to where Vercel reads it
(the Root Directory):

```bash
cp deploy/vercel/vercel.json apps/web/vercel.json
```

Set these environment variables in the Vercel project (Production + Preview):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and any server-only keys
the app needs (never the `service_role` key in a public build).

## Netlify

Netlify reads `netlify.toml` from the repo root. Point it at this file with **one** of:

- **Symlink (keeps a single source of truth):**
  ```bash
  ln -s deploy/netlify/netlify.toml netlify.toml
  ```
- **Copy:**
  ```bash
  cp deploy/netlify/netlify.toml netlify.toml
  ```

Then in the Netlify UI leave the **base directory** empty (the config already builds
from the repo root via `pnpm --filter`) and set the same Supabase env vars as above.

The `@netlify/plugin-nextjs` plugin is declared in the config; Netlify installs it
automatically on first build.
