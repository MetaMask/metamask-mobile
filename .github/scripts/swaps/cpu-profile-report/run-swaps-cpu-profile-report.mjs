/**
 * GitHub Actions entrypoint for swaps-cpu-profile-report.mjs. Lists the
 * scheduled runs and downloads their artifacts with `gh` (needs GH_TOKEN),
 * posts the report, and writes the weekly summary to `$OUT_DIR/summary.json`.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PERFORMANCE_WORKFLOW,
  REPORT_WORKFLOW,
  SCENARIOS,
  SLACK_CHANNEL_ID,
} from './swaps-cpu-profile-report.config.mjs';
import {
  buildFullReport,
  buildSlackMessage,
  failedTestNames,
  lastWeek,
  scenarioSample,
  summarizeScenario,
} from './swaps-cpu-profile-report.mjs';

const repo = process.env.GITHUB_REPOSITORY || 'MetaMask/metamask-mobile';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'swaps-cpu-profile-'));
const DAY_MS = 24 * 60 * 60 * 1000;
const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: 'pipe' });

/** IDs of the scheduled runs of a workflow, newest first. */
const scheduledRuns = (workflow, ...flags) => {
  const args = ['run', 'list', '-R', repo, '-w', workflow, '-e', 'schedule'];
  const runs = gh([...args, ...flags, '--json', 'databaseId']);
  return JSON.parse(runs).map((run) => run.databaseId);
};

function readArtifactJson(runId, artifact, file) {
  const target = path.join(directory, `${runId}-${artifact}`);
  gh(['run', 'download', `${runId}`, '-R', repo, '-n', artifact, '-D', target]);
  return JSON.parse(fs.readFileSync(path.join(target, file), 'utf8'));
}

/** Last week's summary, from the latest successful scheduled run of this workflow; null on the first run or after a missed week. */
function previousSummary({ start }) {
  try {
    const [runId] = scheduledRuns(REPORT_WORKFLOW, '-s', 'success', '-L', '1');
    const summary =
      runId &&
      readArtifactJson(runId, 'swaps-cpu-profile-summary', 'summary.json');
    const previousStart = new Date(start - 7 * DAY_MS).toISOString();
    return summary?.window?.start === previousStart ? summary : null;
  } catch (error) {
    console.warn(`[baseline] ${error.stderr?.trim() || error.message}`);
    return null;
  }
}

/** chat.postMessage reports errors as HTTP 200 with `ok: false`. */
async function postToSlack(token, text) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Slack chat.postMessage HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body.ok) {
    throw new Error(
      `Slack chat.postMessage failed: ${body.error || 'unknown error'}`,
    );
  }
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === 'true';
  if (!env.GH_TOKEN || !env.OUT_DIR) {
    throw new Error('GH_TOKEN or OUT_DIR is not set');
  }
  if (!dryRun && !env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is not set (or run with DRY_RUN=true)');
  }

  const window = lastWeek();
  // `a..b` includes `b`, so the range stops one second before the next week starts.
  const created = `${window.start.toISOString()}..${new Date(window.end - 1000).toISOString()}`;
  const runIds = scheduledRuns(
    PERFORMANCE_WORKFLOW,
    ...['-b', 'main', '-L', '100', '--created', created],
  );
  const samples = SCENARIOS.map(() => []);
  const deviceNames = new Set();
  let runsRead = 0;
  for (const runId of runIds) {
    try {
      const report = readArtifactJson(
        runId,
        'app-profiling-analysis',
        'report.json',
      );
      const summary = readArtifactJson(
        runId,
        'aggregated-reports',
        'summary.json',
      );
      summary.devices?.forEach(({ device }) => deviceNames.add(device));
      const failed = failedTestNames(summary);
      SCENARIOS.forEach((scenario, index) => {
        const sample = scenarioSample(report, failed, scenario);
        if (sample.status === 'ambiguous') {
          console.warn(`[ambiguous] run ${runId}: ${scenario.label}`);
        }
        samples[index].push({ ...sample, runId });
      });
      runsRead += 1;
    } catch (error) {
      console.error(
        `[skip] run ${runId}: ${error.stderr?.trim() || error.message}`,
      );
    }
  }

  const devices = [...deviceNames];
  const scenarios = SCENARIOS.map((scenario, index) => ({
    ...scenario,
    summary: summarizeScenario(samples[index]),
  }));
  fs.mkdirSync(env.OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(env.OUT_DIR, 'summary.json'),
    `${JSON.stringify({ window, runIds, runsRead, devices, scenarios }, null, 2)}\n`,
  );
  const details = {
    window,
    runsRead,
    devices,
    runsFound: runIds.length,
    previous: previousSummary(window),
  };
  fs.writeFileSync(
    env.GITHUB_STEP_SUMMARY || path.join(env.OUT_DIR, 'report.md'),
    buildFullReport(scenarios, details),
  );
  const message = buildSlackMessage(scenarios, {
    ...details,
    runUrl: env.GITHUB_RUN_URL || '',
  });
  console.log(`${message}\n`);
  if (dryRun) {
    console.log('Dry run; not posted.');
  } else {
    await postToSlack(env.SLACK_BOT_TOKEN, message);
    console.log('Posted to Slack.');
  }
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
