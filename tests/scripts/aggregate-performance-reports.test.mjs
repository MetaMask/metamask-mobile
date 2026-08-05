import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  aggregateReports,
  extractPlatformScenarioAndDevice,
} from './aggregate-performance-reports.mjs';

const makeReport = (testName, provider) => [
  {
    testName,
    testFilePath: 'tests/performance/onboarding/import-wallet.spec.ts',
    tags: ['@Performance'],
    steps: [],
    total: 1000,
    testFailed: false,
    device: {
      name: 'Google Pixel 7 Pro',
      osVersion: '13',
      provider,
    },
  },
];

const writeJson = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

test('extractPlatformScenarioAndDevice classifies Standard, HyperExecute, and BrowserStack artifacts separately', () => {
  assert.deepEqual(
    extractPlatformScenarioAndDevice(
      [
        'test-results',
        'testmu-standard-android-onboarding-flow-test-results-Google Pixel 7 Pro-13',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Create_wallet-Google_Pixel_7_Pro-13.json',
      ].join('/'),
    ),
    {
      platform: 'android',
      platformKey: 'Android',
      scenario: 'onboarding',
      scenarioKey: 'Onboarding',
      deviceKey: 'Google Pixel 7 Pro+13',
      cloudProvider: 'testmu-standard',
    },
  );

  assert.deepEqual(
    extractPlatformScenarioAndDevice(
      [
        'test-results',
        'testmu-android-imported-wallet-test-results-Google Pixel 7 Pro-13',
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
      cloudProvider: 'testmu-hyperexecute',
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

test('aggregateReports keeps Standard and HyperExecute provider identities in final JSON', () => {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aggregate-performance-reports-'),
  );

  try {
    process.chdir(tempDir);

    writeJson(
      path.join(
        tempDir,
        'test-results',
        'testmu-standard-android-imported-wallet-test-results-Google Pixel 7 Pro-13',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Import_wallet-Google_Pixel_7_Pro-13.json',
      ),
      makeReport('Import wallet via TestMu Standard', 'testmu'),
    );

    writeJson(
      path.join(
        tempDir,
        'test-results',
        'testmu-android-imported-wallet-test-results-Google Pixel 7 Pro-13',
        'tests',
        'reporters',
        'reports',
        'performance-metrics-Import_wallet-Google_Pixel_7_Pro-13.json',
      ),
      makeReport('Import wallet via TestMu HyperExecute', 'testmu'),
    );

    aggregateReports();

    const aggregated = JSON.parse(
      fs.readFileSync(
        path.join(
          tempDir,
          'tests',
          'aggregated-reports',
          'performance-results.json',
        ),
        'utf8',
      ),
    );
    const reports = aggregated.Android['Google Pixel 7 Pro+13'];

    assert.equal(reports.length, 2);
    assert.deepEqual(
      reports.map((report) => report.cloudProvider).sort(),
      ['testmu-hyperexecute', 'testmu-standard'],
    );
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('aggregate workflow preserves artifact directories for provider classification', () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'run-performance-e2e.yml'),
    'utf8',
  );

  assert.match(workflow, /pattern:\s+['"]?\*-test-results-\*['"]?/);
  assert.match(workflow, /merge-multiple:\s+false/);
});
