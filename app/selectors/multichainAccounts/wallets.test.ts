import { selectMultichainWallets } from './wallets';
import { RootState } from '../../reducers';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;

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

describe('selectMultichainWallets', () => {
  it('returns empty array when multichain accounts feature is disabled', () => {
    const mockState = createMockState(
      {
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {
                'keyring:1:ethereum': {
                  accounts: ['account1'],
                },
              },
            },
            [WALLET_ID_2]: {
              id: WALLET_ID_2,
              metadata: { name: 'Wallet 2' },
              groups: {
                'keyring:2:ethereum': {
                  accounts: ['account2'],
                },
              },
            },
          },
        },
      },
      false,
    );

    const result = selectMultichainWallets(mockState);
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

    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([wallet1, wallet2]);
  });

  it('returns empty array when multichain accounts feature is enabled but no wallets exist', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {},
      },
    });

    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([]);
  });

  it('returns empty array when accountTree is undefined', () => {
    const mockState = createMockState(undefined);
    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([]);
  });

  it('preserves wallet object structure when returning wallets', () => {
    const complexWallet = {
      id: WALLET_ID_1,
      metadata: {
        name: 'Complex Wallet',
        created: '2024-01-01',
        type: 'HD',
      },
      groups: {
        'keyring:1:ethereum': {
          accounts: ['account1', 'account2'],
        },
        'snap:solana:mainnet': {
          accounts: ['account3'],
        },
      },
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: complexWallet,
        },
      },
    });

    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([complexWallet]);
    expect(result[0]).toHaveProperty('metadata');
    expect(result[0].metadata.name).toBe('Complex Wallet');
    expect(result[0].groups).toHaveProperty('keyring:1:ethereum');
    expect(result[0].groups).toHaveProperty('snap:solana:mainnet');
  });

  it('returns wallets in the order they appear in Object.values', () => {
    const firstWallet = {
      id: WALLET_ID_1,
      metadata: { name: 'First Wallet' },
      groups: {
        'keyring:1:ethereum': {
          accounts: ['account1'],
        },
      },
    };

    const secondWallet = {
      id: WALLET_ID_2,
      metadata: { name: 'Second Wallet' },
      groups: {
        'keyring:2:ethereum': {
          accounts: ['account2'],
        },
      },
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: firstWallet,
          [WALLET_ID_2]: secondWallet,
        },
      },
    });

    const result = selectMultichainWallets(mockState);

    expect(result).toHaveLength(2);
    expect(result[0].metadata.name).toBe('First Wallet');
    expect(result[1].metadata.name).toBe('Second Wallet');
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

    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([walletWithEmptyGroups]);
    expect(result[0].groups).toEqual({});
  });
});
