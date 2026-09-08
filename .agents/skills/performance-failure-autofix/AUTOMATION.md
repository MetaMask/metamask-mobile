# Cursor Automation setup — Performance failure autofix

Cursor Automations are configured in the Cursor product UI
([cursor.com/automations](https://cursor.com/automations)), not committed as
YAML. This document is the paste-ready configuration for the agent defined by
[`SKILL.md`](./SKILL.md).

## Create the automation

1. Open [Cursor Automations](https://cursor.com/automations) → **Create**.
2. Name: `Performance E2E failure triage + fix`
3. Repository: `MetaMask/metamask-mobile`
4. Copy the **Agent prompt** below into the automation prompt field.
5. Configure triggers, tools, and secrets as listed.
6. Enable the automation.

## Trigger

| Field | Value |
| ----- | ----- |
| Type | **GitHub** → **Workflow run completed** (or **failed**, if that option exists) |
| Repository | `MetaMask/metamask-mobile` |
| Workflow filter | Prefer matching names that contain `Performance` (see workflow list below). If the UI only supports “any workflow”, rely on the prompt’s early-exit gate. |
| Branch filter | Optional: `main`, `MMQA-performance-improvements`, release branches — or leave open and let the agent decide |

### Workflows in scope

- `Build Apps and Run Performance E2E Tests` (`.github/workflows/run-performance-e2e.yml`)
- `Performance E2E Tests for Release Builds` (`.github/workflows/run-performance-e2e-release.yml`)
- `Performance E2E Tests for Experimental Builds` (`.github/workflows/run-performance-e2e-experimental.yml`)

If the completed workflow is **not** one of these, exit immediately with no Slack message and no PR.

## Tools to enable

| Tool | Why |
| ---- | --- |
| **GitHub** (read Actions, download artifacts, open PRs) | Required — logs, artifacts, PR creation |
| **Slack** (send DM / message) | Required — notify Javier Vera |
| **Browser / web fetch** (if available) | Optional — open BrowserStack session pages |
| **Shell / code edit** | Required — download video, inspect recordings, implement fix |

Do **not** enable tools that post to public channels unless you intentionally change the Slack destination.

## Runtime secrets

Add these as Automation / Cloud Agent secrets (never commit them):

| Secret | Purpose |
| ------ | ------- |
| `BROWSERSTACK_USERNAME` | Download App Automate session video + metadata |
| `BROWSERSTACK_ACCESS_KEY` | Same |
| `GH_TOKEN` or GitHub App auth | Already provided by Cursor GitHub integration in most setups |
| Slack auth | Already provided by Cursor Slack integration when the Slack tool is enabled |

## Agent prompt (paste this)

```text
You are the Performance Failure Autofix agent for MetaMask Mobile.

Follow the skill at:
.agents/skills/performance-failure-autofix/SKILL.md

All agent output (analysis notes, Slack message, PR title/body, commit messages) MUST be in English.

## Trigger context

A GitHub Actions workflow run just completed. Use the run URL / run id from the trigger payload.

## Hard early exits (no Slack, no PR)

1. The workflow is not one of: "Build Apps and Run Performance E2E Tests", "Performance E2E Tests for Release Builds", "Performance E2E Tests for Experimental Builds".
2. Conclusion is success with zero failed performance tests.
3. You cannot authenticate to GitHub Actions.

## Required workflow

1. Identify every failed performance test in the run (all devices/platforms present in the matrix).
2. For each failure:
   - Parse the job log for the test title, platform, device, BrowserStack session URL, and the first failing assertion.
   - Download and inspect GitHub Actions artifacts (screenshots, test-results JSON, traces when present).
   - Download and watch the BrowserStack session video using BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY (REST: GET /sessions/{id}.json → video_url).
   - Classify: quality_gates_exceeded vs functional / flaky / infra.
3. Decide whether a code fix is allowed:
   - If ALL failures are quality_gates_exceeded (and screenshots/video show the happy path completed): DO NOT open a PR. Send Slack only.
   - If ANY failure is functional / flaky / infra with a concrete fix in app or performance test code: implement the fix and open a draft PR.
4. Slack: DM Javier Vera (Slack user id UEYQL2PEV) using the template in the skill. One message per run.
5. PR: draft, English title/body, link the Actions run and BrowserStack sessions, explain root cause and why it is not a QG-only case. Push with Cursor branch naming rules for this environment.

## Constraints

- Do not widen quality-gate thresholds unless a product/QA owner explicitly asked in the trigger context.
- Do not rotate or print BrowserStack secrets.
- Do not reply on public Slack channels; DM Javier only.
- Prefer the smallest correct fix.
- If BrowserStack video download fails, still analyze from logs + screenshots and state the gap in Slack.
```

## Manual / on-demand run

You can also invoke the same skill without a workflow trigger:

1. Open a Cloud Agent on `MetaMask/metamask-mobile`.
2. Paste:

```text
Follow .agents/skills/performance-failure-autofix/SKILL.md

Analyze GitHub Actions run: <PASTE_RUN_URL>

All output in English. DM Slack summary to Javier Vera (UEYQL2PEV). Open a draft PR only if a non-quality-gate fix is justified.
```

Or use the Cursor command:

```text
/performance-failure-autofix <github-actions-run-url>
```

## Acceptance checklist (after enabling)

- [ ] Automation triggers on a failed performance workflow (or completed with failures).
- [ ] Non-performance workflows are ignored (no Slack spam).
- [ ] QG-only failure → Slack DM only, no PR.
- [ ] Functional failure → Slack DM + draft PR with fix.
- [ ] BrowserStack video is downloaded when credentials are present.
- [ ] All agent-facing text is English.
