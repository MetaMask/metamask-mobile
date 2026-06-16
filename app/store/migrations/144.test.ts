import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './144';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

const baseValidState = () => ({
  engine: { backgroundState: {} },
  settings: {},
  security: {},
});

describe('Migration 144: per-connection WalletConnect metadata', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(migratedState).toStrictEqual({ some: 'state' });
  });

  it('returns state unchanged if state.sdk is missing', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const state = baseValidState();

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(migratedState).toStrictEqual(baseValidState());
  });

  it('returns state unchanged if state.sdk is not an object', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const state = { ...baseValidState(), sdk: 'not-an-object' };

    const migratedState = migrate(state) as typeof state;

    expect(migratedState.sdk).toBe('not-an-object');
  });

  it('removes legacy wc2Metadata and initializes wc2SessionMetadata when missing', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const state = {
      ...baseValidState(),
      sdk: {
        connections: {},
        wc2Metadata: {
          id: '123',
          url: 'https://dapp.example',
          name: 'Dapp',
          icon: 'icon.png',
        },
      },
    };

    const migratedState = migrate(state) as typeof state & {
      sdk: { wc2SessionMetadata: Record<string, unknown> };
    };

    expect(migratedState.sdk).not.toHaveProperty('wc2Metadata');
    expect(migratedState.sdk.wc2SessionMetadata).toStrictEqual({});
    expect(migratedState.sdk).toHaveProperty('connections');
  });

  it('preserves an existing wc2SessionMetadata object', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const existing = {
      topic1: { url: 'https://dapp.example', name: 'Dapp', icon: 'icon.png' },
    };
    const state = {
      ...baseValidState(),
      sdk: {
        wc2Metadata: { id: '1', url: '', name: '', icon: '' },
        wc2SessionMetadata: existing,
      },
    };

    const migratedState = migrate(state) as typeof state & {
      sdk: { wc2SessionMetadata: typeof existing };
    };

    expect(migratedState.sdk).not.toHaveProperty('wc2Metadata');
    expect(migratedState.sdk.wc2SessionMetadata).toBe(existing);
  });

  it('overwrites a non-object wc2SessionMetadata with an empty object', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const state = {
      ...baseValidState(),
      sdk: {
        wc2SessionMetadata: 'not-an-object',
      },
    };

    const migratedState = migrate(state) as typeof state & {
      sdk: { wc2SessionMetadata: unknown };
    };

    expect(migratedState.sdk.wc2SessionMetadata).toStrictEqual({});
  });

  it('is idempotent', () => {
    mockedEnsureValidState.mockReturnValue(true);
    const state = {
      ...baseValidState(),
      sdk: {
        wc2Metadata: { id: '1', url: '', name: '', icon: '' },
        wc2SessionMetadata: { topic1: { url: 'u', name: 'n', icon: 'i' } },
      },
    };

    const first = migrate(cloneDeep(state));
    const second = migrate(cloneDeep(first));

    expect(second).toStrictEqual(first);
  });
});
