/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

// View tests are integration-level and exercise the real production code path
// for the feature under test. Some app-level feature gates are guarded by
// build-time env vars that babel inlines at compile time
// (`babel-plugin-transform-inline-environment-variables` in babel.config.js),
// so `process.env.X` reads in app code are substituted with whatever value the
// var has when babel runs — runtime mutation from `mocks.ts` or
// `setupFilesAfterEnv` is too late. Setting `HAS_TEST_OVERRIDES=true` here, at
// config-load time before babel compiles any test file, opts view tests into
// the same `hasTestOverrides` shortcut smoke tests already use; this avoids mocking the
// guarded config module (forbidden in CV).
//
// TODO: remove this once `app/util/notifications/constants/config.ts:
// isNotificationsFeatureEnabled` (and any future similar gate) is refactored
// to drop its `process.env.MM_NOTIFICATIONS_UI_ENABLED` dependency in favour
// of a single state-driven (`RemoteFeatureFlagController`) check — at which
// point view tests can seed the flag through Redux state like every other
// feature already does.
process.env.HAS_TEST_OVERRIDES = 'true';

// The Predict Order Flow transport bakes its base URL at first compile via
// babel's inline-environment-variables plugin. Provide a deterministic origin
// for every run (CI included); component-view tests stub global fetch.
process.env.MM_PREDICT_API_URL =
  process.env.MM_PREDICT_API_URL || 'https://predict.api.test';

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetupView.js'],
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter(
    (pattern) => !pattern.includes('view'),
  ),
  testMatch: ['**/*.view.test.ts?(x)'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: 2,
  workerIdleMemoryLimit: '3GB',
};
