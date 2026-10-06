import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPlatformScenarioAndDevice } from './aggregate-performance-reports.mjs';

test('BrowserStack artifact names keep the existing device key', () => {
  const result = extractPlatformScenarioAndDevice(
    'test-results/android-onboarding-flow-test-results-Google Pixel 8 Pro-14.0/performance-metrics.json',
  );

  assert.equal(result.platformKey, 'Android');
  assert.equal(result.scenarioKey, 'Onboarding');
  assert.equal(result.deviceKey, 'Google Pixel 8 Pro+14.0');
});

test('TestMu HyperExecute artifact names stay distinct from BrowserStack', () => {
  const result = extractPlatformScenarioAndDevice(
    'test-results/testmu-he-android-imported-wallet-test-results-Google Pixel 8 Pro-14.0/performance-metrics.json',
  );

  assert.equal(result.platformKey, 'Android');
  assert.equal(result.scenarioKey, 'ImportedWallet');
  assert.equal(result.deviceKey, 'Google Pixel 8 Pro (TestMu HE)+14.0');
});
