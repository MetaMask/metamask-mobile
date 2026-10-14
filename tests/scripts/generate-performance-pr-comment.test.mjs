import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'generate-performance-pr-comment.mjs',
);

const SUMMARY = {
  totalTests: 2,
  uniqueTests: 2,
  branch: 'feature-branch',
  commit: 'abcdef1234567890',
  buildType: 'E2E',
  platformDevices: { Android: ['Google Pixel 8 Pro+14.0'] },
  profilingStats: {
    testsWithProfiling: 2,
    profilingCoverage: '100.0%',
    avgCpuUsage: '10.80%',
    avgMemoryUsage: '698.10 MB',
    totalPerformanceIssues: 4,
    totalCriticalIssues: 1,
  },
  failedTestsStats: {
    uniqueFailedTests: 1,
    failedTestsByTeam: {
      '@performance-team': {
        team: { teamId: '@performance-team' },
        tests: [
          {
            testName: 'Cold Start Login',
            platform: 'Android',
            device: 'Google Pixel 8 Pro+14.0',
            failureReason: 'quality_gates_exceeded',
            sessionId: 'session-failed',
          },
        ],
      },
    },
  },
};

const PERFORMANCE_RESULTS = {
  Android: {
    'Google Pixel 8 Pro+14.0': [
      {
        testName: 'Cold Start Login',
        sessionId: 'session-failed',
        totalTime: 4.2,
        device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
        team: { teamId: '@performance-team' },
        qualityGates: { passed: false, hasThresholds: true },
      },
      {
        testName: 'Asset View',
        sessionId: 'session-passed',
        totalTime: 2.5,
        device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
        team: { teamId: '@assets-dev-team' },
        qualityGates: { passed: true, hasThresholds: true },
      },
    ],
  },
};

/**
 * Run the generator against a temporary aggregated-reports directory and
 * return the comment markdown it produced.
 */
function generateComment({ summary = SUMMARY, performanceResults } = {}) {
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-pr-comment-'));
  const reportsDir = path.join(workRoot, 'aggregated-reports');
  fs.mkdirSync(reportsDir);

  if (summary) {
    fs.writeFileSync(
      path.join(reportsDir, 'summary.json'),
      JSON.stringify(summary),
    );
  }

  if (performanceResults) {
    fs.writeFileSync(
      path.join(reportsDir, 'performance-results.json'),
      JSON.stringify(performanceResults),
    );
  }

  const outputFile = path.join(workRoot, 'comment.md');
  const result = spawnSync(
    process.execPath,
    [SCRIPT, path.join(reportsDir, 'summary.json'), outputFile],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        SKIP_APP_PROFILING_ENRICHMENT: 'true',
        GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
        GITHUB_RUN_ID: '123',
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  return fs.readFileSync(outputFile, 'utf8');
}

test('warns in the header and lists failed scenarios', () => {
  const md = generateComment({ performanceResults: PERFORMANCE_RESULTS });

  assert.match(md, /## ⚠️ Performance Test Results/);
  assert.match(md, /### ❌ Failed Tests \(1\)/);
  assert.match(md, /#### Cold Start Login/);
  assert.match(md, /Quality gates exceeded/);
});

test('lists passed scenarios with their duration', () => {
  const md = generateComment({ performanceResults: PERFORMANCE_RESULTS });

  assert.match(md, /✅ Passed Tests \(1\)/);
  assert.match(md, /\| Asset View \| Android \|.*\| 2\.50s \|/);
});

test('omits profiling blocks without a baseline', () => {
  const md = generateComment({ performanceResults: PERFORMANCE_RESULTS });

  assert.doesNotMatch(md, /App profiling check/);
  assert.doesNotMatch(md, /Full metric table/);
});

test('keeps profiling out of the passed scenarios section', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: { uniqueFailedTests: 0, failedTestsByTeam: {} },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 'session-passed',
            totalTime: 2.5,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            qualityGates: { passed: true, hasThresholds: true },
          },
        ],
      },
    },
  });

  assert.match(md, /## ⚡ Performance Test Results/);
  assert.match(md, /✅ Passed Tests \(1\)/);
  assert.doesNotMatch(md, /App profiling/);
});

