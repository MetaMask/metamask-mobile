/**
 * GitHub Actions entrypoint for swaps-cpu-profile-report.mjs. Lists the
 * scheduled runs and downloads their artifacts with `gh` (needs GH_TOKEN), and
 * writes the weekly summary and the Slack post to `$OUT_DIR`; the workflow posts it.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PERFORMANCE_WORKFLOW,
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

/** The weekly summary artifact is named by its window's first and last day, so last week's can be looked up directly. */
function summaryArtifact({ start, end }) {
  const day = (date) => date.toISOString().slice(0, 10);
  return `swaps-cpu-profile-summary-${day(start)}_${day(new Date(end - DAY_MS))}`;
}

function readArtifactJson(runId, artifact, file) {
  const target = path.join(directory, `${runId}-${artifact}`);
  gh(['run', 'download', `${runId}`, '-R', repo, '-n', artifact, '-D', target]);
  return JSON.parse(fs.readFileSync(path.join(target, file), 'utf8'));
}

/** Last week's summary from its newest unexpired artifact on main; null on the first run or after a missed week. */
function previousSummary({ start }) {
  const name = summaryArtifact({
    start: new Date(start - 7 * DAY_MS),
    end: start,
  });
  try {
    const { artifacts } = JSON.parse(
      gh(['api', `repos/${repo}/actions/artifacts?name=${name}`]),
    );
    const artifact = artifacts.find(
      ({ expired, workflow_run: run }) =>
        !expired && run?.head_branch === 'main',
    );
    return artifact
      ? readArtifactJson(artifact.workflow_run.id, name, 'summary.json')
      : null;
  } catch (error) {
    console.warn(`[baseline] ${error.stderr?.trim() || error.message}`);
    return null;
  }
}

async function main() {
  const env = process.env;
  if (!env.GH_TOKEN || !env.OUT_DIR) {
    throw new Error('GH_TOKEN or OUT_DIR is not set');
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
  // Dry runs name no artifact, so the workflow neither uploads a baseline nor posts.
  if (env.GITHUB_OUTPUT && env.DRY_RUN !== 'true') {
    fs.appendFileSync(
      env.GITHUB_OUTPUT,
      `artifact=${summaryArtifact(window)}\n`,
    );
  }
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
  console.log(message);
  const payload = {
    channel: SLACK_CHANNEL_ID,
    text: message,
    unfurl_links: false,
    unfurl_media: false,
  };
  fs.writeFileSync(
    path.join(env.OUT_DIR, 'slack-payload.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
