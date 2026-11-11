import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPlatformScenarioAndDevice,
  labelTestMuDeviceKey,
} from './aggregate-performance-reports.mjs';

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

test('flattened TestMu JSON stays distinct from the BrowserStack device key', () => {
  const deviceKey = labelTestMuDeviceKey('Google Pixel 8 Pro+14.0', {
    filePath:
      'test-results/performance-metrics-login-Google_Pixel_8_Pro-14.0-testmu.json',
    provider: 'testmu',
  });

  assert.equal(deviceKey, 'Google Pixel 8 Pro (TestMu HE)+14.0');
});

test('BrowserStack JSON keeps the unlabeled device key', () => {
  const deviceKey = labelTestMuDeviceKey('Google Pixel 8 Pro+14.0', {
    filePath:
      'test-results/performance-metrics-login-Google_Pixel_8_Pro-14.0.json',
    provider: 'browserstack',
  });

  assert.equal(deviceKey, 'Google Pixel 8 Pro+14.0');
});
