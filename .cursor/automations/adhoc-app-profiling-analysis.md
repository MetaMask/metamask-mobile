# Ad-hoc App Profiling Analysis (Cursor Automation)

Manual / ad-hoc prompt for MetaMask Mobile. Pulls only the per-scenario Hermes
`.cpuprofile` files from a scheduled 6-hour performance run, then has the agent
review **each scenario** and call out sampled JavaScript hot frames.

BrowserStack app-profiling JSON and its CPU, memory, frame, and issue metrics
are explicitly out of scope.

This is complementary to:

- GitHub workflow `Analyze App Profiling`
  - 6-hour scheduled performance runs: collect `report.json` only (no Slack)
  - Monday 09:00 UTC: week-over-week exception report (Slack DM)
  - Manual performance dispatch: full per-run digest (Slack DM)
- Weekly BrowserStack rollup in `weekly-app-profiling-report.md`

Note: `workflow_dispatch` is only offered for workflows already on the default
branch. After it lands on `main`, run it from Actions. Until then, use the
local command below.

## Suggested trigger

- Cadence: ad-hoc investigation, or Actions → Analyze App Profiling → `weekly`.
  Do not add a Cursor schedule; GitHub owns Monday and 6-hour collection.
- Repo: `MetaMask/metamask-mobile`
- Model: high-reasoning model preferred

## Tools required

- GitHub (`gh`) authenticated with `actions:read`
- Slack MCP (`slack_send_message`) to user `UEYQL2PEV` (Javier's personal DM)
- Shell access to run the collector script

## Prompt (copy into Cursor Automation)

````text
You are analyzing MetaMask Mobile Hermes CPU profiles from a performance E2E
run (scheduled every 6 hours on main).

## Goal
For **each scenario** in the run, review only Hermes CPU-profile sampled
stacks, then report any issues that the data supports.

After the write-up, send the Slack summary directly to user `UEYQL2PEV` using
`slack_send_message`. Do not post it to a channel. Lead the message with a
disclaimer stating this is a testing experiment and not a production alert.

## Steps

1. Sync and load the canonical MetaMask profiling skill:

   ```bash
   yarn skills
   ```

   Read:
   - `.agents/skills/mms-swaps-cpu-profile-audit/SKILL.md`
   - `.agents/skills/mms-performance/SKILL.md`

   Follow `mms-swaps-cpu-profile-audit` fully for swaps/bridge scenarios.
   For non-swaps scenarios, reuse its parsing/timing protocol and the general
   `mms-performance` reasoning guardrails, but do not make swaps ownership or
   relation claims.

2. From the repo root, run (latest scheduled successful run on main):

   ```bash
   node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs --skip-ai --out-dir /tmp/analyze-app-profiling
   ```

   To target a specific run or scenario:

   ```bash
   node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs --run <id> --scenario "Cold Start Login" --skip-ai --out-dir /tmp/analyze-app-profiling
   ```

   To cover every scheduled run in a window instead of a single capture, which
   is what separates a repeated hotspot from one noisy run:

   ```bash
   node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs --lookback-hours 24 --skip-ai --out-dir /tmp/analyze-app-profiling
   ```

   Window mode writes the same `report.{json,md}` and `slack.md` names, plus a
   full single-run analysis per run under `runs/<run-id>/`.

   `--skip-ai` is required here: you are the agent pass. The GitHub workflow
   can call Claude itself when `E2E_CLAUDE_API_KEY` is present.

3. Read:
   - `/tmp/analyze-app-profiling/report.json`
   - `/tmp/analyze-app-profiling/ai-briefing.md`
   - `/tmp/analyze-app-profiling/scenarios/*.json`

4. Write findings **per scenario**:
   - Status: issue | watch | healthy
   - Sample counts and hottest self/inclusive JavaScript frames
   - One recommended next step
   - Append a BrowserStack recording link when `videoURL` is present

5. Then write:
   - at most 5 executive-summary bullets
   - at most 5 priority actions

6. Send the final summary directly to Slack user `UEYQL2PEV` with
   `slack_send_message`. Do not post it to a channel.
   Keep it short (executive summary + high-severity findings + actions).
   Start from `/tmp/analyze-app-profiling/slack.md` and replace the agent
   section with your findings. Do not wrap the message in a code fence.

## Rules

- The plain `<scenario>.cpuprofile` is logical segment 1. Files named
  `<scenario>.segment-2.cpuprofile` (and `.segment-3`, …) belong to the **same
  scenario**. Analyze them together and cite retry/segment locations.
- Do not use BrowserStack app-profiling JSON, CPU %, memory, slow/frozen
  frames, ANRs, detected issues, API calls, or quality gates.
- Do not mention quality gates, test errors, or flake unless they appear in
  those files.
- Do not invent regressions. Mark code hypotheses as UNVALIDATED.
- Do not send a manual copy when the GitHub workflow is already responsible
  for delivering the same report.
- English, concise, QA/performance audience.

## Non-goals

- Do not create a PR unless asked
- Do not modify app source code
````

## Manual dry-run

```bash
node .github/scripts/qa-automation/performance-tests/analyze-app-profiling.mjs --skip-ai --out-dir /tmp/analyze-app-profiling
# Inspect /tmp/analyze-app-profiling/{report.md,report.json,scenarios,ai-briefing.md}
```
