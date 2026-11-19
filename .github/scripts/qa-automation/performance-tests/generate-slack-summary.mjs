#!/usr/bin/env node

/**
 * Plain-text body of the performance Slack message.
 * The shell wrapper JSON-escapes it for the workflow payload.
 *
 * Failure lines use describeReportedFailure, the same text as the PR
 * comment's Reason column.
 */

import fs from 'fs';
import { describeReportedFailure } from './perf-comment-details.mjs';

const summaryFile = process.argv[2] || 'aggregated-reports/summary.json';

if (!fs.existsSync(summaryFile)) {
  process.stdout.write('⚠️ Performance E2E: no test results available');
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
const total = summary.uniqueTests ?? summary.totalTests ?? 0;
const failed = Object.values(summary.failedTestsStats?.failedTestsByTeam ?? {})
  .flatMap((team) => team.tests ?? [])
  .sort((left, right) =>
    `${left.testName}\0${left.platform ?? ''}`.localeCompare(
      `${right.testName}\0${right.platform ?? ''}`,
    ),
  );

const lines =
  failed.length === 0
    ? [`:white_check_mark: Performance E2E: all ${total} tests passed`]
    : [
        `*Performance E2E: ${failed.length} of ${total} tests failed*`,
        ...failed.map((test) => {
          const reason = describeReportedFailure(test).replaceAll('<br>', '; ');
          const recording = test.recordingLink
            ? ` — <${test.recordingLink}|TestMu>`
            : '';
          return `• *${test.testName}* — ${reason}${recording}`;
        }),
      ];

const runUrl =
  process.env.GITHUB_SERVER_URL &&
  process.env.GITHUB_REPOSITORY &&
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '';
if (runUrl) {
  lines.push('', `<${runUrl}|View full results>`);
}

process.stdout.write(lines.join('\n'));
