---
name: performance-failure-autofix
description: >
  Investigate failed MetaMask Mobile performance E2E tests from a GitHub Actions
  run: download artifacts, review BrowserStack recordings/screenshots, classify
  failures (quality-gate vs functional), propose and implement a fix in the app
  or performance test when appropriate, DM Javier Vera on Slack, and open a PR.
  Use when a performance workflow fails, when triage of BrowserStack recordings
  is needed, or when running the Cursor Automation for performance autofix.
---

# Performance Failure Autofix Agent

**Goal:** For each **failed** performance test in a given GitHub Actions run,
reproduce the investigation done by a QA engineer: artifacts → screenshots →
BrowserStack video → root cause → Slack DM → PR (when a code fix is warranted).

All agent output (Slack, PR title/body, commit messages, comments) **must be in
English**.

## When to use

- Cursor Automation triggered by a performance workflow completion/failure
- Manual: user pastes a performance Actions run URL / run id
- Manual: `/performance-failure-autofix` command

## Workflows in scope

Only these GitHub Actions workflow `name:` values:

- `Build Apps and Run Performance E2E Tests`
- `Performance E2E Tests for Release Builds`
- `Performance E2E Tests for Experimental Builds`

If the trigger is a different workflow, **no-op** (do not Slack/PR).

If conclusion is `success` / `cancelled` / `skipped` with zero failed tests in
`summary.json` / `failed-tests-by-team.json`, **no-op**.

## Required tools / secrets

| Need | How |
|------|-----|
| GitHub Actions logs + artifacts | `gh` (GitHub App / token already available) |
| BrowserStack session + video | Runtime secrets `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY` |
| Slack DM to Javier Vera | Slack MCP `slack_send_message` with channel_id `UEYQL2PEV` (Javier Vera) |
| PR creation | git + `ManagePullRequest` / GitHub App |

Never print BrowserStack credentials, tokens, or auth_token query params in
Slack, PRs, commits, or logs.

## Decision tree

```
Failed performance tests in run?
├─ No → no-op
└─ Yes → for EACH failed test:
   ├─ Download device-matching artifacts + aggregated-reports
   ├─ Classify failureReason:
   │  ├─ quality_gates_exceeded ONLY (test completed, timers over threshold)
   │  │  → Analyze (video/screenshot optional). Do NOT open a code-fix PR.
   │  │  → Slack DM: metrics, recording link, “threshold/regression triage” note.
   │  └─ functional failure (assert/timeout/crash/selector/stale/etc.)
   │     OR mix of functional + quality gates
   │     → Mandatory: screenshot(s) + BrowserStack video frames
   │     → Root-cause: APP bug vs TEST/infra flake
   │     → If high-confidence fixable in ≤ ~small diff:
   │        implement fix → PR → Slack DM with PR link
   │     → Else: Slack DM with findings + recommended next step (no PR)
```

**Quality-gate-only failures are triage/reporting, not autofix PRs.** Raising
thresholds without product/QA agreement is forbidden unless the user explicitly
asks for a threshold change.

## Investigation steps (per failed test)

1. **Identify the run**
   - From trigger payload or user-provided URL: `run_id`, `head_sha`, `head_branch`, `html_url`.
   - `gh run view <run_id> --repo MetaMask/metamask-mobile --json conclusion,headBranch,headSha,url,displayTitle,workflowName`

2. **Download artifacts**
   - Always: `aggregated-reports` (`summary.json`, `performance-results.json`).
   - Per failed device: artifacts named like
     `android-*-test-results-<Device>-<os>` /
     `ios-*-test-results-<Device>-<os>` matching the failure’s device.
   - Parse `failedTestsStats.failedTestsByTeam` and per-test
     `failureReason`, `qualityGates`, `recordingLink` / `videoURL`, `sessionId`.

3. **Playwright report media**
   - From the device artifact `test-reports/playwright-report/`:
     - Extract embedded report (`playwrightReport` script → zip → `report.json`).
     - Collect attachments for the failed test: `*-error-screenshot`, traces, stdout/stderr.
   - Read screenshots with the image tool (do not rely on filenames alone).

