import {
  selectAccountSections,
  selectWalletById,
  selectWalletByAccount,
} from './accountTreeController';
import { RootState } from '../../reducers';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const WALLET_ID_A = 'keyring:wallet-a' as const;
const WALLET_ID_B = 'keyring:wallet-b' as const;
const WALLET_ID_NONEXISTENT = 'keyring:nonexistent' as const;
const WALLET_ID_WITH_GROUPS = 'keyring:wallet-with-groups' as const;
const WALLET_ID_EMPTY = 'keyring:empty-wallet' as const;

const ACCOUNT_ID_1 = 'entropy:1/1';
const ACCOUNT_ID_2 = 'entropy:2/1';
const ACCOUNT_ID_3 = 'entropy:3/1';
const ACCOUNT_ID_NONEXISTENT = 'nonexistent-account';

/**
 * Helper function to create a base mock state with RemoteFeatureFlagController
 */
const createMockState = (
  accountTreeController:
    | DeepPartial<AccountTreeControllerState>
    | undefined = {},
  multichainAccountsEnabled: boolean = true,
  internalAccounts: Record<
    string,
    {
      id: string;
      address: string;
      methods: string[];
      options: object;
      type: string;
      metadata: { name: string };
    }
  > = {},
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
        AccountsController: {
          internalAccounts: {
            accounts: internalAccounts,
          },
        },
        KeyringController: {
          keyrings: [],
        },
      },
    },
  } as unknown as RootState);

