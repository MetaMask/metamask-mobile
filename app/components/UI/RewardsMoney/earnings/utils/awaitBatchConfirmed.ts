import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

const TRANSACTION_CONFIRMED_EVENT =
  'TransactionController:transactionConfirmed' as const;
const TRANSACTION_FAILED_EVENT =
  'TransactionController:transactionFailed' as const;

type ConfirmedHandler = (meta: TransactionMeta) => void;
type FailedHandler = (payload: {
  actionId?: string;
  error: string;
  transactionMeta: TransactionMeta;
}) => void;

/**
 * Minimal messenger surface. `Engine.controllerMessenger` satisfies it.
 */
export interface AwaitBatchConfirmedMessenger {
  subscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: ConfirmedHandler,
  ): void;
  subscribe(
    event: typeof TRANSACTION_FAILED_EVENT,
    handler: FailedHandler,
  ): void;
  unsubscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: ConfirmedHandler,
  ): void;
  unsubscribe(
    event: typeof TRANSACTION_FAILED_EVENT,
    handler: FailedHandler,
  ): void;
}

export class BatchConfirmationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Batch confirmation timed out after ${timeoutMs}ms`);
    this.name = 'BatchConfirmationTimeoutError';
  }
}

export class BatchConfirmationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchConfirmationFailedError';
  }
}

export interface AwaitBatchConfirmedArgs {
  messenger: AwaitBatchConfirmedMessenger;
  /**
   * Submits the batch and returns its id. Subscriptions are registered BEFORE
   * this runs, so a confirmation that lands before the id is known is not lost.
   */
  submit: () => Promise<{ batchId: Hex }>;
  timeoutMs?: number;
}

export interface AwaitBatchConfirmedResult {
  txHash: string;
  transactionMeta: TransactionMeta;
}

type StashedEvent =
  | { kind: 'confirmed'; meta: TransactionMeta }
  | { kind: 'failed'; error: string; meta: TransactionMeta };

/**
 * Submits a transaction batch and waits for it to reach a terminal state.
 *
 * This is the batch-shaped sibling of the card controller's
 * `awaitTransactionConfirmed`: `addTransactionBatch` resolves with a `batchId`
 * rather than a `TransactionMeta`, so the wait keys on `transactionMeta.batchId`
 * instead of the transaction id. Both subscriptions are registered before
 * `submit()` runs and events that arrive before the batch id is known are
 * stashed and replayed, which is the race a naive `useEffect` subscribe loses.
 *
 * @param args - The messenger, submit callback, and optional timeout.
 * @returns The transaction hash and confirmed `TransactionMeta`.
 */
export const awaitBatchConfirmed = async (
  args: AwaitBatchConfirmedArgs,
): Promise<AwaitBatchConfirmedResult> => {
  const { messenger, submit, timeoutMs = DEFAULT_TIMEOUT_MS } = args;

  let batchId: Hex | undefined;
  let settled = false;
  const stashed: StashedEvent[] = [];
  // A holder rather than a bare `let`: `cleanup` closes over it before the
  // timer is created, and the timer's own callback closes over `cleanup`.
  const timer: { handle?: ReturnType<typeof setTimeout> } = {};

  let resolveResult: (value: AwaitBatchConfirmedResult) => void;
  let rejectResult: (reason: Error) => void;
  const resultPromise = new Promise<AwaitBatchConfirmedResult>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    },
  );

  const matches = (meta: TransactionMeta, id: Hex): boolean =>
    meta.batchId?.toLowerCase() === id.toLowerCase();

  const cleanup = () => {
    clearTimeout(timer.handle);
    messenger.unsubscribe(TRANSACTION_CONFIRMED_EVENT, onConfirmed);
    messenger.unsubscribe(TRANSACTION_FAILED_EVENT, onFailed);
  };

  // Every caller of these two checks `settled` first, so neither re-checks it.
  const settleConfirmed = (meta: TransactionMeta) => {
    settled = true;
    cleanup();
    resolveResult({ txHash: meta.hash ?? '', transactionMeta: meta });
  };

  const settleFailed = (error: string) => {
    settled = true;
    cleanup();
    rejectResult(new BatchConfirmationFailedError(error));
  };

  function onConfirmed(meta: TransactionMeta): void {
    if (settled) return;
    if (batchId === undefined) {
      stashed.push({ kind: 'confirmed', meta });
      return;
    }
    if (matches(meta, batchId)) {
      settleConfirmed(meta);
    }
  }

  function onFailed(payload: {
    error: string;
    transactionMeta: TransactionMeta;
  }): void {
    if (settled) return;
    if (batchId === undefined) {
      stashed.push({
        kind: 'failed',
        error: payload.error,
        meta: payload.transactionMeta,
      });
      return;
    }
    if (matches(payload.transactionMeta, batchId)) {
      settleFailed(payload.error);
    }
  }

  messenger.subscribe(TRANSACTION_CONFIRMED_EVENT, onConfirmed);
  messenger.subscribe(TRANSACTION_FAILED_EVENT, onFailed);

  timer.handle = setTimeout(() => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectResult(new BatchConfirmationTimeoutError(timeoutMs));
  }, timeoutMs);

  try {
    ({ batchId } = await submit());
  } catch (error) {
    if (!settled) {
      settled = true;
      cleanup();
    }
    throw error;
  }

  // Replay anything that landed while the batch id was still unknown.
  for (const event of stashed) {
    if (settled) break;
    if (!matches(event.meta, batchId)) continue;
    if (event.kind === 'confirmed') {
      settleConfirmed(event.meta);
    } else {
      settleFailed(event.error);
    }
  }

  return resultPromise;
};

export default awaitBatchConfirmed;
