import { getPersistentState } from './getPersistentState';
import { StateMetadata } from '@metamask/base-controller';

describe('getPersistentState', () => {
  it('return empty state', () => {
    expect(getPersistentState({}, {})).toStrictEqual({});
  });

  it('return empty state when no properties are persistent', () => {
    const persistentState = getPersistentState(
      { count: 1 },
      {
        count: {
          includeInDebugSnapshot: false,
          persist: false,
          includeInStateLogs: false,
          usedInUi: false,
        },
      },
    );
    expect(persistentState).toStrictEqual({});
  });

  it('return persistent state', () => {
    const persistentState = getPersistentState(
      {
        password: 'secret password',
        privateKey: '123',
        network: 'mainnet',
        tokens: ['DAI', 'USDC'],
      },
      {
        password: {
          includeInDebugSnapshot: false,
          persist: true,
          includeInStateLogs: false,
          usedInUi: false,
        },
        privateKey: {
          includeInDebugSnapshot: false,
          persist: true,
          includeInStateLogs: false,
          usedInUi: false,
        },
        network: {
          includeInDebugSnapshot: false,
          persist: false,
          includeInStateLogs: false,
          usedInUi: false,
        },
        tokens: {
          includeInDebugSnapshot: false,
          persist: false,
          includeInStateLogs: false,
          usedInUi: false,
        },
      },
    );
    expect(persistentState).toStrictEqual({
      password: 'secret password',
      privateKey: '123',
    });
  });

  it('use function to derive persistent state', () => {
    const normalizeTransactionHash = (hash: string) => hash.toLowerCase();

    const persistentState = getPersistentState(
      {
        transactionHash: '0X1234',
      },
      {
        transactionHash: {
          includeInDebugSnapshot: false,
          persist: normalizeTransactionHash,
          includeInStateLogs: false,
          usedInUi: false,
        },
      },
    );

    expect(persistentState).toStrictEqual({ transactionHash: '0x1234' });
  });

  it('allow returning a partial object from a persist function', () => {
    const getPersistentTxMeta = (txMeta: { hash: string; value: number }) => ({
      value: txMeta.value,
    });

    const persistentState = getPersistentState(
      {
        txMeta: {
          hash: '0x123',
          value: 10,
        },
      },
      {
        txMeta: {
          includeInDebugSnapshot: false,
          includeInStateLogs: false,
          usedInUi: false,
          persist: getPersistentTxMeta,
        },
      },
    );

    expect(persistentState).toStrictEqual({ txMeta: { value: 10 } });
  });

  it('allow returning a nested partial object from a persist function', () => {
    const getPersistentTxMeta = (txMeta: {
      hash: string;
      value: number;
      history: { hash: string; value: number }[];
    }) => ({
      history: txMeta.history.map((entry) => ({ value: entry.value })),
      value: txMeta.value,
    });

    const persistentState = getPersistentState(
      {
        txMeta: {
          hash: '0x123',
          history: [
            {
              hash: '0x123',
              value: 9,
            },
          ],
          value: 10,
        },
      },
      {
        txMeta: {
          includeInDebugSnapshot: false,
          includeInStateLogs: false,
          usedInUi: false,
          persist: getPersistentTxMeta,
        },
      },
    );

    expect(persistentState).toStrictEqual({
      txMeta: { history: [{ value: 9 }], value: 10 },
    });
  });

  it('allow transforming types in a persist function', () => {
    const persistentState = getPersistentState(
      {
        count: '1',
      },
      {
        count: {
          includeInDebugSnapshot: false,
          includeInStateLogs: false,
          usedInUi: false,
          persist: (count) => Number(count),
        },
      },
    );

    expect(persistentState).toStrictEqual({ count: 1 });
  });

  // New test cases for the two key changes

  it('exclude state property when no metadata exists for a key', () => {
    const state = {
      password: 'secret password',
      privateKey: '123',
      network: 'mainnet',
    };
    const metadata = {
      password: {
        includeInDebugSnapshot: false,
        persist: true,
        includeInStateLogs: false,
        usedInUi: false,
      },
      privateKey: {
        includeInDebugSnapshot: false,
        persist: true,
        includeInStateLogs: false,
        usedInUi: false,
      },
    } as unknown as StateMetadata<typeof state>;

    const persistentState = getPersistentState(state, metadata);

    expect(persistentState).toStrictEqual({
      password: 'secret password',
      privateKey: '123',
    });
  });

  it('exclude state property when an error occurs during derivation', () => {
    const state = {
      password: 'secret password',
      privateKey: '123',
      network: 'mainnet',
    };
    const metadata = {
      password: {
        includeInDebugSnapshot: false,
        persist: true,
        includeInStateLogs: false,
        usedInUi: false,
      },
      privateKey: {
        includeInDebugSnapshot: false,
        includeInStateLogs: false,
        usedInUi: false,
        persist: () => {
          throw new Error('Derivation error');
        },
      },
    } as unknown as StateMetadata<typeof state>;

    const persistentState = getPersistentState(state, metadata);

    expect(persistentState).toStrictEqual({
      password: 'secret password',
    });
  });

  it('exclude nested objects without metadata', () => {
    const state = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      },
      preferences: {
        language: 'en',
        currency: 'USD',
      },
    };
    const metadata = {
      user: {
        includeInDebugSnapshot: false,
        persist: true,
        includeInStateLogs: false,
        usedInUi: false,
      },
    } as unknown as StateMetadata<typeof state>;

    const persistentState = getPersistentState(state, metadata);

    expect(persistentState).toStrictEqual({
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      },
    });
  });
});
