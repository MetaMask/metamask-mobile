#!/usr/bin/env node

/**
 * Plain-text body of the performance Slack message.
 * The shell wrapper JSON-escapes it for the workflow payload.
 *
 * Failure lines use describeReportedFailure, the same text as the PR
 * comment's Reason column.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describeReportedFailure } from './perf-comment-details.mjs';

/**
 * @param {object} summary
 * @param {{ runIncomplete?: boolean, runUrl?: string }} options
 */
export function buildSlackMessage(summary, options = {}) {
  // uniqueTests and the failed rows are both keyed by test + platform + device,
  // so a test that fails on two platforms counts twice in each.
  const total = summary.uniqueTests ?? summary.totalTests ?? 0;
  const failed = Object.values(summary.failedTestsStats?.failedTestsByTeam ?? {})
    .flatMap((team) => team.tests ?? [])
    .sort((left, right) =>
      `${left.testName}\0${left.platform ?? ''}`.localeCompare(
        `${right.testName}\0${right.platform ?? ''}`,
      ),
    );

  const lines = options.runIncomplete
    ? [
        '⚠️ Performance E2E: a test job failed before its results were recorded',
      ]
    : failed.length === 0
      ? [`:white_check_mark: Performance E2E: all ${total} tests passed`]
      : [
          `*Performance E2E: ${failed.length} of ${total} tests failed*`,
          ...failed.map((test) => {
            const reason = describeReportedFailure(test).replaceAll(
              '<br>',
              '; ',
            );
            const recording = test.recordingLink
              ? ` — <${test.recordingLink}|TestMu>`
              : '';
            return `• *${test.testName}* — ${reason}${recording}`;
          }),
        ];

  if (options.runUrl) {
    lines.push('', `<${options.runUrl}|View full results>`);
  }
  return lines.join('\n');
}

/** True when a performance test job failed without leaving failed-test rows. */
export async function performanceJobFailed(env = process.env) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID } = env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) {
    return false;
  }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    if (!response.ok) {
      return false;
    }
    const body = await response.json();
    return (body.jobs ?? []).some(
      (job) =>
        job.conclusion === 'failure' && /Performance Test|HyperExecute/i.test(job.name ?? ''),
    );
  } catch {
    return false;
  }
}

async function main() {
  const summaryFile = process.argv[2] || 'aggregated-reports/summary.json';

  if (!fs.existsSync(summaryFile)) {
    process.stdout.write('⚠️ Performance E2E: no test results available');
    process.exit(0);
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  const failed = Object.values(
    summary.failedTestsStats?.failedTestsByTeam ?? {},
  ).flatMap((team) => team.tests ?? []);
  const runUrl =
    process.env.GITHUB_SERVER_URL &&
    process.env.GITHUB_REPOSITORY &&
    process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '';
  const runIncomplete = failed.length === 0 && (await performanceJobFailed());
  process.stdout.write(
    buildSlackMessage(summary, { runIncomplete, runUrl }),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
