import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

const TRANSACTION_CONFIRMED_EVENT =
  'TransactionController:transactionConfirmed' as const;

type TransactionConfirmedHandler = (meta: TransactionMeta) => void;

/**
 * Minimal messenger surface used by `awaitTransactionConfirmed`. Both
 * `Engine.controllerMessenger` (root) and a controller-scoped messenger that
 * has `TransactionController:transactionConfirmed` delegated to it satisfy
 * this shape.
 */
export interface AwaitTransactionConfirmedMessenger {
  subscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: TransactionConfirmedHandler,
  ): void;
  unsubscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: TransactionConfirmedHandler,
  ): void;
}

export interface AwaitTransactionConfirmedSubmitResult {
  result: Promise<string>;
  transactionMeta: TransactionMeta;
}

export interface AwaitTransactionConfirmedArgs {
  messenger: AwaitTransactionConfirmedMessenger;
  /**
   * Submit the transaction and return its meta. The wait subscription is
   * registered BEFORE this runs so the `transactionConfirmed` event is never
   * missed due to the subscribe-after-submit race.
   */
  submit: () => Promise<AwaitTransactionConfirmedSubmitResult>;
  /** Bounded timeout. Defaults to 5 minutes. */
  timeoutMs?: number;
}

export interface AwaitTransactionConfirmedResult {
  txHash: string;
  transactionMeta: TransactionMeta;
}

export class TransactionConfirmationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Transaction confirmation timed out after ${timeoutMs}ms`);
    this.name = 'TransactionConfirmationTimeoutError';
  }
}

export class TransactionConfirmationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionConfirmationFailedError';
  }
}

interface PendingWait {
  transactionId?: string;
  settled: boolean;
  confirmedMeta?: TransactionMeta;
  failureReason?: Error;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Submits a transaction and waits for it to reach `confirmed` status, while
 * closing the race window between `addTransaction` returning and the
 * subscription being registered.
 *
 * Flow: subscribe to `TransactionController:transactionConfirmed`; call
 * `submit()` (stashing any events that arrive before the awaited
 * `transactionMeta.id` is known); replay the stash once the id is captured;
 * resolve on `status === confirmed`, reject on `status === failed`. The
 * subscription is always cleaned up on resolve, reject, and timeout paths.
 *
 * @param args - The messenger, submit callback, and optional timeout.
 * @returns The transaction hash and final confirmed `TransactionMeta`.
 */
export const awaitTransactionConfirmed = async (
  args: AwaitTransactionConfirmedArgs,
): Promise<AwaitTransactionConfirmedResult> => {
  const { messenger, submit, timeoutMs = DEFAULT_TIMEOUT_MS } = args;

  const state: PendingWait = { settled: false };
  const stashed: TransactionMeta[] = [];

  let resolveWait: () => void = () => undefined;
  let rejectWait: (error: Error) => void = () => undefined;
  const waitPromise = new Promise<void>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });

  // Forward refs let `handler` and `cleanup` reference each other without
  // tripping `no-use-before-define`.
  const handlerRef: { current?: TransactionConfirmedHandler } = {};
  const cleanupRef: { current?: () => void } = {};

  const cleanup = () => {
    if (state.settled) return;
    state.settled = true;
    if (state.timeoutHandle !== undefined) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = undefined;
    }
    if (handlerRef.current) {
      messenger.unsubscribe(TRANSACTION_CONFIRMED_EVENT, handlerRef.current);
    }
  };
  cleanupRef.current = cleanup;

  const handler: TransactionConfirmedHandler = (meta) => {
    if (state.settled) return;

    if (state.transactionId === undefined) {
      stashed.push(meta);
      return;
    }
    if (meta.id !== state.transactionId) return;

    if (meta.status === TransactionStatus.confirmed) {
      state.confirmedMeta = meta;
      cleanupRef.current?.();
      resolveWait();
      return;
    }
    if (meta.status === TransactionStatus.failed) {
      const error = new TransactionConfirmationFailedError(
        meta.error?.message ?? 'Transaction failed',
      );
      state.failureReason = error;
      cleanupRef.current?.();
      rejectWait(error);
    }
  };
  handlerRef.current = handler;

  messenger.subscribe(TRANSACTION_CONFIRMED_EVENT, handler);

  state.timeoutHandle = setTimeout(() => {
    if (state.settled) return;
    const error = new TransactionConfirmationTimeoutError(timeoutMs);
    state.failureReason = error;
    cleanup();
    rejectWait(error);
  }, timeoutMs);

  let submitResult: AwaitTransactionConfirmedSubmitResult;
  try {
    submitResult = await submit();
  } catch (error) {
    cleanup();
    throw error;
  }

  state.transactionId = submitResult.transactionMeta.id;

  // Drain any events that arrived before the id was known.
  for (const meta of stashed) {
    if (state.settled) break;
    handler(meta);
  }

  let txHash: string;
  try {
    txHash = await submitResult.result;
  } catch (error) {
    cleanup();
    throw error;
  }

  await waitPromise;

  if (state.failureReason) throw state.failureReason;
  if (!state.confirmedMeta) {
    // Defensive: waitPromise resolved without setting confirmedMeta.
    throw new TransactionConfirmationFailedError(
      'Transaction confirmation resolved without meta',
    );
  }

  return { txHash, transactionMeta: state.confirmedMeta };
};
