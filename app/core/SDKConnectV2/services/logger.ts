const prefix = '[SDKConnectV2]';

export default {
  debug: (...args: unknown[]) => {
    if (process.env.SDK_CONNECT_V2_DEBUG === 'true') {
      console.debug(prefix, ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(prefix, ...args);
  },
};
