import { selectMultichainWallets, selectWallets } from './wallets';
import { RootState } from '../../reducers';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const MULTICHAIN_WALLET_ID_1 = 'entropy:wallet1' as const;
const MULTICHAIN_WALLET_ID_2 = 'entropy:wallet2' as const;

/**
 * Helper function to create a base mock state with RemoteFeatureFlagController
 */
const createMockState = (
  accountTreeController:
    | DeepPartial<AccountTreeControllerState>
    | undefined = {},
  multichainAccountsEnabled: boolean = true,
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            enableMultichainAccounts: {
              enabled: multichainAccountsEnabled,
              featureVersion: '1',
              minimumVersion: '1.0.0',
            },
          },
        },
      },
    },
  } as unknown as RootState);

describe('selectWallets', () => {
  it('returns empty array when multichain accounts feature is disabled', () => {
    const mockState = createMockState(
      {
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {
                'keyring:1/ethereum': {
                  accounts: ['account1'],
                },
              },
            },
            [WALLET_ID_2]: {
              id: WALLET_ID_2,
              metadata: { name: 'Wallet 2' },
              groups: {
                'keyring:2/ethereum': {
                  accounts: ['account2'],
                },
              },
            },
          },
        },
      },
      false,
    );

    const result = selectWallets(mockState);
    expect(result).toEqual([]);
  });

  it('returns wallets array when multichain accounts feature is enabled and wallets exist', () => {
    const wallet1 = {
      id: WALLET_ID_1,
      metadata: { name: 'Wallet 1' },
      groups: {
        'keyring:1:ethereum': {
          accounts: ['account1'],
        },
      },
    };

    const wallet2 = {
      id: WALLET_ID_2,
      metadata: { name: 'Wallet 2' },
      groups: {
        'keyring:2:ethereum': {
          accounts: ['account2'],
        },
      },
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: wallet1,
          [WALLET_ID_2]: wallet2,
        },
      },
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([wallet1, wallet2]);
  });

  it('returns empty array when multichain accounts feature is enabled but no wallets exist', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {},
      },
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([]);
  });

  it('returns empty array when accountTree is undefined', () => {
    const mockState = createMockState(undefined);
    const result = selectWallets(mockState);
    expect(result).toEqual([]);
  });

  it('handles wallets with empty groups', () => {
    const walletWithEmptyGroups = {
      id: WALLET_ID_1,
      metadata: { name: 'Empty Groups Wallet' },
      groups: {},
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: walletWithEmptyGroups,
        },
      },
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([walletWithEmptyGroups]);
    expect(result[0].groups).toEqual({});
  });
});

describe('selectMultichainWallets', () => {
  it('returns empty array when multichain accounts feature is disabled', () => {
    const mockState = createMockState(undefined, false);
    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([]);
  });

  it('returns multichain wallets when multichain accounts feature is enabled and multichain wallets exist', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {
          [MULTICHAIN_WALLET_ID_1]: { id: MULTICHAIN_WALLET_ID_1 },
          [MULTICHAIN_WALLET_ID_2]: { id: MULTICHAIN_WALLET_ID_2 },
          [WALLET_ID_1]: { id: WALLET_ID_1 },
          [WALLET_ID_2]: { id: WALLET_ID_2 },
        },
      },
    });
    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([
      { id: MULTICHAIN_WALLET_ID_1 },
      { id: MULTICHAIN_WALLET_ID_2 },
    ]);
  });
});
