export const flushPromises = () => new Promise(setImmediate);

export const FIXTURE_SERVER_PORT = 12345;

// E2E test configuration required in app
interface TestConfig {
  fixtureServerPort?: number;
}

export const testConfig: TestConfig = {};

/**
 * TODO: Update this condition once we change E2E builds to use release instead of debug
 */
// DEVIN_TODO: Define type for process.env.METAMASK_ENVIRONMENT
export const isTest = process.env.METAMASK_ENVIRONMENT !== 'production';
// DEVIN_TODO: Define type for process.env.IS_TEST
export const isE2E = process.env.IS_TEST === 'true';
export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FIXTURE_SERVER_PORT;
