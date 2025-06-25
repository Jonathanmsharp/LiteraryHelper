# Deploying the LiteraryHelper Monorepo to Vercel

This guide explains **exactly** how to configure the project in the Vercel UI so that the **frontend app** (`apps/frontend`) is built and deployed while the rest of the monorepo (types package, scripts, infra, etc.) remains in the repository.

---

## 1 · Prerequisites

| Item | Minimum Version | Notes |
|------|-----------------|-------|
| Node | 18 LTS          | Vercel automatically selects the latest 18-x runtime |
| pnpm | 8 or newer      | Vercel detects `pnpm-lock.yaml` and pre-installs pnpm |
| GitHub repo access | — | Vercel must be authorised to read the private repo |

---

## 2 · Create or Import the Project

1. Log in to <https://vercel.com>.
2. Click **“Add New → Project”**.
3. Pick the **`Jonathanmsharp/LiteraryHelper`** repository.
4. On the **“Configure Project”** screen fill in the following fields:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (detected automatically) |
| **Root Directory**  | `apps/frontend` |
| **Build Command**   | `pnpm run build` *(fallback `next build`)* |
| **Install Command** | `pnpm install --no-frozen-lockfile` |
| **Output Directory**| `.next` (pre-filled by the Next.js preset) |

> **Why `pnpm install --no-frozen-lockfile`?**  
> The lockfile occasionally becomes out-of-sync on the Vercel build container when only `package.json` is updated. Disabling the frozen check prevents **ERR_PNPM_OUTDATED_LOCKFILE** failures.

---

## 3 · Environment Variables

Add the variables already used in local development.  
Create **two** environments – *Preview* and *Production* – so secrets are not exposed to PRs.

| Name | Scope | Description |
|------|-------|-------------|
| `OPENAI_API_KEY` | Preview + Production | AI rule processing |
| `POSTGRES_URL`   | Preview + Production | External (or Supabase) Postgres |
| `REDIS_URL`      | Preview + Production | Optional – BullMQ / cache |
| `JWT_PUBLIC_KEY` | Preview + Production | Auth validation |
| *(…others as required)* | | |

*Preview-only overrides*  
If you do **not** want to pay for AI calls on every PR, set:

```
LLM_PROVIDER=dummy
ENABLE_DEMO_MODE=true
```

---

## 4 · Build & Deployment Flow

```
┌────────────────────┐    git push
│   GitHub Action    │ ───────────────▶  triggers
└────────────────────┘                 ▶  Vercel build

Vercel build steps
1. pnpm install  (workspace root, hoisted node_modules)
2. pnpm run build  (inside apps/frontend)
   • next build
   • .next output captured
3. Lambdas / Edge / Static assets generated
4. Aliases created:
   • preview:  https://literary-helper-git-<branch>.vercel.app
   • prod:     https://literary-helper.vercel.app
```

No additional `vercel.json` settings are required.  
If you add one later, keep it minimal to avoid schema errors:

```json
{
  "version": 2,
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## 5 · Caching Tips

| What | How |
|------|-----|
| **pnpm packages** | Vercel automatically caches `node_modules` between builds. |
| **Turborepo**     | Turborepo remote cache is disabled in production; no extra config needed. |
| **Drizzle migrations** | Run during a separate CI step – *not* in `next build`. |

---

## 6 · Optional CLI Workflow

```bash
vercel link                    # inside repo root (once)
vercel --prod                  # deploy main branch
vercel --prebuilt              # reuse local build (turbo build)
```

The CLI respects the same **Root Directory** you set in the UI.

---

## 7 · Troubleshooting

| Symptom | Most common cause | Fix |
|---------|------------------|-----|
| `ERR_PNPM_OUTDATED_LOCKFILE` | Frozen lockfile on CI | Use `--no-frozen-lockfile` |
| Schema error: “additional property rootDirectory” | Invalid key in `vercel.json` | Remove or replace with `workingDirectory` (v1) |
| `tsc: command not found` | Compiling packages during build | Build shared packages **before** pushing, or run `pnpm turbo build` locally |
| 502 after build | Environment vars missing in Production | Check “Settings → Environment Variables” |

---

## 8 · Next Steps

1. Merge the **`droid/fix-vercel-deployment`** PR once the preview deploy is green.  
2. Set up **Health Checks** in Vercel (**Settings → Health Check**) hitting `/api/health` (to be implemented).  
3. Enable **Speed Insights** for performance metrics.  

Your monorepo is now fully configured for hassle-free Vercel deployments 🚀
