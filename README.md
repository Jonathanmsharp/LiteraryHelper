# LiteraryHelper

LiteraryHelper is a full-stack writing-assistant platform that analyses text in real-time, highlights issues, and suggests improvements using a hybrid of regex rules and AI-powered checks.

---

## ✈️ Continuous Deployment

Every push to **main** automatically triggers a deployment on **Vercel**.  
To make sure builds stay green we ship **deployment-monitoring tools** that watch each deployment until it is either **READY** or **ERROR**, stream logs, and surface failures immediately.

### Why monitor?

* Catch broken builds or missing env-vars within seconds  
* Stream coloured build logs directly in your terminal / CI job  
* Fail the pipeline on production errors instead of waiting for manual checks  
* Save full logs for offline debugging or ticket attachments  

### Prerequisites

| Tool / Variable     | Purpose                               |
|---------------------|---------------------------------------|
| **Node ≥ 18**       | Runs the monitoring scripts           |
| **pnpm**            | Installs workspace dependencies       |
| **VERCEL_TOKEN**    | Personal / team API token             |
| (opt) **VERCEL_TEAM_ID** | Needed when project lives in a team |

Generate a token at <https://vercel.com/account/tokens> and keep it **secret**.

```bash
# one-off for the current shell
export VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

For permanent local use create `.env.local` (git-ignored):

```
VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# VERCEL_TEAM_ID=team_abc123
```

### Quick start

```bash
# check the latest deployment of the production project
./scripts/check-deploy.sh --verbose
```

The script will

1. Find the most recent deployment of `literary-helper`
2. Poll its status with exponential back-off  
3. Print coloured log lines (errors in red)  
4. Exit **0** on success, **1** on failure/timeout  

### Full push + monitor workflow

```bash
./scripts/push-and-monitor.sh main --verbose
```

* Commits pending changes (optional)  
* Pushes to GitHub  
* Waits a few seconds  
* Monitors the deployment until **READY** or **ERROR**

### Git post-push hook

The repo ships a convenience hook:

```
.git/hooks/post-push   # already added & executable
```

It runs `scripts/check-deploy.sh` automatically after every `git push origin main`.  
Disable or edit it as you prefer.

### Script reference

| Script | Purpose | Typical use |
|--------|---------|-------------|
| `scripts/check-deploy.sh` | Wrapper around Node tool; colourised output & CLI flags | local / CI |
| `scripts/check-deployment.js` | Low-level ES-module that hits Vercel REST API | programmatic |
| `scripts/push-and-monitor.sh` | Push + monitor in one command | manual workflows |
| `scripts/vercel-utils.js` | Re-usable helpers (`waitForDeployment`, etc.) | integrations |

Key CLI flags (`check-deploy.sh`):

| Flag | Default | Description |
|------|---------|-------------|
| `--project` | literary-helper | Project slug or ID |
| `--team` | from env | Team scope |
| `--limit` | 5  | How many recent deployments to inspect |
| `--wait` | 10s | Initial polling interval |
| `--timeout` | 15m | Abort after X minutes |
| `--verbose` | off | Stream full logs |
| `--save-logs` | off | Write logs to `deployment-logs/` |

### CI example (GitHub Actions)

```yaml
- name: Monitor Vercel deployment
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  run: ./scripts/check-deploy.sh --project literary-helper --verbose --timeout 20
```

The job fails if Vercel reports **ERROR**, guarding the main branch.

---

For a deep-dive (advanced options, troubleshooting, CI snippets) read  
`docs/DEPLOYMENT_MONITORING.md`.
