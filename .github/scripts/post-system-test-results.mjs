#!/usr/bin/env node

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const {
  GITHUB_SERVER_URL = 'https://github.com',
  GITHUB_REPOSITORY = '',
  GITHUB_RUN_ID = '',
  GITHUB_REF_NAME = '',
  GITHUB_EVENT_NAME = '',
  METAMASK_VERSION = '',
  JOB_STATUS_ANDROID_LOGIN = '',
  JOB_STATUS_ANDROID_ONBOARDING = '',
  JOB_STATUS_IOS_LOGIN = '',
  JOB_STATUS_IOS_ONBOARDING = '',
} = process.env;

const reportsPath = process.argv[2] || 'all-reports';
const visualPath = process.argv[3] || 'all-visual-reports';

const results = JSON.parse(
  execFileSync(
    'node',
    ['.github/scripts/format-system-test-results.mjs', reportsPath, visualPath],
    { encoding: 'utf-8' },
  ),
);

const jobStatuses = [
  JOB_STATUS_ANDROID_LOGIN,
  JOB_STATUS_ANDROID_ONBOARDING,
  JOB_STATUS_IOS_LOGIN,
  JOB_STATUS_IOS_ONBOARDING,
].filter(Boolean);
const anyJobFailed = jobStatuses.some((s) => s === 'failure');
const noResults = results.total === 0;
const allPassed = !noResults && results.failed === 0 && !anyJobFailed;
const hasFailed = results.failed > 0 || anyJobFailed;
const emoji = hasFailed ? ':x:' : noResults ? ':warning:' : ':white_check_mark:';
const status = hasFailed ? 'Failed' : noResults ? 'Not Run' : 'Passed';
const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;

const blocks = [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${allPassed ? '✅' : '❌'} Mobile Nightly System Tests Run ${status}`,
    },
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: [
          METAMASK_VERSION && `MetaMask Version: ${METAMASK_VERSION}`,
          `Triggered: ${GITHUB_EVENT_NAME}`,
          `Branch: ${GITHUB_REF_NAME}`,
        ]
          .filter(Boolean)
          .join(' | '),
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Summary:* ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`,
    },
  },
  {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `<${runUrl}|View test results>` }],
  },
];

if (results.failedTests.length > 0) {
  let list = '*Failed Tests:*\n';

  for (const t of results.failedTests.slice(0, 15)) {
    list += `:x: [${t.platform}] \`${t.specFile}\` — ${t.testName}\n`;
  }

  if (results.failedTests.length > 15) {
    list += `_...and ${results.failedTests.length - 15} more failures_\n`;
  }

  blocks.push({ type: 'section', text: { type: 'mrkdwn', text: list } });
}

if (results.hasVisualFailures) {
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `:warning: Some AI visual regression checks failed — <${runUrl}#artifacts|review visual artifacts>`,
      },
    ],
  });
}

const payload = {
  text: `${emoji} Mobile Nightly System Tests Run ${status}`,
  blocks,
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slack-payload-'));
const payloadPath = path.join(tempDir, 'slack-payload.json');
const payloadJson = JSON.stringify(payload, null, 2);
fs.writeFileSync(payloadPath, payloadJson);
console.error(payloadJson);
console.log(payloadPath);
