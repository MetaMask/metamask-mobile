export const DevLogger = {
  log: (...args: any[]) => {
    if (process.env.SDK_DEV === 'DEV') {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};

export default DevLogger;
