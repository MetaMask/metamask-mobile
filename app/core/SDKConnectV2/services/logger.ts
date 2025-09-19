const prefix = '[SDKConnectV2]';

export default {
  debug: (...args: unknown[]) => {
    if (process.env.SDK_CONNECT_V2_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.debug(prefix, ...args);
    }
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(prefix, ...args);
  },
};
