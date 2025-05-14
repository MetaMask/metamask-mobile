/**
 * Delays the execution of a function by a specified amount of time.
 *
 * @param toggleFunction - The function to execute after the delay.
 * @param delay - The delay in milliseconds (default: 100ms).
 * @returns A function that, when called, will execute the provided function after the delay.
 */
const safePromiseHandler =
  (toggleFunction: () => void, delay: number = 100): (() => void) =>
  () =>
    setTimeout(toggleFunction, delay);

export default safePromiseHandler;
