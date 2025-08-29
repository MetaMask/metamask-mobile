import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import migrate from './096';

// Only mock Sentry and ensureValidState - use real implementations for the rest
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn().mockReturnValue(true),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(
  jest.requireMock('./util').ensureValidState,
);

// Interface for test state structure
interface TestState {
  engine: {
    backgroundState: {
      NetworkOrderController?: {
        enabledNetworkMap?: Record<string, Record<string, boolean>>;
        [key: string]: unknown;
      };
      PreferencesController?: {
        preferences?: {
          tokenNetworkFilter?: Record<string, boolean>;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      MultichainNetworkController?: {
        selectedMultichainNetworkChainId?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
}

describe('Migration 096: Migrate tokenNetworkFilter to enabledNetworkMap', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState fails', () => {
    // Arrange
    const state = 'not an object';
    mockedEnsureValidState.mockReturnValue(false);

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual('not an object');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: { engine: {} },
      test: 'empty engine state',
    },
    {
      state: { engine: { backgroundState: {} } },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: { NetworkOrderController: 'invalid' },
        },
      },
      test: 'invalid NetworkOrderController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkOrderController: {},
            PreferencesController: 'invalid',
          },
        },
      },
      test: 'invalid PreferencesController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkOrderController: {},
            PreferencesController: { preferences: 'invalid' },
          },
        },
      },
      test: 'invalid preferences state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    // Arrange
    const orgState = cloneDeep(state);

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not modify state if tokenNetworkFilter does not exist', () => {
    // Arrange
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: { otherSetting: 'value' },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('logs error and returns original state when tokenNetworkFilter is not an object', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: { tokenNetworkFilter: 'invalid' },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Migration 96: tokenNetworkFilter is type 'string', expected object.",
        ),
      }),
    );
  });

  it('logs error and returns original state when tokenNetworkFilter is empty', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: { tokenNetworkFilter: {} },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 96: tokenNetworkFilter is empty, expected at least one network configuration.',
        ),
      }),
    );
  });

  it('logs error and returns original state when MultichainNetworkController is missing', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: { '0x1': true, '0x89': false },
            },
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('logs error and returns original state when MultichainNetworkController is invalid', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: { '0x1': true, '0x89': false },
            },
          },
          MultichainNetworkController: 'invalid',
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('logs error and returns original state when selectedMultichainNetworkChainId is missing', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: { '0x1': true, '0x89': false },
            },
          },
          MultichainNetworkController: { otherProperty: 'value' },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Migration 96: selectedMultichainNetworkChainId is type 'undefined', expected string.",
        ),
      }),
    );
  });

  it('logs error and returns original state when selectedMultichainNetworkChainId is not a string', () => {
    // Arrange
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: { '0x1': true, '0x89': false },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: 123,
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Migration 96: selectedMultichainNetworkChainId is type 'number', expected string.",
        ),
      }),
    );
  });

  it('successfully migrates EVM tokenNetworkFilter to enabledNetworkMap with Solana network', () => {
    // Arrange - Real data scenario with EVM networks and Solana
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkOrderController: { otherProperty: 'preserved' },
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true, // Ethereum mainnet
                '0x89': false, // Polygon
                '0xa': true, // Optimism
              },
              otherPreference: 'preserved',
            },
            otherProperty: 'preserved',
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            otherProperty: 'preserved',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state) as TestState;

    // Assert - Check that enabledNetworkMap was created correctly
    expect(
      migratedState.engine.backgroundState.NetworkOrderController
        ?.enabledNetworkMap,
    ).toEqual({
      eip155: {
        '0x1': true,
        '0x89': false,
        '0xa': true,
      },
      solana: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
      },
    });

    // Assert - Check that other properties are preserved
    expect(
      migratedState.engine.backgroundState.NetworkOrderController
        ?.otherProperty,
    ).toBe('preserved');
    expect(
      migratedState.engine.backgroundState.PreferencesController?.preferences
        ?.otherPreference,
    ).toBe('preserved');
    expect(
      migratedState.engine.backgroundState.PreferencesController?.otherProperty,
    ).toBe('preserved');
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        ?.otherProperty,
    ).toBe('preserved');

    // Assert - Check that tokenNetworkFilter is still there (migration doesn't remove it)
    expect(
      migratedState.engine.backgroundState.PreferencesController?.preferences
        ?.tokenNetworkFilter,
    ).toEqual({
      '0x1': true,
      '0x89': false,
      '0xa': true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('overwrites existing enabledNetworkMap when migration runs', () => {
    // Arrange
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkOrderController: {
            enabledNetworkMap: {
              existingNamespace: { existingChain: true },
            },
          },
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state) as TestState;

    // Assert - Should overwrite the existing enabledNetworkMap
    expect(
      migratedState.engine.backgroundState.NetworkOrderController
        ?.enabledNetworkMap,
    ).toEqual({
      eip155: {
        '0x1': true,
        '0x89': false,
      },
      solana: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
      },
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles errors gracefully and returns original state', () => {
    // Arrange - Create state with invalid selectedMultichainNetworkChainId that will cause an error
    const state = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: { '0x1': true },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: null, // This will cause an error in the migration
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state);

    // Assert
    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Migration 96: selectedMultichainNetworkChainId is type 'object', expected string",
        ),
      }),
    );
  });

  it('handles BSC and Bitcoin networks correctly', () => {
    // Arrange - Real scenario with BSC (EVM) and Bitcoin (non-EVM)
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x38': true, // BSC mainnet
                '0x89': false, // Polygon
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId:
              'bip122:000000000019d6689c085ae165831e93',
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state) as TestState;

    // Assert
    expect(
      migratedState.engine.backgroundState.NetworkOrderController
        ?.enabledNetworkMap,
    ).toEqual({
      eip155: {
        '0x38': true,
        '0x89': false,
      },
      bip122: {
        'bip122:000000000019d6689c085ae165831e93': true,
      },
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles same namespace collision by merging networks', () => {
    // Arrange - Both EVM networks in tokenNetworkFilter and another EVM chain in selectedMultichainNetworkChainId
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkOrderController: {},
          PreferencesController: {
            preferences: {
              tokenNetworkFilter: {
                '0x1': true,
                '0x89': false,
              },
            },
          },
          MultichainNetworkController: {
            selectedMultichainNetworkChainId: '0xa', // Another EVM chain (Optimism)
          },
        },
      },
    };

    // Act
    const migratedState = migrate(state) as TestState;

    // Assert - When both EVM and non-EVM networks have the same namespace,
    // the spread operator causes non-EVM to completely overwrite EVM networks
    expect(
      migratedState.engine.backgroundState.NetworkOrderController
        ?.enabledNetworkMap,
    ).toEqual({
      eip155: {
        '0xa': true, // Only the non-EVM network remains due to namespace collision
      },
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
