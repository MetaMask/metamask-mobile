const prefix = '[SDKConnectV2]';

const prettify = (...args: unknown[]) =>
  args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');

export default {
  debug: (...args: unknown[]) => {
    if (process.env.SDK_CONNECT_V2_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.debug(prettify(prefix, ...args));
    }
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(prettify(prefix, ...args));
  },
};
