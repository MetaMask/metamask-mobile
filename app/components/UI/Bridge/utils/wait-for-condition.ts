/**
 * Waits for a condition to be true, doubling the wait time each time.
 * @param fn - The condition to wait for.
 * @param timeout - The maximum time to wait for the condition to be true.
 * @returns A promise that resolves when the condition is true.
 */
export const waitForCondition = async ({
  fn,
  timeout,
  initialWaitTime = 10,
}: {
  fn: () => boolean;
  timeout?: number;
  initialWaitTime?: number;
}) => {
  const startTime = Date.now();
  let waitTime = initialWaitTime;
  while (!fn()) {
    const currentWaitTime = waitTime;
    await new Promise((resolve) => setTimeout(resolve, currentWaitTime));
    waitTime *= 2;
    if (timeout && Date.now() - startTime > timeout) {
      throw new Error(`waitForCondition timed out after ${timeout}ms`);
    }
  }
};
