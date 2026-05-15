/* global globalThis */

export const flushPromises = () => new Promise(setImmediate);

// Fallback ports - used in fixture data and when LaunchArgs are unavailable
// Android: These are mapped to actual PortManager-allocated ports via adb reverse
// iOS: These are overridden by LaunchArgs at runtime
export const FALLBACK_FIXTURE_SERVER_PORT = 12345;
export const FALLBACK_COMMAND_QUEUE_SERVER_PORT = 2446;
export const E2E_TEST_CONFIG_GLOBAL_KEY = '__METAMASK_E2E_TEST_CONFIG__';
export const E2E_DIAGNOSTICS_ENDPOINT = '/e2e-diagnostics';

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
 * Returns true if the build type or environment is QA or if the environment is e2e
 * TODO: For the most part, this is meant for e2e testing. Check if this condition is truly needed for QA or if we can consolidate it to check for E2E environment.
 */
export const isQa =
  process.env.METAMASK_BUILD_TYPE === 'qa' ||
  process.env.METAMASK_ENVIRONMENT === 'qa' ||
  process.env.METAMASK_ENVIRONMENT === 'e2e' ||
  process.env.METAMASK_ENVIRONMENT === 'exp';
/**
 * TODO: Update this condition once we change E2E builds to use release instead of debug
 */
export const isTest =
  process.env.METAMASK_ENVIRONMENT !== 'production' &&
  process.env.METAMASK_ENVIRONMENT !== 'pre-release' &&
  process.env.METAMASK_ENVIRONMENT !== 'beta' &&
  process.env.METAMASK_ENVIRONMENT !== 'rc' &&
  process.env.METAMASK_ENVIRONMENT !== 'exp';
// IS_PERFORMANCE_TEST opts out of E2E runtime overhead (ReadOnlyNetworkStore,
// command polling) while keeping METAMASK_ENVIRONMENT='e2e' so the build still
// works on feature branches with e2e signing/secrets.
export const isE2E =
  process.env.IS_PERFORMANCE_TEST !== 'true' &&
  (process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e');
export const enableApiCallLogs = process.env.LOG_API_CALLS === 'true';
export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FALLBACK_FIXTURE_SERVER_PORT;
export const getCommandQueueServerPortInApp = () =>
  testConfig.commandQueueServerPort ?? FALLBACK_COMMAND_QUEUE_SERVER_PORT;

const formatE2EDiagnosticValue = (value) => {
  if (value === undefined) {
    return 'missing';
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
};

export const getE2ETestConfigDiagnostics = (extra = {}) => ({
  source: extra.source ?? 'unknown',
  phase: extra.phase ?? 'unknown',
  platform: extra.platform ?? 'unknown',
  fixtureServerPortInApp: getFixturesServerPortInApp(),
  commandQueueServerPortInApp: getCommandQueueServerPortInApp(),
  fixtureServerPortRaw: formatE2EDiagnosticValue(
    testConfig.rawFixtureServerPort,
  ),
  commandQueueServerPortRaw: formatE2EDiagnosticValue(
    testConfig.rawCommandQueueServerPort,
  ),
  mockServerPortRaw: formatE2EDiagnosticValue(testConfig.rawMockServerPort),
  hasGlobalE2EConfig:
    globalThis[E2E_TEST_CONFIG_GLOBAL_KEY] === testConfig ? 'true' : 'false',
  configKeys: Object.keys(testConfig).sort().join(',') || 'none',
  launchArgumentKeys: Array.isArray(testConfig.launchArgumentKeys)
    ? testConfig.launchArgumentKeys.join(',')
    : 'missing',
  ...extra,
});

export const appendE2EDiagnosticsToUrl = (url, diagnostics) => {
  const nextUrl = new URL(url);
  Object.entries(diagnostics).forEach(([key, value]) => {
    nextUrl.searchParams.set(`e2e_${key}`, formatE2EDiagnosticValue(value));
  });
  return nextUrl.toString();
};

export const isRc = process.env.METAMASK_ENVIRONMENT === 'rc';
