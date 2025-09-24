import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../reducers';
import useAccountInfo from './useAccountInfo';

jest.mock('../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

const MOCK_ADDRESS = '0x0';
const MOCK_ADDRESS_NONEXISTENT = '0x1234567890123456789012345678901234567890';
const MOCK_WALLET_ID = 'keyring:wallet1';
const MOCK_WALLET_ID_2 = 'keyring:wallet2';
const MOCK_GROUP_ID = 'keyring:wallet1/1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS]: {
              balance: '0x5',
            },
          },
        },
      },
    },
  },
};

describe('useAccountInfo', () => {
  it('returns existing address from accounts controller', () => {
    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current?.accountName).toEqual('Account 1');
    expect(result?.current?.accountAddress).toEqual('0x0');
    expect(result?.current?.accountBalance).toEqual('< 0.00001 ETH');
    expect(result?.current?.accountFiatBalance).toEqual('$10.00');
  });

  it('returns undefined walletName when multichain accounts feature is disabled', () => {
    const stateWithDisabledFeature = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: false,
                featureVersion: null,
                minimumVersion: null,
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithDisabledFeature,
      },
    );

    expect(result?.current?.walletName).toBeUndefined();
  });

  it('returns undefined walletName when walletsMap is empty', () => {
    const stateWithEnabledFeature = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {},
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithEnabledFeature,
      },
    );

    expect(result?.current?.walletName).toBeUndefined();
  });

  it('returns undefined walletName when only one wallet exists', () => {
    const mockAccountsState = createMockAccountsControllerState([MOCK_ADDRESS]);
    const accountId = Object.keys(
      mockAccountsState.internalAccounts.accounts,
    )[0];

    const stateWithSingleWallet = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountsController: mockAccountsState,
          AccountTreeController: {
            accountTree: {
              wallets: {
                [MOCK_WALLET_ID]: {
                  id: MOCK_WALLET_ID,
                  metadata: { name: 'Wallet 1' },
                  groups: {
                    [MOCK_GROUP_ID]: {
                      id: MOCK_GROUP_ID,
                      accounts: [accountId],
                      metadata: { name: 'Group 1' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithSingleWallet,
      },
    );

    expect(result?.current?.walletName).toBeUndefined();
  });

  it('returns wallet name when multiple wallets exist and account is found', () => {
    const mockAccountsState = createMockAccountsControllerState([MOCK_ADDRESS]);
    const accountId = Object.keys(
      mockAccountsState.internalAccounts.accounts,
    )[0];

    const stateWithMultipleWallets = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountsController: mockAccountsState,
          AccountTreeController: {
            accountTree: {
              wallets: {
                [MOCK_WALLET_ID]: {
                  id: MOCK_WALLET_ID,
                  metadata: { name: 'First Wallet' },
                  groups: {
                    [MOCK_GROUP_ID]: {
                      id: MOCK_GROUP_ID,
                      accounts: [accountId],
                      metadata: { name: 'Group 1' },
                    },
                  },
                },
                [MOCK_WALLET_ID_2]: {
                  id: MOCK_WALLET_ID_2,
                  metadata: { name: 'Second Wallet' },
                  groups: {},
                },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithMultipleWallets,
      },
    );

    expect(result?.current?.walletName).toEqual('First Wallet');
  });

  it('returns undefined walletName when account is not found in multiple wallets', () => {
    const stateWithMultipleWalletsNoMatch = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: {},
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {
                [MOCK_WALLET_ID]: {
                  id: MOCK_WALLET_ID,
                  metadata: { name: 'First Wallet' },
                  groups: {},
                },
                [MOCK_WALLET_ID_2]: {
                  id: MOCK_WALLET_ID_2,
                  metadata: { name: 'Second Wallet' },
                  groups: {},
                },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithMultipleWalletsNoMatch,
      },
    );

    expect(result?.current?.walletName).toBeUndefined();
  });

  it('returns undefined accountGroupName when multichain accounts feature is disabled', () => {
    const stateWithDisabledFeature = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: false,
                featureVersion: null,
                minimumVersion: null,
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithDisabledFeature,
      },
    );

    expect(result?.current?.accountGroupName).toBeUndefined();
  });

  it('returns undefined accountGroupName when no account groups exist', () => {
    const stateWithNoGroups = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {},
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithNoGroups,
      },
    );

    expect(result?.current?.accountGroupName).toBeUndefined();
  });

  it('returns account group name when account is found in groups', () => {
    const mockAccountsState = createMockAccountsControllerState([MOCK_ADDRESS]);
    const accountId = Object.keys(
      mockAccountsState.internalAccounts.accounts,
    )[0];

    const stateWithAccountGroups = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccountsState2: {
                enabled: true,
                featureVersion: '2',
                minimumVersion: '0.0.0',
              },
            },
          },
          AccountsController: mockAccountsState,
          AccountTreeController: {
            accountTree: {
              wallets: {
                [MOCK_WALLET_ID]: {
                  id: MOCK_WALLET_ID,
                  metadata: { name: 'Wallet 1' },
                  groups: {
                    [MOCK_GROUP_ID]: {
                      id: MOCK_GROUP_ID,
                      accounts: [accountId],
                      metadata: { name: 'Test Group' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithAccountGroups,
      },
    );

    expect(result?.current?.accountGroupName).toEqual('Test Group');
  });

  it('returns shortened address when address not found in internal accounts', () => {
    const stateWithMissingAccount = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS_NONEXISTENT, '0x1' as Hex),
      {
        state: stateWithMissingAccount,
      },
    );

    expect(result?.current?.accountName).toEqual('0x12345...67890');
  });

  it('returns correct balance format for different amounts', () => {
    const stateWithDifferentBalance = merge({}, mockInitialState, {
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: {
                  balance: '0x1bc16d674ec80000',
                },
              },
            },
          },
        },
      },
    });

    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS, '0x1' as Hex),
      {
        state: stateWithDifferentBalance,
      },
    );

    expect(result?.current?.accountBalance).toEqual('2 ETH');
  });
});
