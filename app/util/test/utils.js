/* global globalThis */

export const flushPromises = () => new Promise(setImmediate);

// Fallback ports - used in fixture data and when LaunchArgs are unavailable
// Android: These are mapped to actual PortManager-allocated ports via adb reverse
// iOS: These are overridden by LaunchArgs at runtime
export const FALLBACK_FIXTURE_SERVER_PORT = 12345;
export const FALLBACK_COMMAND_QUEUE_SERVER_PORT = 2446;
export const E2E_TEST_CONFIG_GLOBAL_KEY = '__METAMASK_E2E_TEST_CONFIG__';

// E2E test configuration required in app. Metro/RN can evaluate this module
// through more than one path during startup, so keep the backing object on
// globalThis and make every module instance share the same runtime config.
if (!globalThis[E2E_TEST_CONFIG_GLOBAL_KEY]) {
  globalThis[E2E_TEST_CONFIG_GLOBAL_KEY] = {};
}
export const testConfig = globalThis[E2E_TEST_CONFIG_GLOBAL_KEY];

// SEGMENT TRACK URL for E2E tests - this is not a real URL and is used for testing purposes only
export const E2E_METAMETRICS_TRACK_URL = 'https://metametrics.test/track';

/**
 * Used to enable features on testing environments: dev, test, and e2e.
 */
export const isTestEnvironment =
  process.env.METAMASK_ENVIRONMENT === 'dev' ||
  process.env.METAMASK_ENVIRONMENT === 'test' ||
  process.env.METAMASK_ENVIRONMENT === 'e2e';
// Keep this narrower than isTestEnvironment: this intentionally excludes
// dev/test and preserves the previous e2e/exp-only behavior.
export const isE2EOrExpEnvironment =
  process.env.METAMASK_ENVIRONMENT === 'e2e' ||
  process.env.METAMASK_ENVIRONMENT === 'exp';
// IS_PERFORMANCE_TEST opts out of E2E runtime overhead (ReadOnlyNetworkStore,
// command polling) while keeping METAMASK_ENVIRONMENT='e2e' so the build still
// works on feature branches with e2e signing/secrets.
export const hasTestOverrides =
  process.env.IS_PERFORMANCE_TEST !== 'true' &&
  process.env.HAS_TEST_OVERRIDES === 'true';
export const enableApiCallLogs = process.env.LOG_API_CALLS === 'true';
export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FALLBACK_FIXTURE_SERVER_PORT;
export const getCommandQueueServerPortInApp = () =>
  testConfig.commandQueueServerPort ?? FALLBACK_COMMAND_QUEUE_SERVER_PORT;

export const isRc = process.env.METAMASK_ENVIRONMENT === 'rc';
