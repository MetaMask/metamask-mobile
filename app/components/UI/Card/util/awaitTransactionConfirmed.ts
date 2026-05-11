import { type TransactionMeta } from '@metamask/transaction-controller';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

const TRANSACTION_CONFIRMED_EVENT =
  'TransactionController:transactionConfirmed' as const;
const TRANSACTION_FAILED_EVENT =
  'TransactionController:transactionFailed' as const;

type TransactionConfirmedHandler = (meta: TransactionMeta) => void;
type TransactionFailedHandler = (payload: {
  actionId?: string;
  error: string;
  transactionMeta: TransactionMeta;
}) => void;

/**
 * Minimal messenger surface used by `awaitTransactionConfirmed`. Both
 * `Engine.controllerMessenger` (root) and a controller-scoped messenger that
 * has `TransactionController:transactionConfirmed` and
 * `TransactionController:transactionFailed` delegated to it satisfy this shape.
 */
export interface AwaitTransactionConfirmedMessenger {
  subscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: TransactionConfirmedHandler,
  ): void;
  subscribe(
    event: typeof TRANSACTION_FAILED_EVENT,
    handler: TransactionFailedHandler,
  ): void;
  unsubscribe(
    event: typeof TRANSACTION_CONFIRMED_EVENT,
    handler: TransactionConfirmedHandler,
  ): void;
  unsubscribe(
    event: typeof TRANSACTION_FAILED_EVENT,
    handler: TransactionFailedHandler,
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
   * registered BEFORE this runs so neither `transactionConfirmed` nor
   * `transactionFailed` events are missed due to the subscribe-after-submit
   * race.
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

type StashedEvent =
  | { kind: 'confirmed'; meta: TransactionMeta }
  | { kind: 'failed'; error: string; meta: TransactionMeta };

interface PendingWait {
  transactionId?: string;
  settled: boolean;
  confirmedMeta?: TransactionMeta;
  failureReason?: Error;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Submits a transaction and waits for it to reach a terminal state
 * (`transactionConfirmed` → resolve, `transactionFailed` → reject immediately),
 * while closing the race window between `addTransaction` returning and the
 * subscriptions being registered.
 *
 * Both `TransactionController:transactionConfirmed` and
 * `TransactionController:transactionFailed` are subscribed to BEFORE `submit()`
 * is called. Events that arrive before the `transactionMeta.id` is known are
 * stashed and replayed once the id is captured.
 *
 * All subscriptions are always cleaned up on resolve, reject, and timeout paths.
 *
 * @param args - The messenger, submit callback, and optional timeout.
 * @returns The transaction hash and final confirmed `TransactionMeta`.
 */
export const awaitTransactionConfirmed = async (
  args: AwaitTransactionConfirmedArgs,
): Promise<AwaitTransactionConfirmedResult> => {
  const { messenger, submit, timeoutMs = DEFAULT_TIMEOUT_MS } = args;

  const state: PendingWait = { settled: false };
  const stashed: StashedEvent[] = [];

  let resolveWait: () => void = () => undefined;
  let rejectWait: (error: Error) => void = () => undefined;
  const waitPromise = new Promise<void>((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });
  // Suppress unhandled-rejection reports when the promise is rejected (timeout
  // or transactionFailed) while `await submitResult.result` is still pending.
  // The `await waitPromise` below will still throw.
  waitPromise.catch(() => undefined);

  const confirmedHandlerRef: { current?: TransactionConfirmedHandler } = {};
  const failedHandlerRef: { current?: TransactionFailedHandler } = {};

  const cleanup = () => {
    if (state.settled) return;
    state.settled = true;
    if (state.timeoutHandle !== undefined) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = undefined;
    }
    if (confirmedHandlerRef.current) {
      messenger.unsubscribe(
        TRANSACTION_CONFIRMED_EVENT,
        confirmedHandlerRef.current,
      );
    }
    if (failedHandlerRef.current) {
      messenger.unsubscribe(TRANSACTION_FAILED_EVENT, failedHandlerRef.current);
    }
  };

  const confirmedHandler: TransactionConfirmedHandler = (meta) => {
    if (state.settled) return;

    if (state.transactionId === undefined) {
      stashed.push({ kind: 'confirmed', meta });
      return;
    }
    if (meta.id !== state.transactionId) return;

    state.confirmedMeta = meta;
    cleanup();
    resolveWait();
  };
  confirmedHandlerRef.current = confirmedHandler;

  const failedHandler: TransactionFailedHandler = ({
    error,
    transactionMeta: meta,
  }) => {
    if (state.settled) return;

    if (state.transactionId === undefined) {
      stashed.push({ kind: 'failed', error, meta });
      return;
    }
    if (meta.id !== state.transactionId) return;

    const err = new TransactionConfirmationFailedError(
      error || 'Transaction failed',
    );
    state.failureReason = err;
    cleanup();
    rejectWait(err);
  };
  failedHandlerRef.current = failedHandler;

  messenger.subscribe(TRANSACTION_CONFIRMED_EVENT, confirmedHandler);
  messenger.subscribe(TRANSACTION_FAILED_EVENT, failedHandler);

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
  for (const event of stashed) {
    if (state.settled) break;
    if (event.kind === 'confirmed') {
      confirmedHandler(event.meta);
    } else {
      failedHandler({ error: event.error, transactionMeta: event.meta });
    }
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
    throw new TransactionConfirmationFailedError(
      'Transaction confirmation resolved without meta',
    );
  }

  return { txHash, transactionMeta: state.confirmedMeta };
};