test('writes a placeholder when the summary file is missing', () => {
  const md = generateComment({ summary: null });

  assert.match(md, /Performance test results are not available for this run/);
});

test('labels a failed scenario that never got a session', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: {
        uniqueFailedTests: 1,
        failedTestsByTeam: {
          '@assets-dev-team': {
            team: { teamId: '@assets-dev-team' },
            tests: [
              {
                testName: 'Asset View',
                platform: 'Android',
                device: 'Google Pixel 8 Pro+14.0',
                failureReason: 'session_creation_failed',
                sessionId: null,
              },
            ],
          },
        },
      },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: null,
            totalTime: 420,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            testFailed: true,
            failureReason: 'session_creation_failed',
          },
        ],
      },
    },
  });

  assert.match(md, /#### Asset View/);
  assert.match(md, /Session creation failed/);
});

test('flags a passed scenario that needed a retry after a session failure', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: { uniqueFailedTests: 0, failedTestsByTeam: {} },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 'session-retry',
            totalTime: 5.9,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            retryInfo: {
              attempts: 2,
              firstFailureReason: 'session_creation_failed',
              firstFailureDurationSec: 420.003,
            },
          },
        ],
      },
    },
  });

  assert.match(md, /✅ Passed Tests \(1\)/);
  assert.match(
    md,
    /\| Asset View ⚠️ passed on attempt 2; attempt 1: Session creation failed after 420s \|/,
  );
});

const TESTMU_VIDEO = (testId) =>
  `https://prod-mobile-artefacts.lambdatest.com/30d/orgId-3245013/2026/10/13/${testId}/video/video.mp4?verify=abc`;

test('adds a TestMu test link, built from the recording URL, next to the recording', () => {
  const [failedTest] = Object.values(
    SUMMARY.failedTestsStats.failedTestsByTeam,
  )[0].tests;
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: {
        uniqueFailedTests: 1,
        failedTestsByTeam: {
          '@performance-team': {
            team: { teamId: '@performance-team' },
            tests: [
              {
                ...failedTest,
                recordingLink: TESTMU_VIDEO('RMAA-AND-3245013-1791917903591921078WRR'),
              },
            ],
          },
        },
      },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Cold Start Login',
            sessionId: 'session-failed',
            videoURL: TESTMU_VIDEO('RMAA-AND-3245013-1791917903591921078WRR'),
            totalTime: 4.2,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@performance-team' },
            qualityGates: { passed: false, hasThresholds: true },
          },
          {
            testName: 'Asset View',
            sessionId: 'session-passed',
            videoURL: TESTMU_VIDEO('RMAA-AND-3245013-1791894232540457522DYM'),
            totalTime: 2.5,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            qualityGates: { passed: true, hasThresholds: true },
          },
        ],
      },
    },
  });

  assert.match(
    md,
    /\[📹 Watch\]\([^)]*RMAA-AND-3245013-1791894232540457522DYM[^)]*\) · \[TestMu\]\(https:\/\/appautomation\.lambdatest\.com\/test\?testID=RMAA-AND-3245013-1791894232540457522DYM\)/,
  );
  assert.match(
    md,
    /\[TestMu\]\(https:\/\/appautomation\.lambdatest\.com\/test\?testID=RMAA-AND-3245013-1791917903591921078WRR\)/,
  );
});

test('does not add a TestMu link when the recording is not a TestMu one', () => {
  const md = generateComment({
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 'bs-session',
            videoURL: 'https://video.test/bs.mp4',
            totalTime: 2.5,
            device: { name: 'Google Pixel 8 Pro', provider: 'browserstack' },
            team: { teamId: '@assets-dev-team' },
          },
        ],
      },
    },
  });

  assert.match(md, /\[📹 Watch\]\(https:\/\/video\.test\/bs\.mp4\)/);
  assert.doesNotMatch(md, /\[TestMu\]/);
});

