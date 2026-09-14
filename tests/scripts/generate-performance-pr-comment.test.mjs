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
