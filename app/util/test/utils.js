export const flushPromises = () => new Promise(setImmediate);

export const testConfig = {
  fixtureServerPort: 12345,
};

export const isTest =
  process.env.IS_TEST === 'true' &&
  process.env.METAMASK_ENVIRONMENT !== 'production';

export const getFixturesServerPort = () => testConfig.fixtureServerPort;