test('prefers the public TestMu share link over the dashboard link', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: { uniqueFailedTests: 0, failedTestsByTeam: {} },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 'session-passed',
            videoURL: TESTMU_VIDEO('RMAA-AND-3245013-1791894232540457522DYM'),
            sessionShareUrl: 'https://appautomation.lambdatest.com/share/US_ABC',
            totalTime: 2.5,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
          },
        ],
      },
    },
  });

  assert.match(
    md,
    /\[TestMu\]\(https:\/\/appautomation\.lambdatest\.com\/share\/US_ABC\)/,
  );
  assert.doesNotMatch(md, /test\?testID=/);
});

test('shows app profiling and API requests for passed scenarios too', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: { uniqueFailedTests: 0, failedTestsByTeam: {} },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 'session-passed',
            totalTime: 2.5,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            profilingSummary: {
              cpu: { avg: 10, max: 20, unit: '%' },
              memory: { avg: 500, max: 600, unit: 'MB' },
            },
            apiCalls: [
              { method: 'GET', url: 'https://a.test/x?key=1', status: 200, time: 12 },
            ],
          },
        ],
      },
    },
  });

  assert.match(md, /📊 App profiling \(1\)/);
  assert.match(md, /\| Asset View \| Google Pixel 8 Pro \(v14\.0\) \| 10\.0 \/ 20\.0 %/);
  assert.match(md, /🌐 API requests \(1 scenarios, 1 calls\)/);
  assert.match(md, /\| GET \| `a\.test\/x` \| 1 \| 200 \| 12 ms \|/);
  assert.ok(md.length < 65000);
});

test('shows which element was not found instead of a generic reason', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: {
        uniqueFailedTests: 2,
        failedTestsByTeam: {
          '@metamask-mobile-platform': {
            team: { teamId: '@metamask-mobile-platform' },
            tests: [
              {
                testName: 'Measure Warm Start: Login To Wallet Screen',
                platform: 'Android',
                device: 'Google Pixel 8 Pro+14.0',
                failureReason: 'no_performance_metrics',
                failureMessage:
                  'element ("android=new UiSelector().resourceId("navbar-hamburger-menu-button")") still not displayed after 936ms',
                sessionId: null,
              },
              {
                testName: 'Other flow',
                platform: 'Android',
                device: 'Google Pixel 8 Pro+14.0',
                failureReason: 'failed',
                failureMessage: 'Expected element text "A" within 10000ms',
                sessionId: null,
              },
            ],
          },
        },
      },
    },
    performanceResults: null,
  });

  assert.match(md, /Element "navbar-hamburger-menu-button" not found/);
  assert.doesNotMatch(md, /no_performance_metrics/);
  assert.match(md, /Test error: Expected element text "A" within 10000ms/);
});

test('uses the failure message in the retry note too', () => {
  const md = generateComment({
    summary: {
      ...SUMMARY,
      failedTestsStats: { uniqueFailedTests: 0, failedTestsByTeam: {} },
    },
    performanceResults: {
      Android: {
        'Google Pixel 8 Pro+14.0': [
          {
            testName: 'Asset View',
            sessionId: 's',
            totalTime: 5,
            device: { name: 'Google Pixel 8 Pro', osVersion: '14.0' },
            team: { teamId: '@assets-dev-team' },
            retryInfo: {
              attempts: 2,
              firstFailureReason: 'no_performance_metrics',
              firstFailureMessage:
                'element ("~account-picker") still not displayed after 5ms',
              firstFailureDurationSec: 12,
            },
          },
        ],
      },
    },
  });

  assert.match(md, /attempt 1: Element "account-picker" not found after 12s/);
});
