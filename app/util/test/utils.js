//eslint-disable-next-line import/prefer-default-export
export const flushPromises = () => new Promise(setImmediate);

export const isTest =
  process.env.IS_TEST === 'true' &&
  process.env.METAMASK_ENVIRONMENT !== 'production';
