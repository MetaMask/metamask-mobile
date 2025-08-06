import {
  selectAccountSections,
  selectWalletById,
  selectWalletByAccount,
  selectAccountGroups,
  selectAccountGroupsByWallet,
  selectSelectedAccountGroup,
  selectValidatedAccountTreeState,
} from './accountTreeController';
import { RootState } from '../../reducers';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const WALLET_ID_NONEXISTENT = 'keyring:nonexistent' as const;

const ACCOUNT_ID_1 = 'entropy:1/1';
const ACCOUNT_ID_2 = 'entropy:2/1';
const ACCOUNT_ID_3 = 'entropy:3/1';
const ACCOUNT_ID_NONEXISTENT = 'nonexistent-account';

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

describe('AccountTreeController Selectors', () => {
  describe('selectValidatedAccountTreeState', () => {
    it.each([
      ['undefined accountTree', undefined, false],
      ['disabled multichain accounts', { accountTree: { wallets: {} } }, false],
      ['empty wallets', { accountTree: { wallets: {} } }, false],
      [
        'valid wallets',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
        true,
      ],
    ])('returns %s correctly', (_, accountTreeController, expectedIsValid) => {
      const mockState = createMockState(accountTreeController, expectedIsValid);
      const result = selectValidatedAccountTreeState(mockState);
      expect(result.isValid).toBe(expectedIsValid);
    });
  });

  describe('selectAccountSections', () => {
    it.each([
      ['disabled multichain accounts', { accountTree: { wallets: {} } }, []],
      ['empty wallets', { accountTree: { wallets: {} } }, []],
    ])('returns %s correctly', (_, accountTreeController, expected) => {
      const mockState = createMockState(accountTreeController);
      const result = selectAccountSections(mockState);
      expect(result).toEqual(expected);
    });

    it('returns wallet sections with accounts when wallets exist', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1', {
              'keyring:1/ethereum': createMockGroup(['account1']),
              'keyring:2/ethereum': createMockGroup(['account2']),
            }),
            [WALLET_ID_2]: createMockWallet(WALLET_ID_2, 'Wallet 2', {
              'keyring:3/ethereum': createMockGroup([]),
            }),
          },
        },
      });

      const result = selectAccountSections(mockState);
      expect(result).toHaveLength(2);
      expect(result?.[0].title).toBe('Wallet 1');
      expect(result?.[0].data).toEqual(['account1', 'account2']);
      expect(result?.[1].title).toBe('Wallet 2');
      expect(result?.[1].data).toEqual([]);
    });
  });

  describe('selectWalletById', () => {
    const mockWallet1 = createMockWallet(WALLET_ID_1, 'Wallet 1');
    const mockWallet2 = createMockWallet(WALLET_ID_2, 'Wallet 2');

    it.each([
      [
        'disabled multichain accounts',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } } },
        WALLET_ID_1,
        null,
      ],
      ['empty wallets', { accountTree: { wallets: {} } }, WALLET_ID_1, null],
      [
        'wallet not found',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet1 } } },
        WALLET_ID_NONEXISTENT,
        null,
      ],
    ])(
      'returns %s correctly',
      (_, accountTreeController, walletId, expected) => {
        const isDisabled = expected === null && accountTreeController;
        const mockState = createMockState(accountTreeController, !isDisabled);
        const selector = selectWalletById(mockState);
        expect(selector(walletId)).toEqual(expected);
      },
    );

    it('returns correct wallets when found', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet1,
            [WALLET_ID_2]: mockWallet2,
          },
        },
      });

      const selector = selectWalletById(mockState);
      expect(selector(WALLET_ID_1)).toEqual(mockWallet1);
      expect(selector(WALLET_ID_2)).toEqual(mockWallet2);
    });
  });

  describe('selectWalletByAccount', () => {
    const mockWallet = createMockWallet(WALLET_ID_1, 'Wallet 1', {
      'keyring:1/ethereum': createMockGroup([ACCOUNT_ID_1, ACCOUNT_ID_2]),
      'snap:solana/mainnet': createMockGroup([ACCOUNT_ID_3]),
    });

    it.each([
      [
        'disabled multichain accounts',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet } } },
        ACCOUNT_ID_1,
        null,
      ],
      ['empty wallets', { accountTree: { wallets: {} } }, ACCOUNT_ID_1, null],
      [
        'account not found',
        { accountTree: { wallets: { [WALLET_ID_1]: mockWallet } } },
        ACCOUNT_ID_NONEXISTENT,
        null,
      ],
    ])(
      'returns %s correctly',
      (_, accountTreeController, accountId, expected) => {
        const isDisabled = expected === null && accountTreeController;
        const mockState = createMockState(accountTreeController, !isDisabled);
        const selector = selectWalletByAccount(mockState);
        expect(selector(accountId)).toEqual(expected);
      },
    );

    it('returns correct wallet for accounts in different groups', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: mockWallet,
          },
        },
      });

      const selector = selectWalletByAccount(mockState);
      expect(selector(ACCOUNT_ID_1)).toEqual(mockWallet);
      expect(selector(ACCOUNT_ID_2)).toEqual(mockWallet);
      expect(selector(ACCOUNT_ID_3)).toEqual(mockWallet);
    });
  });

  describe('selectAccountGroups', () => {
    it.each([
      [
        'disabled multichain accounts',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
        [],
      ],
      ['empty wallets', { accountTree: { wallets: {} } }, []],
      [
        'empty groups',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1', {}),
            },
          },
        },
        [],
      ],
    ])('returns %s correctly', (_, accountTreeController, expected) => {
      const mockState = createMockState(accountTreeController);
      const result = selectAccountGroups(mockState);
      expect(result).toEqual(expected);
    });

    it('returns all account groups from multiple wallets', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1', {
              'keyring:1/ethereum': createMockGroup([ACCOUNT_ID_1]),
              'keyring:2/ethereum': createMockGroup([ACCOUNT_ID_2]),
            }),
            [WALLET_ID_2]: createMockWallet(WALLET_ID_2, 'Wallet 2', {
              'snap:solana/mainnet': createMockGroup([ACCOUNT_ID_3]),
            }),
          },
        },
      });

      const result = selectAccountGroups(mockState);
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        createMockGroup([ACCOUNT_ID_1]),
        createMockGroup([ACCOUNT_ID_2]),
        createMockGroup([ACCOUNT_ID_3]),
      ]);
    });
  });

  describe('selectAccountGroupsByWallet', () => {
    it.each([
      [
        'disabled multichain accounts',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
        null,
      ],
      ['empty wallets', { accountTree: { wallets: {} } }, null],
    ])('returns %s correctly', (_, accountTreeController, expected) => {
      const isDisabled = expected === null && accountTreeController;
      const mockState = createMockState(accountTreeController, !isDisabled);
      const result = selectAccountGroupsByWallet(mockState);
      expect(result).toEqual(expected);
    });

    it('returns wallet sections with account groups', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1', {
              'keyring:1/ethereum': createMockGroup([ACCOUNT_ID_1]),
              'keyring:2/ethereum': createMockGroup([ACCOUNT_ID_2]),
            }),
            [WALLET_ID_2]: createMockWallet(WALLET_ID_2, 'Wallet 2', {
              'snap:solana/mainnet': createMockGroup([ACCOUNT_ID_3]),
            }),
          },
        },
      });

      const result = selectAccountGroupsByWallet(mockState);
      expect(result).toHaveLength(2);
      expect(result?.[0].title).toBe('Wallet 1');
      expect(result?.[0].data).toHaveLength(2);
      expect(result?.[1].title).toBe('Wallet 2');
      expect(result?.[1].data).toHaveLength(1);
    });
  });

  describe('selectSelectedAccountGroup', () => {
    const createStateWithSelectedAccount = (
      accountTreeController:
        | DeepPartial<AccountTreeControllerState>
        | undefined,
      selectedAccount: string,
    ) =>
      ({
        ...createMockState(accountTreeController),
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
                selectedAccount,
                accounts: {
                  [selectedAccount]: {
                    id: selectedAccount,
                    address: '0x123',
                    type: 'eip155:eoa',
                    metadata: { name: 'Test Account' },
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState);

    it.each([
      [
        'disabled multichain accounts',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
        ACCOUNT_ID_1,
        null,
      ],
      [
        'no selected account',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
        '',
        null,
      ],
      [
        'account not found',
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1'),
            },
          },
        },
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

    it('returns correct group for selected account', () => {
      const mockState = createStateWithSelectedAccount(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: createMockWallet(WALLET_ID_1, 'Wallet 1', {
                'keyring:1/ethereum': createMockGroup([
                  ACCOUNT_ID_1,
                  ACCOUNT_ID_2,
                ]),
                'keyring:2/ethereum': createMockGroup([ACCOUNT_ID_3]),
              }),
            },
          },
        },
        ACCOUNT_ID_1,
      );

      const result = selectSelectedAccountGroup(mockState);
      expect(result).toEqual(createMockGroup([ACCOUNT_ID_1, ACCOUNT_ID_2]));
    });
  });
});
