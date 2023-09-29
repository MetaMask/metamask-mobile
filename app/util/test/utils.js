//eslint-disable-next-line import/prefer-default-export
export const flushPromises = () => new Promise(setImmediate);

export const testConfig = {
  jestWorkerId: 0,
};

export const isTest =
  process.env.IS_TEST === 'true' &&
  process.env.METAMASK_ENVIRONMENT !== 'production';

export const getServerPort = (defaultPort) =>
  defaultPort + parseInt(testConfig.jestWorkerId, 10);
