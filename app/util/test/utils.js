//eslint-disable-next-line import/prefer-default-export
export const flushPromises = () => new Promise(setImmediate);

export const testConfig = {
  jestWorkerId: 0,
};

export const isTest =
  process.env.IS_TEST === 'true' &&
  process.env.METAMASK_ENVIRONMENT !== 'production';

export const getServerPort = (defaultPort) => {
  // const test = process.jestWorkerId;
  console.log('>>>>>>>>>> here: ', testConfig.jestWorkerId)
  if (testConfig.jestWorkerId) {
  console.log('>>>>>>>>>> new port: ', defaultPort + parseInt(testConfig.jestWorkerId, 10))
    return defaultPort + parseInt(testConfig.jestWorkerId, 10);
  }
  return defaultPort;
};
