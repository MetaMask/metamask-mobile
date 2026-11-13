import {
  isMoneyAccountUpgradeStepError,
  isTerminalMoneyAccountUpgradeError,
} from '@metamask/money-account-upgrade-controller';

/**
 * Delays between retry attempts. Once the schedule is exhausted the last
 * delay repeats.
 */
const RETRY_DELAYS_MS = [10_000, 20_000, 40_000, 60_000];

/**
 * Error `upgradeAccountWithRetry` rejects with when its AbortSignal fires.
 *
 * Hermes does not implement `AbortSignal.throwIfAborted()` or reliably
 * populate `signal.reason`, so aborts are surfaced as this dedicated error
 * instead. Callers can tell an aborted run apart from a genuine failure with
 * {@link isMoneyAccountUpgradeAbortedError}.
 */
export class MoneyAccountUpgradeAbortedError extends Error {
  constructor() {
    super('Money Account upgrade retry aborted');
    this.name = 'MoneyAccountUpgradeAbortedError';
  }
}

/**
 * Whether `error` is the abort rejection from `upgradeAccountWithRetry`.
 *
 * Checked structurally (by name) rather than via `instanceof`, matching the
 * controller package's cross-realm-safe error guards.
 *
 * @param error - The value to test.
 * @returns Whether `error` marks an aborted retry run.
 */
export const isMoneyAccountUpgradeAbortedError = (
  error: unknown,
): error is MoneyAccountUpgradeAbortedError =>
  error instanceof Error && error.name === 'MoneyAccountUpgradeAbortedError';

/**
 * Whether `error` is a request failure that may succeed if re-issued: a
 * CHOMP 429 or 5xx, an open circuit breaker, or a network failure. These
 * surface unwrapped (not as step errors) when the lifecycle controller's
 * identities fetch fails before the upgrade itself starts.
 *
 * Checked structurally rather than via `instanceof`, matching the
 * controller packages' cross-realm-safe error guards.
 *
 * @param error - The value to test.
 * @returns Whether re-issuing the request may succeed.
 */
const NETWORK_FAILURE_MESSAGES = [
  'Network request failed',
  'Network request timed out',
  'Failed to fetch',
  'fetch failed',
];

const isTransientRequestError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    return NETWORK_FAILURE_MESSAGES.includes(error.message);
  }
  if (!(error instanceof Error)) {
    return false;
  }
  if ((error as { isBrokenCircuitError?: unknown }).isBrokenCircuitError) {
    return true;
  }
  const { httpStatus } = error as { httpStatus?: unknown };
  return (
    error.name === 'ChompApiError' &&
    typeof httpStatus === 'number' &&
    (httpStatus === 429 || httpStatus >= 500)
  );
};

const isRetryableUpgradeError = (error: unknown): boolean =>
  isMoneyAccountUpgradeStepError(error)
    ? !isTerminalMoneyAccountUpgradeError(error)
    : isTransientRequestError(error);

/**
 * Runs the Money Account upgrade sequence, retrying failed attempts with
 * capped exponential backoff (10s, 20s, 40s, then every 60s). There is no
 * attempt limit: retryable failures are retried for as long as `signal`
 * stays live — aborting it (e.g. when the user leaves the Money home
 * screen) is what ends the run.
 *
 * `upgradeAccount` is idempotent and resumable, so a retry only re-runs the
 * steps that have not yet succeeded. Retries non-terminal step failures and
 * transient request failures (see {@link isTransientRequestError}).
 * Rethrows anything else without further attempts: a terminal step failure
 * (see `isTerminalMoneyAccountUpgradeError`) or a deterministic error (e.g.
 * there is no Money Account to upgrade).
 *
 * @param upgradeAccount - Runs a single upgrade attempt, e.g.
 * `Engine.context.MoneyAccountLifecycleController.upgradeMoneyAccount`.
 * @param options - Retry options.
 * @param options.signal - Aborts waiting between attempts and prevents
 * further attempts. An abort while an attempt is in flight does not
 * interrupt the attempt, but prevents any wait or further attempts once it
 * settles. An aborted run rejects with
 * {@link MoneyAccountUpgradeAbortedError}.
 * @param options.onRetry - Called with each failure that will be retried and
 * the (1-indexed) attempt that produced it. Failures that end the run — a
 * terminal or otherwise non-retryable error — are rethrown instead, so between
 * `onRetry` and the returned promise every failure surfaces exactly once.
 * Must not throw.
 */
export async function upgradeAccountWithRetry(
  upgradeAccount: () => Promise<void>,
  {
    signal,
    onRetry,
  }: {
    signal?: AbortSignal;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {},
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    if (signal?.aborted) {
      throw new MoneyAccountUpgradeAbortedError();
    }
    try {
      await upgradeAccount();
      return;
    } catch (error) {
      if (!isRetryableUpgradeError(error)) {
        throw error;
      }
      onRetry?.(error, attempt);
      await waitUnlessAborted(retryDelayMs(attempt), signal);
    }
  }
}

/**
 * The backoff delay to wait after the given (1-indexed) failed attempt. Once
 * the schedule is exhausted, the last delay repeats.
 *
 * @param attempt - The attempt that just failed.
 * @returns The delay in milliseconds.
 */
function retryDelayMs(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1];
}

/**
 * Waits for the given duration, rejecting early if `signal` aborts.
 *
 * @param durationMs - How long to wait.
 * @param signal - Abort signal that cancels the wait.
 * @returns A promise that resolves after the wait, or rejects on abort.
 */
async function waitUnlessAborted(
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new MoneyAccountUpgradeAbortedError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, durationMs);

    function onAbort(): void {
      clearTimeout(timer);
      reject(new MoneyAccountUpgradeAbortedError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
