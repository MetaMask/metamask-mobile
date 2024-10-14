
export const handleCustomError = (error: Error, isFatal: boolean) => {
  console.error('Custom error handler: ', error, isFatal);
  // try {

    console.warn('Custom error handler: ', error, isFatal);
  // } catch (ee) {
  //   console.error('Failed to print error: ', ee.message);
  //   throw ee;
  // }
};
