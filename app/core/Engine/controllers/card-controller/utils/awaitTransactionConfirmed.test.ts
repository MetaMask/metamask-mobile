import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
  TransactionConfirmationFailedError,
  TransactionConfirmationTimeoutError,
} from './awaitTransactionConfirmed';

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

function buildMockMessenger() {
  const confirmedHandlers: ConfirmedHandler[] = [];
  const failedHandlers: FailedHandler[] = [];

  const subscribe = jest.fn(
    (event: string, handler: ConfirmedHandler | FailedHandler) => {
      if (event === TRANSACTION_CONFIRMED_EVENT) {
        confirmedHandlers.push(handler as ConfirmedHandler);
      } else if (event === TRANSACTION_FAILED_EVENT) {
        failedHandlers.push(handler as FailedHandler);
      }
    },
  );

  const unsubscribe = jest.fn(
    (event: string, handler: ConfirmedHandler | FailedHandler) => {
      if (event === TRANSACTION_CONFIRMED_EVENT) {
        const i = confirmedHandlers.indexOf(handler as ConfirmedHandler);
        if (i >= 0) confirmedHandlers.splice(i, 1);
      } else if (event === TRANSACTION_FAILED_EVENT) {
        const i = failedHandlers.indexOf(handler as FailedHandler);
        if (i >= 0) failedHandlers.splice(i, 1);
      }
    },
  );

  const emitConfirmed = (meta: TransactionMeta) => {
    for (const h of [...confirmedHandlers]) h(meta);
  };

  const emitFailed = (payload: {
    error: string;
    transactionMeta: TransactionMeta;
  }) => {
    for (const h of [...failedHandlers]) h(payload);
  };

  const messenger: AwaitTransactionConfirmedMessenger = {
    subscribe,
    unsubscribe,
  };
  return { messenger, subscribe, unsubscribe, emitConfirmed, emitFailed };
}

function buildMeta(overrides: Partial<TransactionMeta> = {}): TransactionMeta {
  return {
    id: 'tx-1',
    status: TransactionStatus.confirmed,
    chainId: '0x8f' as `0x${string}`,
    networkClientId: 'monad',
    time: 0,
    txParams: {},
    ...overrides,
  } as TransactionMeta;
}

