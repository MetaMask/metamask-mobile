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
const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: 'pipe' });

function listRuns({ start, end }) {
  // `a..b` includes `b`, so the range stops one second before the next week starts.
  const created = `${start.toISOString()}..${new Date(end - 1000).toISOString()}`;
  const runs = gh(
    ['run', 'list', '-R', repo, '-w', PERFORMANCE_WORKFLOW]
      .concat(['-e', 'schedule', '-b', 'main', '--created', created])
      .concat(['-L', '100', '--json', 'databaseId']),
  );
  return JSON.parse(runs).map((run) => run.databaseId);
}

function readArtifactJson(runId, artifact, file) {
  const target = path.join(directory, `${runId}-${artifact}`);
  gh(['run', 'download', `${runId}`, '-R', repo, '-n', artifact, '-D', target]);
  return JSON.parse(fs.readFileSync(path.join(target, file), 'utf8'));
}

/** Last week's summary from this workflow's recent runs, or null on the first run or after a missed week. */
function previousSummary({ start }) {
  const previousStart = new Date(start - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const runs = JSON.parse(
      gh(
        ['run', 'list', '-R', repo, '-w', REPORT_WORKFLOW].concat([
          '-s',
          'success',
          '-L',
          '10',
          '--json',
          'databaseId',
        ]),
      ),
    );
    for (const { databaseId } of runs) {
      try {
        const summary = readArtifactJson(
          databaseId,
          'swaps-cpu-profile-summary',
          'summary.json',
        );
        if (summary.window?.start === previousStart) {
          return summary;
        }
      } catch {
        // A run without the artifact is not a baseline.
      }
    }
  } catch (error) {
    console.warn(`[baseline] ${error.stderr?.trim() || error.message}`);
  }
  return null;
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
  const runIds = listRuns(window);
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
  const report = buildFullReport(scenarios, details);
  fs.writeFileSync(path.join(env.OUT_DIR, 'report.md'), report);
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report);
  }
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
