export const flushPromises = () => new Promise(setImmediate);

export const FIXTURE_SERVER_PORT = 12345;

// E2E test configuration required in app
export const testConfig = {};

export const isTest =
  process.env.IS_TEST === 'true' &&
  process.env.METAMASK_ENVIRONMENT !== 'production';

export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FIXTURE_SERVER_PORT;
