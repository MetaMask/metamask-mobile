const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;

export class ExternalTransactionReceiptTimeoutError extends Error {
  readonly elapsedMs: number;
  readonly pollAttempts: number;
  readonly lastPollErrorCode: string | null;

  constructor(
    timeoutMs: number,
    elapsedMs: number,
    pollAttempts: number,
    lastPollErrorCode: string | null,
  ) {
    super(`External transaction receipt timed out after ${timeoutMs}ms`);
    this.name = 'ExternalTransactionReceiptTimeoutError';
    this.elapsedMs = elapsedMs;
    this.pollAttempts = pollAttempts;
    this.lastPollErrorCode = lastPollErrorCode;
  }
}

export class ExternalTransactionRevertedError extends Error {
  constructor(txHash: string) {
    super(`External transaction reverted on-chain: ${txHash}`);
    this.name = 'ExternalTransactionRevertedError';
  }
}

export class ExternalTransactionMonitorCancelledError extends Error {
  constructor(txHash: string) {
    super(`External transaction monitoring cancelled: ${txHash}`);
    this.name = 'ExternalTransactionMonitorCancelledError';
  }
}

export interface AwaitExternalTransactionReceiptArgs {
  /** Hex transaction hash returned by the provider. */
  txHash: string;
  /** Fetch eth_getTransactionReceipt for the hash. Return null while pending. */
  getReceipt: () => Promise<{ status?: string | number } | null>;
  /** Checked before each poll. Return false to abandon monitoring. */
  shouldContinue?: () => boolean;
  intervalMs?: number;
  timeoutMs?: number;
}

export interface AwaitExternalTransactionReceiptResult {
  elapsedMs: number;
  pollAttempts: number;
}

interface Receipt {
  status?: string | number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Race `promise` against a timer so a hung RPC call cannot stall forever.
 * Rejects with `onTimeout()` when the timer fires first.
 */
const raceWithTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(onTimeout());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const assertShouldContinue = (
  shouldContinue: (() => boolean) | undefined,
  txHash: string,
): void => {
  if (shouldContinue && !shouldContinue()) {
    throw new ExternalTransactionMonitorCancelledError(txHash);
  }
};

const isReceiptSuccess = (receipt: Receipt): boolean => {
  const status =
    typeof receipt.status === 'string'
      ? Number.parseInt(receipt.status, 16)
      : receipt.status;
  return status === 1;
};

/**
 * Returns true when a receipt confirms success. Throws on revert.
 * Returns false while the receipt is still pending (null).
 */
const evaluateReceipt = (receipt: Receipt | null, txHash: string): boolean => {
  if (!receipt) {
    return false;
  }
  if (isReceiptSuccess(receipt)) {
    return true;
  }
  throw new ExternalTransactionRevertedError(txHash);
};

const isTerminalPollError = (error: unknown): boolean =>
  error instanceof ExternalTransactionReceiptTimeoutError ||
  error instanceof ExternalTransactionRevertedError;

const toPollErrorCode = (error: unknown): string =>
  error instanceof Error ? error.name || 'Error' : 'unknown';

/**
 * Polls for an externally-submitted transaction receipt (e.g. a Card provider
 * withdrawal that returns a txHash rather than going through
 * TransactionController).
 *
 * Unlike `awaitTransactionConfirmed`, this does not listen for messenger
 * events — the wallet did not submit the transaction.
 */
export const awaitExternalTransactionReceipt = async (
  args: AwaitExternalTransactionReceiptArgs,
): Promise<AwaitExternalTransactionReceiptResult> => {
  const {
    txHash,
    getReceipt,
    shouldContinue,
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = args;

  const startedAt = Date.now();
  let pollAttempts = 0;
  let lastPollErrorCode: string | null = null;

  const remainingMs = () => Math.max(0, timeoutMs - (Date.now() - startedAt));

  const throwTimeout = () => {
    throw new ExternalTransactionReceiptTimeoutError(
      timeoutMs,
      Date.now() - startedAt,
      pollAttempts,
      lastPollErrorCode,
    );
  };

  // Immediate first attempt, then interval polling.
  while (true) {
    assertShouldContinue(shouldContinue, txHash);

    const budgetMs = remainingMs();
    if (budgetMs === 0) {
      throwTimeout();
    }

    pollAttempts += 1;
    const attempt = pollAttempts;
    const lastErrorAtAttempt = lastPollErrorCode;
    try {
      const receipt = await raceWithTimeout(
        getReceipt(),
        budgetMs,
        () =>
          new ExternalTransactionReceiptTimeoutError(
            timeoutMs,
            Date.now() - startedAt,
            attempt,
            lastErrorAtAttempt,
          ),
      );
      if (evaluateReceipt(receipt, txHash)) {
        return {
          elapsedMs: Date.now() - startedAt,
          pollAttempts,
        };
      }
    } catch (error) {
      if (isTerminalPollError(error)) {
        throw error;
      }
      lastPollErrorCode = toPollErrorCode(error);
      // Continue polling on transient RPC errors.
    }

    if (remainingMs() === 0) {
      throwTimeout();
    }

    const sleepMs = Math.min(intervalMs, remainingMs());
    await delay(sleepMs);
  }
};
