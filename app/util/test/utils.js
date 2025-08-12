export const flushPromises = () => new Promise(setImmediate);

export const FIXTURE_SERVER_PORT = 12345;

// E2E test configuration required in app
export const testConfig = {};

// SEGMENT TRACK URL for E2E tests - this is not a real URL and is used for testing purposes only
export const E2E_METAMETRICS_TRACK_URL = 'https://metametrics.test/track';

/**
 * TODO: Update this condition once we change E2E builds to use release instead of debug
 */
export const isTest = process.env.METAMASK_ENVIRONMENT !== 'production' && process.env.METAMASK_ENVIRONMENT !== 'pre-release' && process.env.METAMASK_ENVIRONMENT !== 'beta' && process.env.METAMASK_ENVIRONMENT !== 'rc';
export const isE2E = process.env.IS_TEST === 'true';
export const enableApiCallLogs = process.env.LOG_API_CALLS === 'true';
export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FIXTURE_SERVER_PORT;
