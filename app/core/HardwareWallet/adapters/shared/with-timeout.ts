/**
 * Add a timeout to an async operation.
 *
 * If `onTimeout` is provided, it is awaited after the timeout fires so the
 * caller can do cleanup (e.g., close the session or transport). The timer is
 * cleared as soon as the main promise settles (success or failure).
 *
 * Shared by the Ledger BLE adapters (legacy transport + DMK).
 *
 * @typeParam T - The value the guarded promise resolves to.
 * @param promise - The promise to guard with a timeout.
 * @param timeoutMs - Milliseconds to wait before rejecting with a timeout error.
 * @param errorMessage - Message for the timeout error (name is set to
 * `LedgerTimeoutError`).
 * @param onTimeout - Optional cleanup callback invoked (and awaited) only when
 * the timeout fires.
 * @returns The resolved value of `promise`, or rejects with a timeout error.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  onTimeout?: () => void | Promise<void>,
): Promise<T> {
  const timeoutError = new Error(errorMessage);
  timeoutError.name = 'LedgerTimeoutError';

  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(timeoutError);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (!timedOut || !onTimeout) {
      return;
    }

    return Promise.resolve(onTimeout()).catch(() => undefined);
  });
}
