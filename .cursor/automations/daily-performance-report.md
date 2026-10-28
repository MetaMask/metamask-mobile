# Daily Performance Test Report (Cursor Automation)

Scheduled automation for MetaMask Mobile. Every day at **09:00 Europe/Madrid** it reads the scheduled performance E2E runs from the **last 24 hours**, compares them with the previous 24 hours, and DMs Javier Vera a Slack report.

The report has an analysis, a summary table, the runs, test errors, stability, and duration / fail-rate trends.

## Automation settings

Create this in [Cursor Automations](https://cursor.com/automations). This repo cannot register the schedule on a Cursor account.

| Setting | Value |
| --- | --- |
| Name | Daily performance test report |
| Repository | `MetaMask/metamask-mobile` |
| Branch | `main` |
| Schedule | Every day at 09:00 Europe/Madrid |
| UTC cron, while Spain is on CET (UTC+1, late October through late March) | `0 8 * * *` |
| UTC cron, while Spain is on CEST (UTC+2, late March through late October) | `0 7 * * *` |
| Tools | GitHub (`gh` with `actions:read`) and Slack `slack_send_message` |
| Slack destination | DM user `UEYQL2PEV` (Javier Vera). Do not post to a channel. |
| Pull requests | Do not open a pull request |

Cursor cron is UTC. `0 8 * * *` is 09:00 in Madrid only during standard time. Switch it to `0 7 * * *` when daylight saving starts if the field has no timezone.

The collector script has to be on `main` before the automation can run it:

```bash
node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs --hours 24 --out-dir /tmp/daily-performance
```

Scheduled runs come from `run-performance-e2e-manual.yml` (`0 */6 * * 1-6`: 00:00, 06:00, 12:00, and 18:00 UTC, Monday through Saturday). A run that is still in progress at 09:00 is listed and left out of the pass rate.

## Prompt (copy into Cursor Automation)

````text
You are running the daily MetaMask Mobile performance test report.

## Goal
Read scheduled performance E2E results from the last 24 hours, compare them with the previous 24 hours, and send one Slack DM to Javier Vera (user id UEYQL2PEV, javier.vera@consensys.net).

The message must include:
- a short analysis
- a summary table
- the runs
- test errors
- stability
- trends

Do not post to a channel. Do not open a pull request. Do not edit the repo.

## Steps

1. From the repo root, run:

   node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs --hours 24 --out-dir /tmp/daily-performance

   If `gh` is not authenticated for GitHub Actions, stop and say so. Do not invent metrics.

2. Read:
   - /tmp/daily-performance/report.json
   - /tmp/daily-performance/slack.md
   - /tmp/daily-performance/ai-briefing.md
   - /tmp/daily-performance/slack-part-1.md and slack-part-2.md when those files exist

3. Send the Slack message with slack_send_message to channel_id UEYQL2PEV.
   - When slack-part-1.md exists, send that first and slack-part-2.md second.
   - Otherwise send slack.md as the message body.
   - Keep the markdown tables. Do not turn them into ASCII art or a code block.
   - Do not change any number, scenario name, reason, or link.
   - You may rewrite only the Analysis bullets, and only by using facts already present in report.json.
   - Do not add a scenario, run, or duration that is not in the report.
   - Do not convert team names into Slack mentions. A subteam mention notifies that team.
   - Times in the message are already Europe/Madrid. Leave them that way.

4. In the final reply, include the Slack message link and the analysis bullets.

## How to read the tables

- Summary compares the last 24 hours with the previous 24 hours.
- Scenario pass rate counts each scenario once per run, after retries.
- Test errors are scenarios that failed at least once, plus workflow runs that produced no results.
- Stability uses completed runs only. Stable means passed every time. Flaky means passed in some runs and failed in others. Failing means failed every time. Passed on retry means the run passed only after an earlier attempt failed.
- Trends show fail-rate changes, and median duration moves of at least 15% when both windows have two or more passing samples. A positive duration delta is slower.
- In-progress runs are listed and excluded from pass rate, stability, and trends.

## Non-goals

- Do not analyze Hermes CPU profiles. That is a different report.
- Do not treat this as a production alert.
- Do not notify team channels.
````

## Manual dry-run

```bash
node .github/scripts/qa-automation/performance-tests/daily-performance-report.mjs --hours 24 --out-dir /tmp/daily-performance
```

Inspect `/tmp/daily-performance/slack.md` before sending it.
