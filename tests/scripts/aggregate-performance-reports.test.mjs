import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  aggregateReports,
  extractPlatformScenarioAndDevice,
} from './aggregate-performance-reports.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const makeReport = (testName, provider, overrides = {}) => [
  {
    testName,
    testFilePath: 'tests/performance/onboarding/import-wallet.spec.ts',
    tags: ['@Performance'],
    steps: [],
    total: 1000,
    testFailed: Boolean(overrides.testFailed),
    failureReason: overrides.failureReason,
    qualityGates: overrides.qualityGates || { passed: true, violations: [] },
    sessionId: overrides.sessionId || `${provider}-session`,
    device: {
      name: 'Google Pixel 7 Pro',
      osVersion: '13',
      provider,
    },
    cloudProvider: provider,
  },
];

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

test('extractPlatformScenarioAndDevice classifies Sauce Labs and BrowserStack artifacts separately', () => {
  assert.deepEqual(
    extractPlatformScenarioAndDevice(
      [
        'test-results',
        'saucelabs-android-onboarding-flow-test-results-Google_Pixel_7_POC49',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Create_wallet-Google_Pixel_7_POC49-.json',
      ].join('/'),
    ),
    {
      platform: 'android',
      platformKey: 'Android',
      scenario: 'onboarding',
      scenarioKey: 'Onboarding',
      deviceKey: 'Google_Pixel_7_POC49',
      cloudProvider: 'saucelabs',
    },
  );

  assert.deepEqual(
    extractPlatformScenarioAndDevice(
      [
        'test-results',
        'android-imported-wallet-test-results-Google Pixel 7 Pro-13',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Import_wallet-Google_Pixel_7_Pro-13.json',
      ].join('/'),
    ),
    {
      platform: 'android',
      platformKey: 'Android',
      scenario: 'imported-wallet',
      scenarioKey: 'ImportedWallet',
      deviceKey: 'Google Pixel 7 Pro+13',
      cloudProvider: 'browserstack',
    },
  );
});

test('aggregateReports keeps Sauce Labs and BrowserStack results in separate provider buckets', () => {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-agg-'));

  try {
    process.chdir(tempDir);

    writeJson(
      path.join(
        'test-results',
        'saucelabs-android-imported-wallet-test-results-Google_Pixel_7_POC49',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Import_wallet-sauce.json',
      ),
      makeReport('Import wallet', 'saucelabs', {
        testFailed: true,
        failureReason: 'quality_gate',
        qualityGates: {
          passed: false,
          violations: [{ metric: 'total', actual: 90000, threshold: 60000 }],
        },
      }),
    );

    writeJson(
      path.join(
        'test-results',
        'android-imported-wallet-test-results-Google Pixel 7 Pro-13',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Import_wallet-bs.json',
      ),
      makeReport('Import wallet', 'browserstack'),
    );

    aggregateReports();

    const summary = JSON.parse(
      fs.readFileSync(
        path.join('tests', 'aggregated-reports', 'summary.json'),
        'utf8',
      ),
    );

    assert.deepEqual(Object.keys(summary.providerResults).sort(), [
      'browserstack',
      'saucelabs',
    ]);
    assert.equal(summary.providerResults.saucelabs.failedTests, 1);
    assert.equal(summary.providerResults.browserstack.passedTests, 1);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('workflow still downloads all *-test-results-* artifacts including Sauce Labs', () => {
  const workflow = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '.github',
      'workflows',
      'run-performance-e2e.yml',
    ),
    'utf8',
  );
  assert.match(workflow, /pattern:\s+['"]?\*-test-results-\*['"]?/);
  assert.match(workflow, /performance-test-runner-saucelabs\.yml/);
});
