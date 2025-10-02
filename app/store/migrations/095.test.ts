import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import migrate from './095';

// Interface for the state structure used in tests
interface TestState {
  engine: {
    backgroundState: {
      PerpsController?: {
        isFirstTimeUser?: boolean | { testnet: boolean; mainnet: boolean };
        activeProvider?: string;
        isTestnet?: boolean;
        connectionStatus?: string;
        positions?: unknown[];
        accountState?: unknown;
        pendingOrders?: unknown[];
        depositStatus?: string;
        currentDepositTxHash?: string | null;
        depositError?: string | null;
        activeDepositTransactions?: Record<string, unknown>;
        lastError?: string | null;
        lastUpdateTimestamp?: number;
        isEligible?: boolean;
      };
    };
  };
}

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);

describe('Migration 95: Convert PerpsController isFirstTimeUser from boolean to object', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = 'not an object'; // This will cause ensureValidState to return false

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual('not an object');
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "FATAL ERROR: Migration 95: Invalid state error: 'string'",
        ),
      }),
    );
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            PerpsController: 'invalid',
          },
        },
      },
      test: 'invalid PerpsController state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    // Note: ensureValidState may call captureException for invalid states
    // but this is expected behavior and doesn't affect the migration result
  });

  it('does not modify state if PerpsController does not exist', () => {
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            someData: 'value',
          },
        },
      },
    };

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify state if isFirstTimeUser does not exist in PerpsController', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'hyperliquid',
            isTestnet: false,
            positions: [],
          },
        },
      },
    };

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify state if isFirstTimeUser is already an object', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: {
              testnet: false,
              mainnet: true,
            },
            activeProvider: 'hyperliquid',
          },
        },
      },
    };

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('converts boolean true isFirstTimeUser to object format', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: true,
            activeProvider: 'hyperliquid',
            isTestnet: false,
          },
        },
      },
    };

    const migratedState = migrate(state) as TestState;

    expect(
      migratedState.engine.backgroundState.PerpsController?.isFirstTimeUser,
    ).toEqual({
      testnet: true,
      mainnet: true,
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('converts boolean false isFirstTimeUser to object format', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: false,
            activeProvider: 'hyperliquid',
            isTestnet: true,
            positions: [],
            accountState: null,
          },
        },
      },
    };

    const migratedState = migrate(state) as TestState;

    expect(
      migratedState.engine.backgroundState.PerpsController?.isFirstTimeUser,
    ).toEqual({
      testnet: false,
      mainnet: false,
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('preserves other PerpsController properties when migrating isFirstTimeUser', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: true,
            activeProvider: 'hyperliquid',
            isTestnet: false,
            connectionStatus: 'connected',
            positions: [{ id: '1', symbol: 'BTC' }],
            accountState: { balance: '1000' },
            pendingOrders: [],
            depositStatus: 'idle',
            currentDepositTxHash: null,
            depositError: null,
            activeDepositTransactions: {},
            lastError: null,
            lastUpdateTimestamp: 1234567890,
            isEligible: true,
          },
        },
      },
    };

    const migratedState = migrate(state) as TestState;

    // Check that isFirstTimeUser was migrated
    expect(
      migratedState.engine.backgroundState.PerpsController?.isFirstTimeUser,
    ).toEqual({
      testnet: true,
      mainnet: true,
    });

    // Check that other properties are preserved
    expect(
      migratedState.engine.backgroundState.PerpsController?.activeProvider,
    ).toBe('hyperliquid');
    expect(
      migratedState.engine.backgroundState.PerpsController?.isTestnet,
    ).toBe(false);
    expect(
      migratedState.engine.backgroundState.PerpsController?.connectionStatus,
    ).toBe('connected');
    expect(
      migratedState.engine.backgroundState.PerpsController?.positions,
    ).toEqual([{ id: '1', symbol: 'BTC' }]);
    expect(
      migratedState.engine.backgroundState.PerpsController?.accountState,
    ).toEqual({ balance: '1000' });
    expect(
      migratedState.engine.backgroundState.PerpsController?.isEligible,
    ).toBe(true);

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles migration errors gracefully and returns original state', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: true,
          },
        },
      },
    };

    // Mock an error during migration by making the state modification throw
    Object.defineProperty(
      state.engine.backgroundState.PerpsController,
      'isFirstTimeUser',
      {
        get() {
          return true;
        },
        set() {
          throw new Error('Migration error');
        },
      },
    );

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 95: Failed to convert PerpsController isFirstTimeUser',
        ),
      }),
    );
  });

  it('handles non-boolean isFirstTimeUser values gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: 'not-a-boolean',
            activeProvider: 'hyperliquid',
          },
        },
      },
    };

    const migratedState = migrate(state);

    // State should be unchanged since isFirstTimeUser is not a boolean
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
