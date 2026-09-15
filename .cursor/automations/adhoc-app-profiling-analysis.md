# Ad-hoc App Profiling Analysis (Cursor Automation)

Manual / ad-hoc prompt for MetaMask Mobile. Pulls the per-scenario
BrowserStack app-profiling files (and Hermes `.cpuprofile` summaries when
present) from a scheduled 6-hour performance run, then has the agent review
**each scenario** and call out issues.

This is complementary to:

- GitHub workflow `Analyze App Profiling` (Actions → workflow_dispatch)
- Weekly rollup in `weekly-app-profiling-report.md` (7-day merged-PR averages)

## Suggested trigger

- Cadence: ad-hoc (no schedule yet)
- Repo: `MetaMask/metamask-mobile`
- Model: high-reasoning model preferred

## Tools required

- GitHub (`gh`) authenticated with `actions:read`
- Slack MCP only if the user asks to DM the result
- Shell access to run the collector script

## Prompt (copy into Cursor Automation)

````text
You are analyzing MetaMask Mobile app-profiling artifacts from a performance
E2E run (scheduled every 6 hours on main).

## Goal
For **each scenario** in the run, review BrowserStack app-profiling metrics
and Hermes CPU-profile hot frames, then report any issues that the data
supports.

## Steps

1. From the repo root, run (latest scheduled successful run on main):

   ```bash
   node tests/scripts/analyze-app-profiling.mjs --skip-ai --out-dir /tmp/analyze-app-profiling
   ```

   To target a specific run or scenario:

   ```bash
   node tests/scripts/analyze-app-profiling.mjs --run <id> --scenario "Cold Start Login" --skip-ai --out-dir /tmp/analyze-app-profiling
   ```

   `--skip-ai` is required here: you are the agent pass. The GitHub workflow
   can call Claude itself when `E2E_CLAUDE_API_KEY` is present.

2. Read:
   - `/tmp/analyze-app-profiling/report.json`
   - `/tmp/analyze-app-profiling/ai-briefing.md`
   - `/tmp/analyze-app-profiling/scenarios/*.json`

3. Write findings **per scenario**:
   - Status: issue | watch | healthy
   - Metrics that support the status (CPU, memory, slow/frozen frames, ANRs,
     BrowserStack issues, hottest JS frames, slow API calls)
   - One recommended next step
   - Append a BrowserStack recording link when `videoURL` is present

4. Then write:
   - at most 5 executive-summary bullets
   - at most 5 priority actions

## Rules

- Use only app-profiling / CPU-profile / API-call data from the files above.
- Do not mention quality gates, test errors, or flake unless they appear in
  those files.
- Do not invent regressions. Mark code hypotheses as UNVALIDATED.
- English, concise, QA/performance audience.

## Non-goals

- Do not create a PR unless asked
- Do not modify app source code
````

## Manual dry-run

```bash
node tests/scripts/analyze-app-profiling.mjs --skip-ai --out-dir /tmp/analyze-app-profiling
# Inspect /tmp/analyze-app-profiling/{report.md,report.json,scenarios,ai-briefing.md}
```
