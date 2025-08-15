import {
  selectAccountSections,
  selectWalletById,
  selectWalletByAccount,
  selectAccountGroups,
  selectAccountGroupsByWallet,
  selectSelectedAccountGroup,
  selectAccountTreeControllerState,
  selectWalletsMap,
  selectAccountToWalletMap,
  selectAccountToGroupMap,
  selectMultichainAccountGroups,
  selectSingleAccountGroups,
  selectAccountGroupById,
  selectSelectedAccountGroupId,
} from './accountTreeController';
import { RootState } from '../../reducers';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const WALLET_ID_NONEXISTENT = 'keyring:nonexistent' as const;
const WALLET_ID_WITH_GROUPS = 'keyring:wallet-with-groups' as const;
const WALLET_ID_EMPTY = 'keyring:empty-wallet' as const;
const WALLET_ID_A = 'keyring:wallet-a' as const;
const WALLET_ID_B = 'keyring:wallet-b' as const;

const ACCOUNT_ID_1 = 'entropy:1/1';
const ACCOUNT_ID_2 = 'entropy:2/1';
const ACCOUNT_ID_3 = 'entropy:3/1';
const ACCOUNT_ID_4 = 'keyring:4/1';
const ACCOUNT_ID_5 = 'keyring:5/1';
const ACCOUNT_ID_NONEXISTENT = 'nonexistent-account';

const GROUP_ID_1 = 'keyring:wallet1/1' as const;
const GROUP_ID_2 = 'entropy:wallet1/2' as const;
const GROUP_ID_NONEXISTENT = 'keyring:nonexistent/1' as const;

// Helper functions to reduce duplication
const createMockWallet = (
  id: `keyring:${string}` | `entropy:${string}` | `snap:${string}`,
  name: string,
  groups: Record<string, { accounts: string[] }> = {},
) => ({
  id,
  metadata: { name },
  groups,
});

const createMockGroup = (accounts: string[]) => ({ accounts });

const createMockState = (
  accountTreeController: Record<string, unknown> = {},
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

const createStateWithSelectedAccount = (
  accountTreeController: Record<string, unknown> | undefined,
  selectedAccount: string | null,
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            enableMultichainAccounts: {
              enabled: true,
              featureVersion: '1',
              minimumVersion: '1.0.0',
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: selectedAccount
              ? {
                  [selectedAccount]: {
                    id: selectedAccount,
                    address: '0x123',
                    methods: [],
                    options: {},
                    type: 'eip155:eoa',
                    metadata: { name: 'Test Account' },
                  },
                }
              : {},
            selectedAccount,
          },
        },
        KeyringController: {
          keyrings: [],
        },
      },
    },
  } as unknown as RootState);

// Common test data
const mockWallet1 = createMockWallet(WALLET_ID_1, 'Wallet 1', {
  'keyring:1/ethereum': createMockGroup([ACCOUNT_ID_1, ACCOUNT_ID_2]),
  'snap:solana/mainnet': createMockGroup([ACCOUNT_ID_3]),
});

const mockWallet2 = createMockWallet(WALLET_ID_2, 'Wallet 2', {
  'keyring:2/ethereum': createMockGroup([]),
});

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

// Helper function for wallet tests
const createWalletTestState = (wallets: Record<string, unknown> | undefined) =>
  createMockState({ accountTree: { wallets: wallets || {} } });

