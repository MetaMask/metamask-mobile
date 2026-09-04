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

  // Immediate first attempt, then interval polling.
  for (;;) {
    if (shouldContinue && !shouldContinue()) {
      throw new ExternalTransactionMonitorCancelledError(txHash);
    }
    pollAttempts += 1;
    try {
      const receipt = await getReceipt();
      if (receipt) {
        const status =
          typeof receipt.status === 'string'
            ? parseInt(receipt.status, 16)
            : receipt.status;
        if (status === 1) {
          return {
            elapsedMs: Date.now() - startedAt,
            pollAttempts,
          };
        }
        throw new ExternalTransactionRevertedError(txHash);
      }
    } catch (error) {
      if (error instanceof ExternalTransactionRevertedError) {
        throw error;
      }
      lastPollErrorCode =
        error instanceof Error ? error.name || 'Error' : 'unknown';
      // Continue polling on transient RPC errors.
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > timeoutMs) {
      throw new ExternalTransactionReceiptTimeoutError(
        timeoutMs,
        elapsedMs,
        pollAttempts,
        lastPollErrorCode,
      );
    }

    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
};
