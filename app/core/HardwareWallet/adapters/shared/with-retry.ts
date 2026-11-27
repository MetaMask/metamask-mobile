import { MAX_DISCONNECT_RETRIES, RETRY_DELAY_MS } from './ledger-constants';

/**
 * Options for {@link withTransientRetry}.
 */
export interface WithTransientRetryOptions {
  /** Whether the failure is transient and therefore worth retrying. */
  isTransient: (error: unknown) => boolean;
  /**
   * Called after a transient failure, before the retry delay. Use it for the
   * per-attempt work each adapter needs (closing a transport, dropping a lost
   * session, logging).
   */
  onRetry?: (error: unknown, attempt: number) => void | Promise<void>;
  /** Total attempts, including the first one. Defaults to `MAX_DISCONNECT_RETRIES`. */
  maxAttempts?: number;
  /** Delay between attempts. Defaults to `RETRY_DELAY_MS`. */
  delayMs?: number;
}

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs `operation`, retrying it while the failure is transient.
 *
 * Implemented recursively rather than as a loop because retries are
 * inherently sequential: each one waits for the previous attempt to settle
 * and for the backoff delay. Shared by the Ledger BLE adapters (legacy
 * transport + DMK) so retry semantics stay in sync.
 *
 * @param operation - The operation to run once per attempt.
 * @param options - Retry policy and per-attempt hook.
 * @param attempt - Current attempt (1-based); only set on recursion.
 * @returns The value of the first successful attempt.
 * @throws The last error when it is not transient or attempts are exhausted.
 */
export async function withTransientRetry<TResult>(
  operation: () => Promise<TResult>,
  {
    isTransient,
    onRetry,
    maxAttempts = MAX_DISCONNECT_RETRIES,
    delayMs = RETRY_DELAY_MS,
  }: WithTransientRetryOptions,
  attempt = 1,
): Promise<TResult> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransient(error) || attempt >= maxAttempts) {
      throw error;
    }

    await onRetry?.(error, attempt);
    await delay(delayMs);

    return withTransientRetry(
      operation,
      { isTransient, onRetry, maxAttempts, delayMs },
      attempt + 1,
    );
  }
}
