import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { ensureValidState } from './util';
import migrate from './087';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const migrationVersion = 87;

// Type definition for the expected state structure after migration
interface MigratedState {
  engine: {
    backgroundState: {
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: Record<string, unknown>;
        selectedMultichainNetworkChainId: string;
        isEvmSelected: boolean;
        networksWithTransactionActivity: Record<string, unknown>;
      };
    };
  };
}

describe(`Migration ${migrationVersion}: Populate MultichainNetworkController with default state if undefined`, () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
  });

  it('populates MultichainNetworkController if it does not exist', () => {
    const state = {
      engine: {
        backgroundState: {
          // MultichainNetworkController is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as MigratedState;

    expect(
      migratedState.engine.backgroundState.MultichainNetworkController,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .selectedMultichainNetworkChainId,
    ).toBe(SolScope.Mainnet);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .isEvmSelected,
    ).toBe(true);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .networksWithTransactionActivity,
    ).toEqual({});
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('populates MultichainNetworkController with correct network configurations', () => {
    const state = {
      engine: {
        backgroundState: {
          // MultichainNetworkController is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as MigratedState;

    const networkConfigs =
      migratedState.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId;

    // Check Bitcoin networks
    expect(networkConfigs[BtcScope.Mainnet]).toEqual({
      chainId: BtcScope.Mainnet,
      name: 'Bitcoin',
      nativeCurrency: `${BtcScope.Mainnet}/slip44:0`,
      isEvm: false,
    });

    expect(networkConfigs[BtcScope.Testnet]).toEqual({
      chainId: BtcScope.Testnet,
      name: 'Bitcoin Testnet',
      nativeCurrency: `${BtcScope.Testnet}/slip44:0`,
      isEvm: false,
    });

    // Check Solana networks
    expect(networkConfigs[SolScope.Mainnet]).toEqual({
      chainId: SolScope.Mainnet,
      name: 'Solana',
      nativeCurrency: `${SolScope.Mainnet}/slip44:501`,
      isEvm: false,
    });

    expect(networkConfigs[SolScope.Testnet]).toEqual({
      chainId: SolScope.Testnet,
      name: 'Solana Testnet',
      nativeCurrency: `${SolScope.Testnet}/slip44:501`,
      isEvm: false,
    });

    expect(networkConfigs[SolScope.Devnet]).toEqual({
      chainId: SolScope.Devnet,
      name: 'Solana Devnet',
      nativeCurrency: `${SolScope.Devnet}/slip44:501`,
      isEvm: false,
    });
  });

  it('resets MultichainNetworkController to default state if it is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          MultichainNetworkController: 'invalid_state',
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as MigratedState;

    expect(
      migratedState.engine.backgroundState.MultichainNetworkController,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .selectedMultichainNetworkChainId,
    ).toBe(SolScope.Mainnet);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .isEvmSelected,
    ).toBe(true);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .networksWithTransactionActivity,
    ).toEqual({});
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('resets MultichainNetworkController to default state if it is null', () => {
    const state = {
      engine: {
        backgroundState: {
          MultichainNetworkController: null,
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as MigratedState;

    expect(
      migratedState.engine.backgroundState.MultichainNetworkController,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId,
    ).toBeDefined();
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .selectedMultichainNetworkChainId,
    ).toBe(SolScope.Mainnet);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .isEvmSelected,
    ).toBe(true);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .networksWithTransactionActivity,
    ).toEqual({});
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not overwrite existing MultichainNetworkController with default state', () => {
    const existingConfigs = {
      [SolScope.Mainnet]: {
        chainId: SolScope.Mainnet,
        name: 'Custom Solana',
        nativeCurrency: 'custom',
        isEvm: false,
      },
    };

    const state = {
      engine: {
        backgroundState: {
          MultichainNetworkController: {
            multichainNetworkConfigurationsByChainId: existingConfigs,
            selectedMultichainNetworkChainId: SolScope.Testnet,
            isEvmSelected: false,
            networksWithTransactionActivity: { test: 'data' },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as MigratedState;

    // Should preserve existing values, not overwrite with default state
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId,
    ).toBe(existingConfigs);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .selectedMultichainNetworkChainId,
    ).toBe(SolScope.Testnet);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .isEvmSelected,
    ).toBe(false);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController
        .networksWithTransactionActivity,
    ).toEqual({ test: 'data' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged and captures exception on migration error', () => {
    mockedEnsureValidState.mockReturnValue(true);

    // Create a state that will cause the migration to fail by making backgroundState null
    const invalidState = {
      engine: {
        backgroundState: null,
      },
    };

    const migratedState = migrate(invalidState);

    expect(migratedState).toBe(invalidState);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'populating MultichainNetworkController failed with error',
        ),
      }),
    );
  });

  it('does not modify the original state object', () => {
    const originalState = {
      engine: {
        backgroundState: {
          // MultichainNetworkController is missing
        },
      },
    };

    const stateCopy = cloneDeep(originalState);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(stateCopy) as MigratedState;

    expect(migratedState).not.toBe(originalState);
    expect(
      migratedState.engine.backgroundState.MultichainNetworkController,
    ).toBeDefined();
    expect(
      (
        originalState as {
          engine: { backgroundState: Record<string, unknown> };
        }
      ).engine.backgroundState.MultichainNetworkController,
    ).toBeUndefined();
  });
});
