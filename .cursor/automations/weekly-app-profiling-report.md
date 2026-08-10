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
2) data-driven investigation leads based only on app-profiling metrics
3) your own final **AI insights to investigate**, based only on app-profiling data

The Slack message must be a short executive summary, not a data dump.
The footer must contain the setup note, testing disclaimer, and CC mention in
that order.

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
Using only the collected app-profiling data, write:
   - an executive summary with at most 3 bullets
   - at most 3 investigation findings
   - at most 3 priority actions

   Rules for insights:
   - Use only CPU, memory, slow frames, issues, app size, ANRs, and frozen frames.
   - Do not mention Test Error, test errors, quality gates, failure rates, or test stability.
   - Skip low-confidence scenarios (`n < 3`) unless the metric is extreme.
   - Mention a PR number only as a neutral reference to a profiling artifact, if needed.
   - Do not repeat every scenario or every investigation lead.
   - Group the executive summary by team.
   - Start every executive-summary bullet with the relevant Slack team tag(s).
   - End with exactly 3 or fewer prioritized actions.
   - English, Slack-friendly markdown, concise.

4. Merge your AI insights into the Slack message:
   - Start from `/tmp/weekly-app-profiling/slack.md`
   - Replace the placeholder AI insights section with your final analysis
   - Keep only the selected top findings and up to 3 profiling-based leads
   - **Do NOT convert metrics into a markdown/ASCII table**
   - **Do NOT wrap the message (or any section) in a ``` code fence**
   - Slack wraps wide tables badly; keep the compact card format from `slack.md`
   - Prefer Slack mrkdwn (`*bold*`, links like `<url|label>`) over GitHub-flavored tables
   - The final Slack message should contain only: title, window, executive summary
     grouped by team, data details, up to 3 profiling leads, up to 3 AI insights,
     up to 3 priority actions, and the final setup/disclaimer/CC footer
   - Keep all raw app-profiling metrics and all scenarios in `report.json`;
     do not paste raw details into Slack

5. Send the final message as a Slack DM to user id `UEYQL2PEV` using the Slack
   `slack_send_message` tool. Do not post to a public channel unless explicitly
   asked. If the message is long, split into 2 messages (metrics first, then
   leads + AI insights) instead of forcing a table.

## Required Slack structure

Use this order:

*Weekly App Profiling Report*

*Window:* [start date] → [end date]

*Executive summary*

- <@TEAM_ID> [Profiling insight supported by metrics]
- <@TEAM_ID> [Profiling insight supported by metrics]
- <@TEAM_ID> [Profiling insight supported by metrics]

*Data details*

*<@TEAM_ID> Scenario name*

Profiling samples: n=[sample count]

CPU avg: [value] · Memory avg: [value] · Memory max: [value]

Slow frames: [value] · Issues: [value] · App size: [value]

*Profiling leads*

[No more than 3 concise profiling-based leads.]

*AI insights to investigate*

[No more than 3 concise profiling-based insights.]

*Priority actions*

1. [Action based only on profiling data]
2. [Action based only on profiling data]
3. [Action based only on profiling data]

*Setup:* Weekly BrowserStack app-profiling rollup (last 7 days)

*Disclaimer:* This report is for TESTING purposes only and should not be treated as a production alert.

*CC:* <@UEYQL2PEV>

Do not add device, PR-count, run-count, pass-count, failure-count, or artifact-download metadata to the Slack message.

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
