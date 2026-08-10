# Weekly App Profiling Report (Cursor Automation)

Scheduled automation prompt for MetaMask Mobile. Runs weekly, analyzes the
**last 7 days** of merged PRs that executed performance tests, aggregates
BrowserStack app-profiling averages for the top scenarios, then produces an
**AI investigation insights** section and DMs the report on Slack.

## Suggested schedule

- Cadence: weekly (e.g. Monday 09:00 Europe/Amsterdam)
- Repo: `MetaMask/metamask-mobile`
- Model: high-reasoning model preferred

## Tools required

- GitHub (`gh`) authenticated with `actions:read` + pull request read
- Slack MCP (send DM)
- Shell access to run the collector script

## Prompt (copy into Cursor Automation)

```text
You are running the weekly MetaMask Mobile app-profiling report.

## Goal
Analyze performance / BrowserStack app-profiling data from PRs merged to `main`
in the **last 7 days**, then send a Slack DM to **Javier Vera**
(`javier.vera@consensys.net`, Slack user id `UEYQL2PEV`) with:
1) profiling averages for the top executed scenarios
2) data-driven investigation leads
3) your own final **AI insights to investigate**, grounded in merged PRs

The Slack message must be a short executive summary, not a data dump.

## Steps

1. From the repo root, run:
   ```bash
   node tests/scripts/weekly-app-profiling-report.mjs --days 7 --top 10 --out-dir /tmp/weekly-app-profiling
   ```
   If `gh` auth is missing, fix auth first. Do not invent metrics.

2. Read:
   - `/tmp/weekly-app-profiling/report.json`
   - `/tmp/weekly-app-profiling/ai-briefing.md`
   - `/tmp/weekly-app-profiling/slack.md`

3. **AI final analysis (required)**  
   Using only the collected data + merged failing PR titles/areas, write:
   - an executive summary with at most 3 bullets
   - at most 3 investigation findings
   - at most 3 priority actions

   Rules for insights:
   - Prefer correlations between hotspot scenarios (memory / slow frames) and
     merged PR themes (perps, predict, onboarding, assets, swap, accounts…).
   - Explicitly separate likely product regressions vs test/QG flake.
   - Skip low-confidence scenarios (`n < 3`) unless the metric is extreme.
   - Mention concrete PR numbers/titles when useful.
   - Do not repeat every scenario or every investigation lead.
   - End with exactly 3 or fewer prioritized actions.
   - English, Slack-friendly markdown, concise.

4. Merge your AI insights into the Slack message:
   - Start from `/tmp/weekly-app-profiling/slack.md`
   - Replace the placeholder AI insights section with your final analysis
   - Keep only the selected top findings and up to 3 data-driven leads
   - **Do NOT convert metrics into a markdown/ASCII table**
   - **Do NOT wrap the message (or any section) in a ``` code fence**
   - Slack wraps wide tables badly; keep the compact card format from `slack.md`
   - Prefer Slack mrkdwn (`*bold*`, links like `<url|label>`) over GitHub-flavored tables
   - The final Slack message should contain only: executive summary, top findings,
     up to 3 data-driven leads, up to 3 AI insights, and up to 3 priority actions
   - Keep all raw metrics, all scenarios, and all merged PR details in
     `report.json`; do not paste them into Slack

5. Send the final message as a Slack DM to user id `UEYQL2PEV` using the Slack
   `slack_send_message` tool. Do not post to a public channel unless explicitly
   asked. If the message is long, split into 2 messages (metrics first, then
   leads + AI insights) instead of forcing a table.

6. In your final agent reply, include:
   - the Slack message link
   - a 2–3 sentence executive summary of the most important investigation item

## Non-goals
- Do not create a PR unless asked
- Do not modify app source code
- Do not claim profiling regressions without numbers from report.json
```

## Manual dry-run

```bash
node tests/scripts/weekly-app-profiling-report.mjs --days 7 --top 10 --out-dir /tmp/weekly-app-profiling
# Inspect /tmp/weekly-app-profiling/{report.json,slack.md,ai-briefing.md}
# Then paste ai-briefing.md into an agent chat to generate insights and Slack the result
```

## Notes

- Device expected in current CI: Google Pixel 8 Pro (Android 14)
- App profiling artifacts come from workflow `aggregated-reports` on performance runs
- The collector script emits heuristic leads; the automation's AI pass adds the
  deeper merged-PR investigation narrative
