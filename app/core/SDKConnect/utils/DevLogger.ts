export const DevLogger = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...args: any[]) => {
    if (process.env.SDK_DEV === 'DEV') {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};

export default DevLogger;
