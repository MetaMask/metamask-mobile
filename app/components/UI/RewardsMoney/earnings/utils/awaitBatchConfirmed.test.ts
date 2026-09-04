import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  BatchConfirmationFailedError,
  BatchConfirmationTimeoutError,
  awaitBatchConfirmed,
  type AwaitBatchConfirmedMessenger,
} from './awaitBatchConfirmed';

type Handler = (payload: never) => void;

const createMessenger = () => {
  const handlers = new Map<string, Handler[]>();

  const messenger = {
    subscribe: jest.fn((event: string, handler: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
    }),
    unsubscribe: jest.fn((event: string, handler: Handler) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((h) => h !== handler),
      );
    }),
  } as unknown as AwaitBatchConfirmedMessenger;

  const emit = (event: string, payload: unknown) => {
    for (const handler of handlers.get(event) ?? []) {
      handler(payload as never);
    }
  };

  return { messenger, emit, handlers };
};

const createMeta = (batchId: string, hash = '0xhash'): TransactionMeta =>
  ({ id: 'tx-1', batchId, hash }) as unknown as TransactionMeta;

const BATCH_ID = '0xbatch' as Hex;

describe('awaitBatchConfirmed', () => {
  // Fake timers rather than emitting synchronously inside `submit`: emitting
  // synchronously would turn these into the stash-and-replay case, which the
  // "replays ..." tests already cover, and silently delete coverage of the
  // event-arrives-after-submit-resolves half of the contract.
  const withFakeTimers = async <T>(run: () => Promise<T>): Promise<T> => {
    jest.useFakeTimers();
    try {
      const pending = run();
      // Settle-capture before flushing timers: a rejection that lands during
      // `runAllTimersAsync` would otherwise be unhandled for that window and
      // fail the run before the assertion ever sees it.
      const settled = pending.then(
        (value) => () => value,
        (reason) => () => {
          throw reason;
        },
      );
      await jest.runAllTimersAsync();
      return (await settled)();
    } finally {
      jest.useRealTimers();
    }
  };

  it('resolves with the hash when the batch confirms', async () => {
    const { messenger, emit } = createMessenger();

    const result = await withFakeTimers(() =>
      awaitBatchConfirmed({
        messenger,
        submit: async () => {
          setTimeout(
            () =>
              emit(
                'TransactionController:transactionConfirmed',
                createMeta(BATCH_ID),
              ),
            0,
          );
          return { batchId: BATCH_ID };
        },
      }),
    );

    expect(result).toStrictEqual({
      txHash: '0xhash',
      transactionMeta: createMeta(BATCH_ID),
    });
  });

  it('replays a confirmation that lands before the batch id is known', async () => {
    const { messenger, emit } = createMessenger();

    const result = await awaitBatchConfirmed({
      messenger,
      submit: async () => {
        // The event races ahead of the submit resolving — the case a naive
        // subscribe-after-submit loses.
        emit(
          'TransactionController:transactionConfirmed',
          createMeta(BATCH_ID),
        );
        return { batchId: BATCH_ID };
      },
    });

    expect(result.txHash).toBe('0xhash');
  });

  it('rejects with the reported error when the batch fails', async () => {
    const { messenger, emit } = createMessenger();

    await expect(
      withFakeTimers(() =>
        awaitBatchConfirmed({
          messenger,
          submit: async () => {
            setTimeout(
              () =>
                emit('TransactionController:transactionFailed', {
                  error: 'reverted',
                  transactionMeta: createMeta(BATCH_ID),
                }),
              0,
            );
            return { batchId: BATCH_ID };
          },
        }),
      ),
    ).rejects.toThrow(BatchConfirmationFailedError);
  });

  it('ignores a confirmation belonging to a different batch', async () => {
    const { messenger, emit } = createMessenger();

    await expect(
      withFakeTimers(() =>
        awaitBatchConfirmed({
          messenger,
          timeoutMs: 30,
          submit: async () => {
            setTimeout(
              () =>
                emit(
                  'TransactionController:transactionConfirmed',
                  createMeta('0xother'),
                ),
              0,
            );
            return { batchId: BATCH_ID };
          },
        }),
      ),
    ).rejects.toThrow(BatchConfirmationTimeoutError);
  });

  it('rejects with a timeout when nothing terminal arrives', async () => {
    const { messenger } = createMessenger();

    await expect(
      withFakeTimers(() =>
        awaitBatchConfirmed({
          messenger,
          timeoutMs: 20,
          submit: async () => ({ batchId: BATCH_ID }),
        }),
      ),
    ).rejects.toThrow(BatchConfirmationTimeoutError);
  });

  it('unsubscribes from both events once the batch confirms', async () => {
    const { messenger, emit } = createMessenger();

    await awaitBatchConfirmed({
      messenger,
      submit: async () => {
        emit(
          'TransactionController:transactionConfirmed',
          createMeta(BATCH_ID),
        );
        return { batchId: BATCH_ID };
      },
    });

    expect(messenger.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes and rethrows when submit itself throws', async () => {
    const { messenger } = createMessenger();

    await expect(
      awaitBatchConfirmed({
        messenger,
        submit: async () => {
          throw new Error('rejected by user');
        },
      }),
    ).rejects.toThrow('rejected by user');
    expect(messenger.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('replays a failure that lands before the batch id is known', async () => {
    const { messenger, emit } = createMessenger();

    const promise = awaitBatchConfirmed({
      messenger,
      submit: async () => {
        emit('TransactionController:transactionFailed', {
          error: 'reverted early',
          transactionMeta: createMeta(BATCH_ID),
        });
        return { batchId: BATCH_ID };
      },
    });

    await expect(promise).rejects.toThrow('reverted early');
  });

  it('discards a stashed event belonging to a different batch', async () => {
    const { messenger, emit } = createMessenger();

    const promise = awaitBatchConfirmed({
      messenger,
      timeoutMs: 30,
      submit: async () => {
        emit('TransactionController:transactionFailed', {
          error: 'someone else reverted',
          transactionMeta: createMeta('0xother'),
        });
        return { batchId: BATCH_ID };
      },
    });

    await expect(promise).rejects.toThrow(BatchConfirmationTimeoutError);
  });

  it('ignores a second terminal event once the batch has already settled', async () => {
    const { messenger, emit } = createMessenger();

    const result = await awaitBatchConfirmed({
      messenger,
      submit: async () => {
        emit(
          'TransactionController:transactionConfirmed',
          createMeta(BATCH_ID),
        );
        emit('TransactionController:transactionFailed', {
          error: 'late failure',
          transactionMeta: createMeta(BATCH_ID),
        });
        return { batchId: BATCH_ID };
      },
    });

    expect(result.txHash).toBe('0xhash');
  });

  it('resolves with an empty hash when the confirmed meta carries none', async () => {
    const { messenger, emit } = createMessenger();

    const result = await withFakeTimers(() =>
      awaitBatchConfirmed({
        messenger,
        submit: async () => {
          setTimeout(
            () =>
              emit('TransactionController:transactionConfirmed', {
                ...createMeta(BATCH_ID),
                hash: undefined,
              }),
            0,
          );
          return { batchId: BATCH_ID };
        },
      }),
    );

    expect(result.txHash).toBe('');
  });

  it('matches the batch id case-insensitively', async () => {
    const { messenger, emit } = createMessenger();

    const result = await awaitBatchConfirmed({
      messenger,
      submit: async () => {
        emit(
          'TransactionController:transactionConfirmed',
          createMeta('0xBATCH'),
        );
        return { batchId: BATCH_ID };
      },
    });

    expect(result.transactionMeta.batchId).toBe('0xBATCH');
  });
});
