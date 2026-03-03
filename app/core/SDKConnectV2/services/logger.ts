const prefix = '[SDKConnectV2]';

const prettify = (...args: unknown[]) =>
  args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');

/**
 * Redacts query and fragment parameters from a URL to prevent
 * leaking sensitive connection parameters (channel ID, public key)
 * in logs.
 */
export const redactUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}?[REDACTED]`;
  } catch {
    return '[invalid URL]';
  }
};

export default {
  debug: (...args: unknown[]) => {
    if (process.env.SDK_CONNECT_V2_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.debug(prettify(prefix, ...args));
    }
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(prefix, ...args);
  },
};