describe('awaitTransactionConfirmed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when transactionConfirmed fires after submit returns the id', async () => {
    const { messenger, subscribe, unsubscribe, emitConfirmed } =
      buildMockMessenger();
    const transactionMeta = buildMeta({ id: 'tx-happy' });

    const submit = jest.fn().mockImplementation(async () => {
      // Both subscriptions must be registered before submit runs.
      expect(subscribe).toHaveBeenCalledTimes(2);
      return { result: Promise.resolve('0xhash'), transactionMeta };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    await Promise.resolve();
    await Promise.resolve();
    emitConfirmed(
      buildMeta({ id: 'tx-happy', status: TransactionStatus.confirmed }),
    );

    const result = await promise;
    expect(result.txHash).toBe('0xhash');
    expect(result.transactionMeta.id).toBe('tx-happy');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('replays a confirmation event that arrived BEFORE the id was known', async () => {
    const { messenger, emitConfirmed, unsubscribe } = buildMockMessenger();

    let releaseSubmit: () => void = () => undefined;
    const submit = jest.fn(async () => {
      await new Promise<void>((resolve) => {
        releaseSubmit = resolve;
      });
      return {
        result: Promise.resolve('0xhash-race'),
        transactionMeta: buildMeta({ id: 'tx-race' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    // Confirmation arrives BEFORE submit has finished.
    emitConfirmed(
      buildMeta({ id: 'tx-race', status: TransactionStatus.confirmed }),
    );

    releaseSubmit();

    const result = await promise;
    expect(result.txHash).toBe('0xhash-race');
    expect(result.transactionMeta.id).toBe('tx-race');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('ignores stashed events for unrelated transaction ids', async () => {
    const { messenger, emitConfirmed, unsubscribe } = buildMockMessenger();

    let releaseSubmit: () => void = () => undefined;
    const submit = jest.fn(async () => {
      await new Promise<void>((resolve) => {
        releaseSubmit = resolve;
      });
      return {
        result: Promise.resolve('0xhash-ignored'),
        transactionMeta: buildMeta({ id: 'tx-target' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    emitConfirmed(
      buildMeta({ id: 'tx-other', status: TransactionStatus.confirmed }),
    );
    releaseSubmit();

    await Promise.resolve();
    await Promise.resolve();
    emitConfirmed(
      buildMeta({ id: 'tx-target', status: TransactionStatus.confirmed }),
    );

    const result = await promise;
    expect(result.txHash).toBe('0xhash-ignored');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('rejects immediately via transactionFailed event (not a timeout)', async () => {
    const { messenger, emitFailed, unsubscribe } = buildMockMessenger();

    const submit = jest.fn().mockResolvedValue({
      result: Promise.resolve('0xhash-fail'),
      transactionMeta: buildMeta({ id: 'tx-fail' }),
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    await Promise.resolve();
    await Promise.resolve();
    emitFailed({
      error: 'execution reverted',
      transactionMeta: buildMeta({ id: 'tx-fail' }),
    });

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationFailedError,
    );
    await expect(promise).rejects.toThrow('execution reverted');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    // Timer must still be cleared — no lingering timeout.
    expect(jest.getTimerCount()).toBe(0);
  });

  it('replays a transactionFailed event that arrived BEFORE the id was known', async () => {
    const { messenger, emitFailed } = buildMockMessenger();

    let releaseSubmit: () => void = () => undefined;
    const submit = jest.fn(async () => {
      await new Promise<void>((resolve) => {
        releaseSubmit = resolve;
      });
      return {
        result: Promise.resolve('0xhash-fail-race'),
        transactionMeta: buildMeta({ id: 'tx-fail-race' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    // Failure arrives BEFORE submit has finished.
    emitFailed({
      error: 'out of gas',
      transactionMeta: buildMeta({ id: 'tx-fail-race' }),
    });

    releaseSubmit();

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationFailedError,
    );
    await expect(promise).rejects.toThrow('out of gas');
  });

  it('rejects with a timeout error when neither confirmed nor failed arrives', async () => {
    const { messenger, unsubscribe } = buildMockMessenger();

    const submit = jest.fn().mockResolvedValue({
      result: Promise.resolve('0xhash-timeout'),
      transactionMeta: buildMeta({ id: 'tx-timeout' }),
    });

    const promise = awaitTransactionConfirmed({
      messenger,
      submit,
      timeoutMs: 1000,
    });

    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationTimeoutError,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('rejects with timeout when resultPromise never settles', async () => {
    const { messenger } = buildMockMessenger();

    // resultPromise intentionally never resolves (node unreachable scenario).
    const submit = jest.fn().mockResolvedValue({
      result: new Promise<string>(() => undefined),
      transactionMeta: buildMeta({ id: 'tx-hang' }),
    });

    const promise = awaitTransactionConfirmed({
      messenger,
      submit,
      timeoutMs: 50,
    });

    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(50);

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationTimeoutError,
    );
  });

  it('does not produce an unhandled rejection when timeout races with awaiting result', async () => {
    const { messenger } = buildMockMessenger();

    let releaseResult: (hash: string) => void = () => undefined;
    const resultPromise = new Promise<string>((resolve) => {
      releaseResult = resolve;
    });

    const submit = jest.fn().mockResolvedValue({
      result: resultPromise, // never resolves during this test
      transactionMeta: buildMeta({ id: 'tx-race-timeout' }),
    });

    const promise = awaitTransactionConfirmed({
      messenger,
      submit,
      timeoutMs: 50,
    });

    // Let submit resolve so transactionId is captured, then fire timeout
    // before resultPromise settles.
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(50); // timeout fires → rejectWait() called

    // Let the rejection propagate through the microtask queue before
    // releasing resultPromise to verify no unhandled rejection occurred.
    await Promise.resolve();
    releaseResult('0xhash-late');

    // The final rejection should be the timeout, not an unhandled-rejection crash.
    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationTimeoutError,
    );
  });

  it('rejects and unsubscribes if submit itself throws', async () => {
    const { messenger, unsubscribe } = buildMockMessenger();

    const submitError = new Error('addTransaction failed');
    const submit = jest.fn().mockRejectedValue(submitError);

    await expect(awaitTransactionConfirmed({ messenger, submit })).rejects.toBe(
      submitError,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('subscribes to BOTH events BEFORE submit runs', async () => {
    const { messenger, subscribe, emitConfirmed } = buildMockMessenger();

    const submit = jest.fn().mockImplementation(async () => {
      expect(subscribe).toHaveBeenCalledWith(
        TRANSACTION_CONFIRMED_EVENT,
        expect.any(Function),
      );
      expect(subscribe).toHaveBeenCalledWith(
        TRANSACTION_FAILED_EVENT,
        expect.any(Function),
      );
      return {
        result: Promise.resolve('0xhash-order'),
        transactionMeta: buildMeta({ id: 'tx-order' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });
    await Promise.resolve();
    await Promise.resolve();
    emitConfirmed(
      buildMeta({ id: 'tx-order', status: TransactionStatus.confirmed }),
    );

    await promise;
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