4. **BrowserStack recording (required for functional failures)**
   - Session API:
     `GET https://api-cloud.browserstack.com/app-automate/sessions/<sessionId>.json`
     with Basic auth from env secrets.
   - Download `video_url` to a local mp4 under `/tmp` and/or `/opt/cursor/artifacts/`.
   - Extract frames (`ffmpeg` fps≈1/2) and visually inspect the failing step window.
   - Prefer the session id from the **failed attempt that produced quality-gate /
     assert evidence** (often in stdout / `failed-tests-by-team.json`), not a
     skipped retry session.

5. **Classify root cause (pick one primary)**
   - `quality_gate_only` — flow completed; timer(s) over threshold
   - `selector_flake` — Index out of bounds / stale element / retry then success then QG fail
   - `test_bug` — wrong locator, missing wait, incorrect flow for current UI
   - `app_regression` — UI/state clearly wrong vs expected product behavior
   - `infra` — BrowserStack session/device, missing app URL, build upload
   - `unknown` — insufficient evidence

6. **Fix gate (PR only if ALL true)**
   - Primary class is `test_bug` or `app_regression` (not `quality_gate_only`, not pure `infra`)
   - You can name exact file(s) + one-line cause
   - Fix is minimal and matches repo patterns (TypeScript, existing PO / TimerHelper / assertions)
   - You verified the failure is reproducible from artifacts/video (not a one-off cancel)
   - Prefer test/PO fixes when the UI is correct but automation is brittle
   - Prefer app fixes only when the video shows incorrect product behavior

7. **Implement + PR**
   - Branch: `cursor/perf-autofix-<short-slug>-a093` (or the automation’s configured prefix)
   - Commit message: clear, English, focused on the fix
   - PR title/body in English; link the Actions run + BrowserStack session
   - Do not request reviewers unless tools say so
   - Do not approve PRs

8. **Slack DM Javier Vera (always when there was ≥1 failed test)**
   - Tool: `slack_send_message`
   - `channel_id`: `UEYQL2PEV` (Javier Vera — Staff QA Engineer)
   - Use the Slack message template below
   - One DM per run (aggregate all failed tests). If a PR was opened, include it.
   - Never include secrets or raw credential values.

## Slack DM template (English)

```text
:rotating_light: *Performance E2E failure triage*

*Run:* <workflow name> — <conclusion>
*Link:* <actions run url>
*Branch / SHA:* `<branch>` / `<shortsha>`
*Device focus:* <device(s) with failures>

*Failures (<N>):*
1. *<test name>* — `<failureReason>`
   - Class: `<quality_gate_only|test_bug|app_regression|selector_flake|infra|unknown>`
   - Key signal: <1–2 lines from metrics or video>
   - Recording: <browserstack session url>
   - Screenshot: <note if attached / path>

*Proposed action:*
- <no PR — quality gate only / needs human threshold review>
- OR <PR: url> — <one-line fix summary>

*Notes:* <optional, short>
```

## Implementation references in-repo

- Specs: `tests/performance/**`
- Page objects: `tests/page-objects/**`
- Assertions / waits: `tests/framework/PlaywrightAssertions.ts`, `tests/framework/Utilities.ts`
- Timers / QG: `tests/framework/TimerHelper.ts`, `tests/framework/quality-gates/`
- BrowserStack client: `tests/framework/services/providers/browserstack/BrowserStackAPI.ts`
- Workflow: `.github/workflows/run-performance-e2e.yml`
- Guide: `tests/performance/README.md`

## Hard rules

- English only for Slack, PRs, commits, and user-facing summaries from this skill
- Do not invent BrowserStack session IDs
- Do not raise performance thresholds in autofix PRs
- Do not commit secrets, videos, or large binaries into the repo
- Prefer one focused PR per run (or per clear root cause if multiple unrelated fails)
- If credentials are missing, still triage from artifacts/screenshots and Slack that
  video review was skipped due to missing `BROWSERSTACK_*` secrets

## Cursor Automation setup

See [AUTOMATION.md](AUTOMATION.md) for the paste-ready Cursor Automation prompt,
trigger configuration, tools, and secrets checklist.
