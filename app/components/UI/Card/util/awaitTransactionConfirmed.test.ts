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

type Handler = (meta: TransactionMeta) => void;

function buildMockMessenger() {
  const handlers: Handler[] = [];
  const subscribe = jest.fn((_event: string, handler: Handler) => {
    handlers.push(handler);
  });
  const unsubscribe = jest.fn((_event: string, handler: Handler) => {
    const index = handlers.indexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  });
  const emit = (meta: TransactionMeta) => {
    // Snapshot to avoid mutation during iteration when handler unsubscribes.
    for (const handler of [...handlers]) {
      handler(meta);
    }
  };
  const messenger: AwaitTransactionConfirmedMessenger = {
    subscribe,
    unsubscribe,
  };
  return { messenger, subscribe, unsubscribe, emit, handlers };
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
    const { messenger, subscribe, unsubscribe, emit } = buildMockMessenger();
    const transactionMeta = buildMeta({ id: 'tx-happy' });

    const submit = jest.fn().mockImplementation(async () => {
      // Subscription must be registered before submit runs.
      expect(subscribe).toHaveBeenCalledTimes(1);
      return {
        result: Promise.resolve('0xhash'),
        transactionMeta,
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    // Let the submit resolve and the transactionId be captured.
    await Promise.resolve();
    await Promise.resolve();
    emit(buildMeta({ id: 'tx-happy', status: TransactionStatus.confirmed }));

    const result = await promise;
    expect(result.txHash).toBe('0xhash');
    expect(result.transactionMeta.id).toBe('tx-happy');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('replays a confirmation event that arrived BEFORE the id was known', async () => {
    const { messenger, emit, unsubscribe } = buildMockMessenger();

    let releaseSubmit: () => void = () => undefined;
    const submitDelay = new Promise<void>((resolve) => {
      releaseSubmit = resolve;
    });
    const submit = jest.fn(async () => {
      await submitDelay;
      return {
        result: Promise.resolve('0xhash-race'),
        transactionMeta: buildMeta({ id: 'tx-race' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    // Confirmation arrives BEFORE submit has finished.
    emit(buildMeta({ id: 'tx-race', status: TransactionStatus.confirmed }));

    // Now let submit resolve so the replay can happen.
    releaseSubmit();

    const result = await promise;
    expect(result.txHash).toBe('0xhash-race');
    expect(result.transactionMeta.id).toBe('tx-race');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores stashed events for unrelated transaction ids', async () => {
    const { messenger, emit, unsubscribe } = buildMockMessenger();

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

    emit(buildMeta({ id: 'tx-other', status: TransactionStatus.confirmed }));
    releaseSubmit();

    // After replay, the target id should still be pending; advance time and
    // emit the right event to confirm the original handler still works.
    await Promise.resolve();
    await Promise.resolve();
    emit(buildMeta({ id: 'tx-target', status: TransactionStatus.confirmed }));

    const result = await promise;
    expect(result.txHash).toBe('0xhash-ignored');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects with a TransactionConfirmationFailedError when status === failed', async () => {
    const { messenger, emit, unsubscribe } = buildMockMessenger();

    const submit = jest.fn().mockResolvedValue({
      result: Promise.resolve('0xhash-fail'),
      transactionMeta: buildMeta({ id: 'tx-fail' }),
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });

    await Promise.resolve();
    await Promise.resolve();
    emit(
      buildMeta({
        id: 'tx-fail',
        status: TransactionStatus.failed,
        error: { message: 'reverted', name: 'TransactionFailedError' },
      } as Partial<TransactionMeta>),
    );

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationFailedError,
    );
    await expect(promise).rejects.toThrow('reverted');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects with a timeout error when confirmation never arrives', async () => {
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

    // Drive submit + initial drain through.
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toBeInstanceOf(
      TransactionConfirmationTimeoutError,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects and unsubscribes if submit itself throws', async () => {
    const { messenger, unsubscribe } = buildMockMessenger();

    const submitError = new Error('addTransaction failed');
    const submit = jest.fn().mockRejectedValue(submitError);

    await expect(awaitTransactionConfirmed({ messenger, submit })).rejects.toBe(
      submitError,
    );
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes BEFORE submit runs', async () => {
    const { messenger, subscribe, emit } = buildMockMessenger();

    const submit = jest.fn().mockImplementation(async () => {
      expect(subscribe).toHaveBeenCalledTimes(1);
      return {
        result: Promise.resolve('0xhash-order'),
        transactionMeta: buildMeta({ id: 'tx-order' }),
      };
    });

    const promise = awaitTransactionConfirmed({ messenger, submit });
    await Promise.resolve();
    await Promise.resolve();
    emit(buildMeta({ id: 'tx-order', status: TransactionStatus.confirmed }));

    await promise;
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
