/**
 * GitHub Actions entrypoint for swaps-cpu-profile-report.mjs. Downloads each
 * scheduled run's artifacts with `gh run download` (needs GH_TOKEN), posts
 * the report, and writes the weekly summary to `$OUT_DIR/summary.json`.
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
  buildSlackMessage,
  failedTestNames,
  lastWeek,
  scenarioSample,
  summarizeScenario,
} from './swaps-cpu-profile-report.mjs';

async function listRuns(repo, token, { start, end }) {
  const params = new URLSearchParams({
    event: 'schedule',
    branch: 'main',
    status: 'success',
    created: `${start.toISOString()}..${end.toISOString()}`,
    per_page: '100',
  });
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${PERFORMANCE_WORKFLOW}/runs?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub workflow runs API HTTP ${response.status}`);
  }
  return (await response.json()).workflow_runs.map((run) => run.id);
}

function readArtifactJson(repo, runId, artifact, file, directory) {
  const target = path.join(directory, `${runId}-${artifact}`);
  execFileSync(
    'gh',
    [
      'run',
      'download',
      String(runId),
      '-R',
      repo,
      '-n',
      artifact,
      '-D',
      target,
    ],
    {
      stdio: 'ignore',
    },
  );
  return JSON.parse(fs.readFileSync(path.join(target, file), 'utf8'));
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
  const repo = env.GITHUB_REPOSITORY || 'MetaMask/metamask-mobile';
  if (!env.GH_TOKEN) {
    throw new Error('GH_TOKEN is not set');
  }
  if (!dryRun && !env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is not set (or run with DRY_RUN=true)');
  }

  const window = lastWeek();
  const runIds = await listRuns(repo, env.GH_TOKEN, window);
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'swaps-cpu-profile-'),
  );
  const samples = SCENARIOS.map(() => []);
  let runsRead = 0;
  for (const runId of runIds) {
    try {
      const report = readArtifactJson(
        repo,
        runId,
        'app-profiling-analysis',
        'report.json',
        directory,
      );
      const summary = readArtifactJson(
        repo,
        runId,
        'aggregated-reports',
        'summary.json',
        directory,
      );
      const failed = failedTestNames(summary);
      SCENARIOS.forEach((scenario, index) =>
        samples[index].push(scenarioSample(report, failed, scenario)),
      );
      runsRead += 1;
    } catch (error) {
      console.error(`[skip] run ${runId}: ${error.message}`);
    }
  }
  fs.rmSync(directory, { recursive: true, force: true });

  const scenarios = SCENARIOS.map((scenario, index) => ({
    ...scenario,
    summary: summarizeScenario(samples[index]),
  }));
  if (env.OUT_DIR) {
    fs.mkdirSync(env.OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(env.OUT_DIR, 'summary.json'),
      `${JSON.stringify({ window, runIds, runsRead, scenarios }, null, 2)}\n`,
    );
  }
  const message = buildSlackMessage(scenarios, {
    window,
    runsRead,
    runsFound: runIds.length,
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
