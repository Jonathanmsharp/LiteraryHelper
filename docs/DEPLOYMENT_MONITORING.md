# Deployment Monitoring Guide

> File: `docs/DEPLOYMENT_MONITORING.md`  
> Last updated: <!-- keep auto-updated by maintainers -->

This document explains how to monitor **LiteraryHelper** deployments on Vercel from the command line or CI using the helper scripts shipped in the `scripts/` directory.

---

## 1 . Why monitor deployments?

* Catch build errors quickly after every push  
* Surface framework mis-configuration (wrong build command, missing env vars)  
* Export full build logs for offline analysis or ticket attachments  
* Automate smoke-tests that wait until a deployment reaches **READY**

---

## 2 . Prerequisites

| Requirement | Recommended Version | Notes |
|-------------|--------------------|-------|
| Node.js     | ≥ 18               | Needed to run the `check-deployment.js` script |
| pnpm        | ≥ 8                | Workspaces manager (`corepack enable` to install) |
| Bash / zsh  | any                | For the wrapper `check-deploy.sh` |
| Vercel token| *personal* or *team* scope | Generate at <https://vercel.com/account/tokens> |
| (Optional) Team ID | e.g. `team_abc123` | Found in **Settings → General** |

---

## 3 . Installing dependencies

From the **workspace root** run:

```bash
pnpm i -w axios chalk dotenv commander   # already bundled once, safe to re-run
pnpm -r build                             # compile workspaces (types)
```

> The `-w` flag installs packages at the workspace root so every package can import them.

---

## 4 . Environment variables

Create or update `.env.local` (not committed) in the repo root **or** export in your shell/CI:

```
# required
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# optional – only when monitoring a team project
VERCEL_TEAM_ID=team_abc123
```

⚠️  **Never** commit your token. It grants full API access to all projects in its scope.

---

## 5 . Script overview

| Script | Purpose | Typical use |
|--------|---------|-------------|
| `scripts/check-deployment.js` | Low-level, full-featured Node.js script. | CI pipelines or local debugging |
| `scripts/check-deploy.sh`    | Thin Bash wrapper with colourised UX.   | Quick one-off checks in terminal |

Both scripts call the Vercel REST API:

* `GET /v6/deployments` – list recent deployments  
* `GET /v13/deployments/:id` – deployment status (`readyState`, error codes)  
* `GET /v2/deployments/:id/events` – live build logs  

---

## 6 . Basic usage

### 6.1 Quick check (default project)

```bash
export VERCEL_TOKEN=…         # once per shell
scripts/check-deploy.sh
```

The wrapper will:

1. Detect the most recent deployment for `LiteraryHelper`.
2. Poll every 10 s (exponential back-off) until it is **READY / ERROR**.
3. Stream new log events; errors are always shown, other output only with `--verbose`.
4. Exit 0 on success, exit 1 on failure/timeout – perfect for CI `exit` gating.

### 6.2 Custom project / team

```bash
scripts/check-deploy.sh --project another-project --team team_abc123
```

### 6.3 Verbose logs & saving to file

```bash
scripts/check-deploy.sh -v --save-logs --logs-dir ./deployment-logs
```

Log files are named:

```
deployment-<deploymentId>-<timestamp>.log
```

---

## 7 . Advanced CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `--project <name|id>` | `LiteraryHelper` | Vercel project slug or ID |
| `--team <teamId>` | `$VERCEL_TEAM_ID` | Team scope for API requests |
| `--limit <n>` | `5` | How many recent deployments to scan |
| `--wait <sec>` | `10` | Initial poll interval; grows up to 60 s |
| `--timeout <min>` | `15` | Abort monitoring after X minutes |
| `--verbose` | off | Print every log line, not just errors |
| `--save-logs` | off | Write full logs to disk |
| `--logs-dir <dir>` | `./deployment-logs` | Destination for saved logs |

---

## 8 . CI integration example (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy & Monitor

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - name: Push code (handled by Vercel Git integration)
        run: echo "No-op – push already triggered deploy"

  monitor:
    needs: deploy
    runs-on: ubuntu-latest
    env:
      VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      VERCEL_TEAM_ID: ${{ secrets.VERCEL_TEAM_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: scripts/check-deploy.sh --project LiteraryHelper --verbose --timeout 20
```

The job fails if the deployment fails, giving immediate feedback.

---

## 9 . Troubleshooting

| Symptom | Likely cause | Remedy |
|---------|--------------|--------|
| `401 Unauthorized` | Invalid or missing `VERCEL_TOKEN` | Re-generate token, export correctly |
| `403 Forbidden` | Token lacks team scope | Create token scoped to the team or add `--team` |
| Script exits with **Timeout** | Build queue slow or infinite loop | Increase `--timeout`, check Vercel dashboard |
| `Deployment not found` | Wrong project name / limit too low | Use `--project` exact slug or raise `--limit` |
| No logs saved | Forgot `--save-logs` | Add flag or check write permissions |

---

## 10 . Contributing

* Keep scripts **stateless** and avoid storing credentials in files.
* When updating endpoints, reference the latest [Vercel REST API docs](https://vercel.com/docs/rest-api).
* Update this guide with new options.

---

Made with ❤️  by the LiteraryHelper engineering team  
