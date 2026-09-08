# Performance Failure Autofix (Agent + Cursor Automation)

Canonical guide for investigating failed MetaMask Mobile **performance E2E**
runs with a Cursor agent / Cursor Automation: artifacts → BrowserStack
recordings → classification → Slack DM → optional fix PR.

Agent skill (execution SSOT):
[`.agents/skills/performance-failure-autofix/SKILL.md`](../../.agents/skills/performance-failure-autofix/SKILL.md)

Cursor Automation paste-ready config:
[`.agents/skills/performance-failure-autofix/AUTOMATION.md`](../../.agents/skills/performance-failure-autofix/AUTOMATION.md)

Cursor command: `/performance-failure-autofix`

**All agent output must be in English** (Slack, PRs, commits, summaries).

## What it does

When a performance GitHub Actions run finishes with failed tests, the agent:

1. Lists every failed performance test in the run.
2. Downloads GitHub Actions artifacts (aggregated reports, Playwright screenshots).
3. Downloads and reviews BrowserStack App Automate session videos (when
   `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` are available).
4. Classifies each failure:
   - `quality_gate_only` — flow completed; timer(s) over threshold
   - `test_bug` / `selector_flake` — automation issue
   - `app_regression` — incorrect product behavior on video
   - `infra` / `unknown`
5. **Slack DM** Javier Vera (`UEYQL2PEV`) with a structured English triage report.
6. Opens a **draft PR with a proposed fix** only when the failure is **not**
   quality-gates-only and a high-confidence, minimal fix exists in the app or
   the performance test.

## Workflows in scope

| Workflow name | File |
| ------------- | ---- |
| Build Apps and Run Performance E2E Tests | `.github/workflows/run-performance-e2e.yml` |
| Performance E2E Tests for Release Builds | `.github/workflows/run-performance-e2e-release.yml` |
| Performance E2E Tests for Experimental Builds | `.github/workflows/run-performance-e2e-experimental.yml` |

Other workflows → **no-op** (no Slack, no PR).

## Fix gate

| Classification | Slack DM | Fix PR |
| -------------- | -------- | ------ |
| All failures are `quality_gate_only` | Yes | **No** (threshold / regression triage for humans) |
| Any `test_bug` / `app_regression` with concrete fix | Yes | Yes (draft) |
| `infra` / `unknown` / low confidence | Yes | **No** (recommendations only) |

Do **not** raise quality-gate thresholds in autofix PRs unless a product/QA
owner explicitly requests it.

## Enable the Cursor Automation

Cursor Automations are configured in the product UI
([cursor.com/automations](https://cursor.com/automations)), not as repo YAML.

1. Create automation → name `Performance E2E failure triage + fix`.
2. Repository: `MetaMask/metamask-mobile`.
3. Trigger: GitHub **Workflow run completed** (or failed), filtered to
   Performance workflows when the UI allows; otherwise rely on the prompt’s
   early-exit gate.
4. Enable tools: GitHub (Actions + PRs), Slack (DM), shell/code edit.
5. Add runtime secrets: `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`.
6. Paste the agent prompt from
   [AUTOMATION.md](../../.agents/skills/performance-failure-autofix/AUTOMATION.md).

### Slack destination

- User: Javier Vera
- Slack user id: `UEYQL2PEV`
- Delivery: DM via `slack_send_message` (`channel_id: UEYQL2PEV`)

### Manual run

```text
Follow .agents/skills/performance-failure-autofix/SKILL.md

Analyze GitHub Actions run: <PASTE_RUN_URL>

All output in English. DM Slack summary to Javier Vera (UEYQL2PEV).
Open a draft PR only if a non-quality-gate fix is justified.
```

Or: `/performance-failure-autofix <github-actions-run-url>`

## Related docs

- [tests/performance/README.md](../../tests/performance/README.md)
- [docs/performance/](../performance/)