describe('AccountTreeController Selectors', () => {
  describe('selectAccountSections', () => {
    it('returns null when accountTree is undefined', () => {
      const mockState = createMockState(undefined);

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });

    it('returns null when accountTree.wallets is null', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });

    it('returns wallet sections with accounts when wallets exist', () => {
      const mockInternalAccounts = {
        account1: {
          id: 'account1',
          address: '0x123',
          methods: [],
          options: {},
          type: 'eip155:eoa',
          metadata: { name: 'Account 1' },
        },
        account2: {
          id: 'account2',
          address: '0x456',
          methods: [],
          options: {},
          type: 'eip155:eoa',
          metadata: { name: 'Account 2' },
        },
      };

      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                metadata: {
                  name: 'Wallet 1',
                },
                groups: {
                  'keyring:1/ethereum': {
                    accounts: ['account1'],
                  },
                  'keyring:2/ethereum': {
                    accounts: ['account2'],
                  },
                },
              },
              [WALLET_ID_2]: {
                metadata: {
                  name: 'Wallet 2',
                },
                groups: {
                  'keyring:3/ethereum': {
                    accounts: [],
                  },
                },
              },
            },
          },
        },
        true,
        mockInternalAccounts,
      );

      const result = selectAccountSections(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: {
            groups: {
              'keyring:1/ethereum': {
                accounts: ['account1'],
              },
              'keyring:2/ethereum': {
                accounts: ['account2'],
              },
            },
            metadata: {
              name: 'Wallet 1',
            },
          },
          data: ['account1', 'account2'],
        },
        {
          title: 'Wallet 2',
          wallet: {
            groups: {
              'keyring:3/ethereum': {
                accounts: [],
              },
            },
            metadata: {
              name: 'Wallet 2',
            },
          },
          data: [],
        },
      ]);
    });

    it('returns null when wallets is empty', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });
  });

  describe('selectWalletById', () => {
    it('returns null when accountTree is undefined', () => {
      const mockState = createMockState(undefined);

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns null when multichain accounts feature is disabled', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {},
              },
            },
          },
        },
        false, // multichain accounts disabled
      );

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns wallet when found by ID', () => {
      const mockWallet = {
        id: WALLET_ID_1,
        metadata: { name: 'Wallet 1' },
        groups: {
          'keyring:1/ethereum': {
            accounts: ['account1'],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet,
            [WALLET_ID_2]: {
              id: WALLET_ID_2,
              metadata: { name: 'Wallet 2' },
              groups: {},
            },
          },
        },
      });

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(mockWallet);
    });

    it('returns null when wallet ID is not found', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {},
            },
          },
        },
      });

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_NONEXISTENT);
      expect(result).toEqual(null);
    });

    it('returns null when wallets is empty', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns correct wallet when multiple wallets exist', () => {
      const mockWallet1 = {
        id: WALLET_ID_1,
        metadata: { name: 'First Wallet' },
        groups: {
          'keyring:1/ethereum': {
            accounts: ['eth1'],
          },
        },
      };

      const mockWallet2 = {
        id: WALLET_ID_2,
        metadata: { name: 'Second Wallet' },
        groups: {
          'snap:solana/mainnet': {
            accounts: ['sol1'],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1,
            [WALLET_ID_2]: mockWallet2,
          },
        },
      });

      const selector = selectWalletById(mockState);

      // Test retrieving first wallet
      const result1 = selector(WALLET_ID_1);
      expect(result1).toEqual(mockWallet1);

      // Test retrieving second wallet
      const result2 = selector(WALLET_ID_2);
      expect(result2).toEqual(mockWallet2);
    });

    it('returns wallet with metadata and various group structures', () => {
      const mockWalletWithGroups = {
        id: WALLET_ID_WITH_GROUPS,
        metadata: { name: 'Test Wallet with Groups' },
        groups: {
          'keyring:1/ethereum': {
            accounts: ['eth1', 'eth2'],
          },
          'snap:solana/mainnet': {
            accounts: ['sol1'],
          },
        },
      };

      const mockEmptyWallet = {
        id: WALLET_ID_EMPTY,
        metadata: { name: 'Empty Wallet' },
        groups: {},
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_WITH_GROUPS]: mockWalletWithGroups,
            [WALLET_ID_EMPTY]: mockEmptyWallet,
          },
        },
      });

      const selector = selectWalletById(mockState);

      // Test wallet with groups
      const walletWithGroups = selector(WALLET_ID_WITH_GROUPS);
      expect(walletWithGroups).toEqual(mockWalletWithGroups);
      expect(walletWithGroups?.metadata.name).toBe('Test Wallet with Groups');
      expect(
        walletWithGroups?.groups['keyring:1/ethereum'].accounts,
      ).toHaveLength(2);
      expect(
        walletWithGroups?.groups['snap:solana/mainnet'].accounts,
      ).toHaveLength(1);

      // Test wallet with empty groups
      const emptyWallet = selector(WALLET_ID_EMPTY);
      expect(emptyWallet).toEqual(mockEmptyWallet);
      expect(emptyWallet?.metadata.name).toBe('Empty Wallet');
      expect(Object.keys(emptyWallet?.groups || {})).toHaveLength(0);
    });

    it('selector function can be called multiple times with different IDs', () => {
      const mockWallet1 = {
        id: WALLET_ID_A,
        metadata: { name: 'Wallet A' },
        groups: {},
      };

      const mockWallet2 = {
        id: WALLET_ID_B,
        metadata: { name: 'Wallet B' },
        groups: {},
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_A]: mockWallet1,
            [WALLET_ID_B]: mockWallet2,
          },
        },
      });

      const selector = selectWalletById(mockState);

      // Test multiple calls to the same selector function
      expect(selector(WALLET_ID_A)).toEqual(mockWallet1);
      expect(selector(WALLET_ID_B)).toEqual(mockWallet2);
      expect(selector(WALLET_ID_NONEXISTENT)).toBeNull();
      expect(selector(WALLET_ID_A)).toEqual(mockWallet1); // Test calling again
    });
  });

  describe('selectWalletByAccount', () => {
    it('returns null when accountTree is undefined', () => {
      const mockState = createMockState(undefined);

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(null);
    });

    it('returns null when multichain accounts feature is disabled', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  'keyring:1/ethereum': {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
            },
          },
        },
        false, // multichain accounts disabled
      );

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(null);
    });

    it('returns null when wallets is empty', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(null);
    });

    it('returns null when account ID is not found', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {
                'keyring:1/ethereum': {
                  accounts: [ACCOUNT_ID_1],
                },
              },
            },
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_NONEXISTENT);
      expect(result).toEqual(null);
    });

    it('returns wallet when account is found', () => {
      const mockWallet = {
        id: WALLET_ID_1,
        metadata: { name: 'Wallet 1' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(mockWallet);
    });

    it('returns correct wallet when account is in different groups', () => {
      const mockWallet = {
        id: WALLET_ID_1,
        metadata: { name: 'Wallet 1' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1],
          },
          'snap:solana/mainnet': {
            accounts: [ACCOUNT_ID_2],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);

      // Test account in first group
      const result1 = selector(ACCOUNT_ID_1);
      expect(result1).toEqual(mockWallet);

      // Test account in second group
      const result2 = selector(ACCOUNT_ID_2);
      expect(result2).toEqual(mockWallet);
    });

    it('returns correct wallet when multiple wallets exist', () => {
      const mockWallet1 = {
        id: WALLET_ID_1,
        metadata: { name: 'First Wallet' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1],
          },
        },
      };

      const mockWallet2 = {
        id: WALLET_ID_2,
        metadata: { name: 'Second Wallet' },
        groups: {
          'snap:solana/mainnet': {
            accounts: [ACCOUNT_ID_2],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1,
            [WALLET_ID_2]: mockWallet2,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);

      // Test account in first wallet
      const result1 = selector(ACCOUNT_ID_1);
      expect(result1).toEqual(mockWallet1);

      // Test account in second wallet
      const result2 = selector(ACCOUNT_ID_2);
      expect(result2).toEqual(mockWallet2);
    });

    it('returns null when wallet has empty groups', () => {
      const mockWallet = {
        id: WALLET_ID_EMPTY,
        metadata: { name: 'Empty Wallet' },
        groups: {},
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_EMPTY]: mockWallet,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(null);
    });

    it('returns wallet when account is in group with empty accounts array', () => {
      const mockWallet1 = {
        id: WALLET_ID_1,
        metadata: { name: 'Wallet 1' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [],
          },
        },
      };

      const mockWallet2 = {
        id: WALLET_ID_2,
        metadata: { name: 'Wallet 2' },
        groups: {
          'keyring:2/ethereum': {
            accounts: [ACCOUNT_ID_1],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1,
            [WALLET_ID_2]: mockWallet2,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      const result = selector(ACCOUNT_ID_1);
      expect(result).toEqual(mockWallet2);
    });

    it('selector function can be called multiple times with different account IDs', () => {
      const mockWallet1 = {
        id: WALLET_ID_A,
        metadata: { name: 'Wallet A' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1],
          },
        },
      };

      const mockWallet2 = {
        id: WALLET_ID_B,
        metadata: { name: 'Wallet B' },
        groups: {
          'keyring:2/ethereum': {
            accounts: [ACCOUNT_ID_2, ACCOUNT_ID_3],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_A]: mockWallet1,
            [WALLET_ID_B]: mockWallet2,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);

      // Test multiple calls to the same selector function
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWallet1);
      expect(selector(ACCOUNT_ID_2)).toEqual(mockWallet2);
      expect(selector(ACCOUNT_ID_3)).toEqual(mockWallet2);
      expect(selector(ACCOUNT_ID_NONEXISTENT)).toBeNull();
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWallet1); // Test calling again
    });

    it('returns wallet with complex group structure containing multiple accounts', () => {
      const mockWallet = {
        id: WALLET_ID_WITH_GROUPS,
        metadata: { name: 'Complex Wallet' },
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
          },
          'snap:solana/mainnet': {
            accounts: [ACCOUNT_ID_3],
          },
          'keyring:2/ethereum': {
            accounts: [],
          },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_WITH_GROUPS]: mockWallet,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);

      // Test all accounts in different groups
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWallet);
      expect(selector(ACCOUNT_ID_2)).toEqual(mockWallet);
      expect(selector(ACCOUNT_ID_3)).toEqual(mockWallet);
    });
  });
});
