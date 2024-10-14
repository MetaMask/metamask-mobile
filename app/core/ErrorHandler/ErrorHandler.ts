export const handleCustomError = (error: Error, isFatal: boolean) => {
  try {
    // global.ExceptionsManager.handleExceptions(error, isFatal);
    console.warn('Custom error handler: ', error, isFatal);
  } catch (ee) {
    console.error('Failed to print error: ', (ee as Error).message);
    throw ee;
  }
};