describe('AccountTreeController Selectors', () => {
  describe('selectAccountSections', () => {
    it.each([
      ['undefined accountTree', undefined, []],
      ['empty wallets', { accountTree: { wallets: {} } }, []],
    ])('returns %s correctly', (_, accountTreeController, expected) => {
      const mockState = createMockState(accountTreeController);
      const result = selectAccountSections(mockState);
      expect(result).toEqual(expected);
    });

    it('returns wallet sections with accounts when wallets exist', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                ...mockWallet1,
                groups: {
                  'keyring:1/ethereum': {
                    accounts: ['account1'] as [string],
                    type: 'keyring',
                    metadata: { name: 'Account 1' },
                  },
                  'keyring:2/ethereum': {
                    accounts: ['account2'] as [string],
                    type: 'keyring',
                    metadata: { name: 'Account 2' },
                  },
                },
              },
              [WALLET_ID_2]: {
                ...mockWallet2,
                groups: {
                  'keyring:3/ethereum': {
                    accounts: [],
                    type: 'keyring',
                    metadata: { name: 'Account 1' },
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
          wallet: expect.objectContaining({
            id: WALLET_ID_1,
            groups: expect.any(Object),
          }),
          data: ['account1', 'account2'],
        },
        {
          title: 'Wallet 2',
          wallet: expect.objectContaining({
            id: WALLET_ID_2,
            groups: expect.any(Object),
          }),
          data: [],
        },
      ]);
    });

    it('returns empty array when wallets is empty', () => {
      const mockState = createMockState({
        accountTree: { wallets: {} },
      });
      expect(selectAccountSections(mockState)).toEqual([]);
    });
  });

  describe('selectWalletById', () => {
    it.each([
      ['undefined accountTree', undefined, WALLET_ID_1, null],
      ['empty wallets', {}, WALLET_ID_1, null],
      [
        'wallet not found',
        { [WALLET_ID_1]: mockWallet1 },
        WALLET_ID_NONEXISTENT,
        null,
      ],
    ])('returns %s correctly', (_, wallets, walletId, expected) => {
      const mockState = createWalletTestState(wallets);
      const result = selectWalletById(mockState)(walletId);
      expect(result).toEqual(expected);
    });

    it('returns wallet when found by ID', () => {
      const mockState = createWalletTestState({
        [WALLET_ID_1]: mockWallet1,
        [WALLET_ID_2]: mockWallet2,
      });

      const selector = selectWalletById(mockState);
      expect(selector(WALLET_ID_1)).toEqual(mockWallet1);
      expect(selector(WALLET_ID_2)).toEqual(mockWallet2);
    });

    it('returns wallet when multichain accounts feature is disabled', () => {
      const mockState = createMockState(
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } } },
        false,
      );

      const result = selectWalletById(mockState)(WALLET_ID_1);
      expect(result).toEqual(mockWallet1);
    });

    it('returns wallet with metadata and various group structures', () => {
      const mockWalletWithGroups = {
        id: WALLET_ID_WITH_GROUPS,
        metadata: { name: 'Test Wallet with Groups' },
        groups: {
          'keyring:1/ethereum': {
            accounts: ['eth1', 'eth2'] as [string, ...string[]],
          },
          'snap:solana/mainnet': { accounts: ['sol1'] as [string] },
        },
      };

      const mockState = createWalletTestState({
        [WALLET_ID_WITH_GROUPS]: mockWalletWithGroups,
        [WALLET_ID_EMPTY]: {
          id: WALLET_ID_EMPTY,
          metadata: { name: 'Empty Wallet' },
          groups: {},
        },
      });

      const selector = selectWalletById(mockState);
      const walletWithGroups = selector(WALLET_ID_WITH_GROUPS);
      const emptyWallet = selector(WALLET_ID_EMPTY);

      expect(walletWithGroups?.metadata.name).toBe('Test Wallet with Groups');
      expect(
        walletWithGroups?.groups['keyring:1/ethereum'].accounts,
      ).toHaveLength(2);
      expect(
        walletWithGroups?.groups['snap:solana/mainnet'].accounts,
      ).toHaveLength(1);
      expect(emptyWallet?.metadata.name).toBe('Empty Wallet');
      expect(Object.keys(emptyWallet?.groups || {})).toHaveLength(0);
    });

    it('selector function can be called multiple times with different IDs', () => {
      const mockState = createWalletTestState({
        [WALLET_ID_A]: {
          id: WALLET_ID_A,
          metadata: { name: 'Wallet A' },
          groups: {},
        },
        [WALLET_ID_B]: {
          id: WALLET_ID_B,
          metadata: { name: 'Wallet B' },
          groups: {},
        },
      });

      const selector = selectWalletById(mockState);
      expect(selector(WALLET_ID_A)).toEqual(
        expect.objectContaining({ id: WALLET_ID_A }),
      );
      expect(selector(WALLET_ID_B)).toEqual(
        expect.objectContaining({ id: WALLET_ID_B }),
      );
      expect(selector(WALLET_ID_NONEXISTENT)).toBeNull();
    });
  });

  describe('selectWalletByAccount', () => {
    it.each([
      ['undefined accountTree', undefined, ACCOUNT_ID_1, null],
      ['empty wallets', { accountTree: { wallets: {} } }, ACCOUNT_ID_1, null],
      [
        'account not found',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } } },
        ACCOUNT_ID_NONEXISTENT,
        null,
      ],
    ])(
      'returns %s correctly',
      (_, accountTreeController, accountId, expected) => {
        const mockState = createMockState(accountTreeController);
        const result = selectWalletByAccount(mockState)(accountId);
        expect(result).toEqual(expected);
      },
    );

    it('returns correct wallet for accounts in different groups', () => {
      const mockState = createMockState({
        accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } },
      });

      const selector = selectWalletByAccount(mockState);
      [ACCOUNT_ID_1, ACCOUNT_ID_2, ACCOUNT_ID_3].forEach((accountId) => {
        expect(selector(accountId)).toEqual(mockWallet1);
      });
    });

    it('returns wallet when account is found', () => {
      const mockWalletFound = {
        ...mockWallet1,
        groups: {
          'keyring:1/ethereum': {
            accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2] as [string, ...string[]],
          },
        },
      };

      const mockState = createMockState({
        accountTree: { wallets: { [WALLET_ID_1]: mockWalletFound } },
      });

      const result = selectWalletByAccount(mockState)(ACCOUNT_ID_1);
      expect(result).toEqual(mockWalletFound);
    });

    it('returns correct wallet when multiple wallets exist', () => {
      const mockWallet1Simple = {
        ...mockWallet1,
        groups: { 'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1] } },
      };
      const mockWallet2Simple = {
        ...mockWallet2,
        groups: { 'snap:solana/mainnet': { accounts: [ACCOUNT_ID_2] } },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1Simple,
            [WALLET_ID_2]: mockWallet2Simple,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWallet1Simple);
      expect(selector(ACCOUNT_ID_2)).toEqual(mockWallet2Simple);
    });

    it('returns null when wallet has empty groups', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_EMPTY]: {
              id: WALLET_ID_EMPTY,
              metadata: { name: 'Empty Wallet' },
              groups: {},
            },
          },
        },
      });

      const result = selectWalletByAccount(mockState)(ACCOUNT_ID_1);
      expect(result).toEqual(null);
    });

    it('returns wallet when account is in group with empty accounts array', () => {
      const mockWallet1Empty = {
        ...mockWallet1,
        groups: { 'keyring:1/ethereum': { accounts: [] } },
      };
      const mockWallet2WithAccount = {
        ...mockWallet2,
        groups: { 'keyring:2/ethereum': { accounts: [ACCOUNT_ID_1] } },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1Empty,
            [WALLET_ID_2]: mockWallet2WithAccount,
          },
        },
      });

      const result = selectWalletByAccount(mockState)(ACCOUNT_ID_1);
      expect(result).toEqual(mockWallet2WithAccount);
    });

    it('selector function can be called multiple times with different account IDs', () => {
      const mockWalletA = {
        id: WALLET_ID_A,
        metadata: { name: 'Wallet A' },
        groups: { 'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1] } },
      };
      const mockWalletB = {
        id: WALLET_ID_B,
        metadata: { name: 'Wallet B' },
        groups: {
          'keyring:2/ethereum': { accounts: [ACCOUNT_ID_2, ACCOUNT_ID_3] },
        },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: { [WALLET_ID_A]: mockWalletA, [WALLET_ID_B]: mockWalletB },
        },
      });

      const selector = selectWalletByAccount(mockState);
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWalletA);
      expect(selector(ACCOUNT_ID_2)).toEqual(mockWalletB);
      expect(selector(ACCOUNT_ID_3)).toEqual(mockWalletB);
      expect(selector(ACCOUNT_ID_NONEXISTENT)).toBeNull();
    });

    it('returns wallet with complex group structure containing multiple accounts', () => {
      const complexWallet = {
        id: WALLET_ID_WITH_GROUPS,
        metadata: { name: 'Complex Wallet' },
        groups: {
          'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2] },
          'snap:solana/mainnet': { accounts: [ACCOUNT_ID_3] },
          'keyring:2/ethereum': { accounts: [] },
        },
      };

      const mockState = createMockState({
        accountTree: { wallets: { [WALLET_ID_WITH_GROUPS]: complexWallet } },
      });

      const selector = selectWalletByAccount(mockState);
      [ACCOUNT_ID_1, ACCOUNT_ID_2, ACCOUNT_ID_3].forEach((accountId) => {
        expect(selector(accountId)).toEqual(complexWallet);
      });
    });
  });

  describe('selectAccountGroups', () => {
    it('returns account groups when wallets exist', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': {
                  accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
                },
                'snap:solana/mainnet': { accounts: [ACCOUNT_ID_3] },
              },
            },
          },
        },
      });

      const result = selectAccountGroups(mockState);
      expect(result).toEqual([
        { accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2] },
        { accounts: [ACCOUNT_ID_3] },
      ]);
    });

    it('returns account groups when multichain accounts is disabled', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                ...mockWallet1,
                groups: { 'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1] } },
              },
            },
          },
        },
        false,
      );

      const result = selectAccountGroups(mockState);
      expect(result).toEqual([{ accounts: [ACCOUNT_ID_1] }]);
    });
  });

  describe('selectAccountGroupsByWallet', () => {
    it('returns account groups for specific wallet', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': {
                  accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
                },
                'snap:solana/mainnet': { accounts: [ACCOUNT_ID_3] },
              },
            },
          },
        },
      });

      const result = selectAccountGroupsByWallet(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: expect.objectContaining({ id: WALLET_ID_1 }),
          data: [
            { accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2] },
            { accounts: [ACCOUNT_ID_3] },
          ],
        },
      ]);
    });

    it('returns account groups when multichain accounts is disabled', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                ...mockWallet1,
                groups: { 'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1] } },
              },
            },
          },
        },
        false,
      );

      const result = selectAccountGroupsByWallet(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: expect.objectContaining({ id: WALLET_ID_1 }),
          data: [{ accounts: [ACCOUNT_ID_1] }],
        },
      ]);
    });

    it('returns empty array for non-existent wallet', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: { ...mockWallet1, groups: {} },
          },
        },
      });

      const result = selectAccountGroupsByWallet(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: expect.objectContaining({ id: WALLET_ID_1 }),
          data: [],
        },
      ]);
    });
  });

  describe('selectSelectedAccountGroup', () => {
    it.each([
      ['undefined accountTree', undefined, ACCOUNT_ID_1, null],
      ['empty wallets', { accountTree: { wallets: {} } }, ACCOUNT_ID_1, null],
      [
        'account not found',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } } },
        ACCOUNT_ID_NONEXISTENT,
        null,
      ],
    ])(
      'returns %s correctly',
      (_, accountTreeController, selectedAccount, expected) => {
        const mockState = createStateWithSelectedAccount(
          accountTreeController,
          selectedAccount,
        );
        const result = selectSelectedAccountGroup(mockState);
        expect(result).toEqual(expected);
      },
    );

    it('returns account group when selected account is found', () => {
      const mockState = createStateWithSelectedAccount(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                ...mockWallet1,
                groups: { 'keyring:1/ethereum': { accounts: [ACCOUNT_ID_1] } },
              },
            },
          },
        },
        ACCOUNT_ID_1,
      );

      const result = selectSelectedAccountGroup(mockState);
      expect(result).toEqual({ accounts: [ACCOUNT_ID_1] });
    });
  });

  describe('selectAccountTreeControllerState', () => {
    it('returns AccountTreeController state from root state', () => {
      const mockAccountTreeState = {
        accountTree: {
          wallets: { [WALLET_ID_1]: mockWallet1 },
        },
      };
      const mockState = createMockState(mockAccountTreeState);

      const result = selectAccountTreeControllerState(mockState);
      expect(result).toEqual(mockAccountTreeState);
    });

    it('returns undefined when AccountTreeController is not present', () => {
      const mockState = {
        engine: {
          backgroundState: {},
        },
      } as unknown as RootState;

      const result = selectAccountTreeControllerState(mockState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectWalletsMap', () => {
    it('returns wallets map when accountTree exists', () => {
      const walletsMap = {
        [WALLET_ID_1]: mockWallet1,
        [WALLET_ID_2]: mockWallet2,
      };
      const mockState = createMockState({
        accountTree: { wallets: walletsMap },
      });

      const result = selectWalletsMap(mockState);
      expect(result).toEqual(walletsMap);
    });

    it('returns null when accountTree is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectWalletsMap(mockState);
      expect(result).toBeNull();
    });

    it('returns null when wallets is undefined', () => {
      const mockState = createMockState({ accountTree: {} });
      const result = selectWalletsMap(mockState);
      expect(result).toBeNull();
    });
  });

  describe('selectAccountToWalletMap', () => {
    it('creates reverse mapping from account ID to wallet ID', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': {
                  accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
                },
                'snap:solana/mainnet': { accounts: [ACCOUNT_ID_3] },
              },
            },
            [WALLET_ID_2]: {
              ...mockWallet2,
              groups: {
                'keyring:2/ethereum': { accounts: [ACCOUNT_ID_4] },
              },
            },
          },
        },
      });

      const result = selectAccountToWalletMap(mockState);
      expect(result).toEqual({
        [ACCOUNT_ID_1]: WALLET_ID_1,
        [ACCOUNT_ID_2]: WALLET_ID_1,
        [ACCOUNT_ID_3]: WALLET_ID_1,
        [ACCOUNT_ID_4]: WALLET_ID_2,
      });
    });

    it('returns empty object when no wallets exist', () => {
      const mockState = createMockState({ accountTree: { wallets: {} } });
      const result = selectAccountToWalletMap(mockState);
      expect(result).toEqual({});
    });

    it('returns empty object when accountTree is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectAccountToWalletMap(mockState);
      expect(result).toEqual({});
    });

    it('handles wallets with empty groups', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_EMPTY]: {
              id: WALLET_ID_EMPTY,
              metadata: { name: 'Empty Wallet' },
              groups: {},
            },
          },
        },
      });

      const result = selectAccountToWalletMap(mockState);
      expect(result).toEqual({});
    });

    it('handles groups with empty accounts arrays', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': { accounts: [] },
                'snap:solana/mainnet': { accounts: [ACCOUNT_ID_1] },
              },
            },
          },
        },
      });

      const result = selectAccountToWalletMap(mockState);
      expect(result).toEqual({
        [ACCOUNT_ID_1]: WALLET_ID_1,
      });
    });
  });

  describe('selectAccountToGroupMap', () => {
    it('creates reverse mapping from account ID to group object', () => {
      const ethereumGroup = { accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2] };
      const solanaGroup = { accounts: [ACCOUNT_ID_3] };
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': ethereumGroup,
                'snap:solana/mainnet': solanaGroup,
              },
            },
          },
        },
      });

      const result = selectAccountToGroupMap(mockState);
      expect(result).toEqual({
        [ACCOUNT_ID_1]: ethereumGroup,
        [ACCOUNT_ID_2]: ethereumGroup,
        [ACCOUNT_ID_3]: solanaGroup,
      });
    });

    it('returns empty object when no wallets exist', () => {
      const mockState = createMockState({ accountTree: { wallets: {} } });
      const result = selectAccountToGroupMap(mockState);
      expect(result).toEqual({});
    });

    it('returns empty object when accountTree is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectAccountToGroupMap(mockState);
      expect(result).toEqual({});
    });

    it('handles multiple wallets correctly', () => {
      const group1 = { accounts: [ACCOUNT_ID_1] };
      const group2 = { accounts: [ACCOUNT_ID_2] };
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: { 'keyring:1/ethereum': group1 },
            },
            [WALLET_ID_2]: {
              ...mockWallet2,
              groups: { 'keyring:2/ethereum': group2 },
            },
          },
        },
      });

      const result = selectAccountToGroupMap(mockState);
      expect(result).toEqual({
        [ACCOUNT_ID_1]: group1,
        [ACCOUNT_ID_2]: group2,
      });
    });
  });

  describe('selectMultichainAccountGroups', () => {
    it('filters account groups that start with entropy prefix', () => {
      const entropyGroup = {
        id: 'entropy:wallet1/ethereum',
        accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
      };
      const keyringGroup = {
        id: 'keyring:wallet1/ethereum',
        accounts: [ACCOUNT_ID_4],
      };
      const snapGroup = {
        id: 'snap:wallet1/solana',
        accounts: [ACCOUNT_ID_5],
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                [entropyGroup.id]: entropyGroup,
                [keyringGroup.id]: keyringGroup,
                [snapGroup.id]: snapGroup,
              },
            },
          },
        },
      });

      const result = selectMultichainAccountGroups(mockState);
      expect(result).toEqual([entropyGroup]);
    });

    it('returns empty array when no entropy groups exist', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'keyring:1/ethereum': {
                  accounts: [ACCOUNT_ID_1],
                  id: 'keyring:1/ethereum',
                },
                'snap:solana/mainnet': {
                  accounts: [ACCOUNT_ID_2],
                  id: 'snap:solana/mainnet',
                },
              },
            },
          },
        },
      });

      const result = selectMultichainAccountGroups(mockState);
      expect(result).toEqual([]);
    });

    it('returns empty array when no wallets exist', () => {
      const mockState = createMockState({ accountTree: { wallets: {} } });
      const result = selectMultichainAccountGroups(mockState);
      expect(result).toEqual([]);
    });
  });

  describe('selectSingleAccountGroups', () => {
    it('filters account groups that do not start with entropy prefix', () => {
      const entropyGroup = {
        id: 'entropy:wallet1/ethereum',
        accounts: [ACCOUNT_ID_1],
      };
      const keyringGroup = {
        id: 'keyring:wallet1/ethereum',
        accounts: [ACCOUNT_ID_2],
      };
      const snapGroup = {
        id: 'snap:wallet1/solana',
        accounts: [ACCOUNT_ID_3],
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                [entropyGroup.id]: entropyGroup,
                [keyringGroup.id]: keyringGroup,
                [snapGroup.id]: snapGroup,
              },
            },
          },
        },
      });

      const result = selectSingleAccountGroups(mockState);
      expect(result).toEqual([keyringGroup, snapGroup]);
    });

    it('returns empty array when only entropy groups exist', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                'entropy:1/ethereum': {
                  accounts: [ACCOUNT_ID_1],
                  id: 'entropy:1/ethereum',
                },
                'entropy:2/solana': {
                  accounts: [ACCOUNT_ID_2],
                  id: 'entropy:2/solana',
                },
              },
            },
          },
        },
      });

      const result = selectSingleAccountGroups(mockState);
      expect(result).toEqual([]);
    });

    it('returns all groups when no entropy groups exist', () => {
      const keyringGroup = {
        id: 'keyring:wallet1/ethereum',
        accounts: [ACCOUNT_ID_1],
      };
      const snapGroup = {
        id: 'snap:wallet1/solana',
        accounts: [ACCOUNT_ID_2],
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                [keyringGroup.id]: keyringGroup,
                [snapGroup.id]: snapGroup,
              },
            },
          },
        },
      });

      const result = selectSingleAccountGroups(mockState);
      expect(result).toEqual([keyringGroup, snapGroup]);
    });
  });

  describe('selectAccountGroupById', () => {
    it('returns account group when found by ID', () => {
      const targetGroup = {
        id: GROUP_ID_1,
        accounts: [ACCOUNT_ID_1, ACCOUNT_ID_2],
        type: 'keyring',
        metadata: { name: 'Ethereum Group' },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                [GROUP_ID_1]: targetGroup,
                [GROUP_ID_2]: {
                  id: GROUP_ID_2,
                  accounts: [ACCOUNT_ID_3],
                  type: 'entropy',
                  metadata: { name: 'Entropy Group' },
                },
              },
            },
          },
        },
      });

      const result = selectAccountGroupById(mockState, GROUP_ID_1);
      expect(result).toEqual(targetGroup);
    });

    it('returns undefined when account group is not found', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {
                [GROUP_ID_1]: {
                  id: GROUP_ID_1,
                  accounts: [ACCOUNT_ID_1],
                  type: 'keyring',
                  metadata: { name: 'Ethereum Group' },
                },
              },
            },
          },
        },
      });

      const result = selectAccountGroupById(mockState, GROUP_ID_NONEXISTENT);
      expect(result).toBeUndefined();
    });

    it('returns undefined when wallet is not found', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const result = selectAccountGroupById(mockState, GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('returns undefined when accountTree is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectAccountGroupById(mockState, GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('handles malformed group ID gracefully', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              ...mockWallet1,
              groups: {},
            },
          },
        },
      });

      const malformedGroupId = 'keyring:invalid-group-id' as Parameters<
        typeof selectAccountGroupById
      >[1];
      const result = selectAccountGroupById(mockState, malformedGroupId);
      expect(result).toBeUndefined();
    });

    it('correctly extracts wallet ID from group ID and finds group', () => {
      const groupId = 'keyring:test-wallet/ethereum' as Parameters<
        typeof selectAccountGroupById
      >[1];
      const walletId = 'keyring:test-wallet' as const;
      const targetGroup = {
        id: groupId,
        accounts: [ACCOUNT_ID_1],
        type: 'keyring',
        metadata: { name: 'Test Group' },
      };

      const mockState = createMockState({
        accountTree: {
          wallets: {
            [walletId]: {
              id: walletId,
              metadata: { name: 'Test Wallet' },
              groups: {
                [groupId]: targetGroup,
              },
            },
          },
        },
      });

      const result = selectAccountGroupById(mockState, groupId);
      expect(result).toEqual(targetGroup);
    });
  });

  describe('selectSelectedAccountGroupId', () => {
    it('returns undefined when AccountTreeController is undefined', () => {
      const mockState = createMockState(undefined);
      const result = selectSelectedAccountGroupId(mockState);
      expect(result).toBe(null);
    });

    it('returns undefined when selectedAccountGroup is undefined', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: undefined,
          wallets: {},
        },
      });

      const result = selectSelectedAccountGroupId(mockState);
      expect(result).toBe(null);
    });

    it('returns selected account group ID', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: 'keyring:1/ethereum',
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {},
            },
          },
        },
      });

      const result = selectSelectedAccountGroupId(mockState);
      expect(result).toBe('keyring:1/ethereum');
    });
  });
});
