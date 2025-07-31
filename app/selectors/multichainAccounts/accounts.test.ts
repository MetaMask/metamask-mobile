/* eslint-disable */
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';
import { CaipChainId } from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';
import { BtcAccountType, SolAccountType } from '@metamask/keyring-api';
import { RootState } from '../../reducers';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../../util/test/accountsControllerTestUtils';
import {
  getWalletIdFromAccountGroup,
  selectSelectedInternalAccountByScope,
  selectInternalAccountByAccountGroupAndScope,
} from './accounts';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'entropy:wallet2' as const;
const WALLET_ID_3 = 'snap:wallet3' as const;

const ACCOUNT_GROUP_ID_1 = 'keyring:wallet1/ethereum' as const;
const ACCOUNT_GROUP_ID_2 = 'entropy:wallet2/solana' as const;
const ACCOUNT_GROUP_ID_3 = 'snap:wallet3/bitcoin' as const;

const ACCOUNT_ID_1 = 'account1' as AccountId;
const ACCOUNT_ID_2 = 'account2' as AccountId;
const ACCOUNT_ID_3 = 'account3' as AccountId;
const ACCOUNT_ID_4 = 'account4' as AccountId;

const EVM_SCOPE = 'eip155:1' as CaipChainId;
const SOLANA_SCOPE = 'solana:mainnet' as CaipChainId;
const BITCOIN_SCOPE = 'bip122:000000000019d6689c085ae165831e93' as CaipChainId;

const mockEvmAccount: InternalAccount = {
  ...createMockInternalAccount('0x123', 'EVM Account'),
  id: ACCOUNT_ID_1,
  scopes: [EVM_SCOPE, 'eip155:137' as CaipChainId],
};

const mockSolanaAccount: InternalAccount = {
  ...createMockSnapInternalAccount(
    'solana123',
    'Solana Account',
    SolAccountType.DataAccount,
  ),
  id: ACCOUNT_ID_2,
  scopes: [SOLANA_SCOPE],
};

const mockBitcoinAccount: InternalAccount = {
  ...createMockSnapInternalAccount(
    'bitcoin123',
    'Bitcoin Account',
    BtcAccountType.P2wpkh,
  ),
  id: ACCOUNT_ID_3,
  scopes: [BITCOIN_SCOPE],
};

const mockMultiScopeAccount: InternalAccount = {
  ...createMockInternalAccount('0x456', 'Multi-scope Account'),
  id: ACCOUNT_ID_4,
  scopes: [EVM_SCOPE, SOLANA_SCOPE],
};

const createMockState = (
  accountTreeController:
    | DeepPartial<AccountTreeControllerState>
    | undefined = {},
  internalAccounts: Record<AccountId, InternalAccount> = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
        AccountsController: {
          internalAccounts: {
            accounts: internalAccounts,
          },
        },
      },
    },
  } as unknown as RootState);

describe('accounts selectors', () => {
  describe('getWalletIdFromAccountGroup', () => {
    it('extracts wallet ID from keyring account group', () => {
      const result = getWalletIdFromAccountGroup(ACCOUNT_GROUP_ID_1);
      expect(result).toBe(WALLET_ID_1);
    });

    it('extracts wallet ID from entropy account group', () => {
      const result = getWalletIdFromAccountGroup(ACCOUNT_GROUP_ID_2);
      expect(result).toBe(WALLET_ID_2);
    });

    it('extracts wallet ID from snap account group', () => {
      const result = getWalletIdFromAccountGroup(ACCOUNT_GROUP_ID_3);
      expect(result).toBe(WALLET_ID_3);
    });

    it('returns the whole string when account group ID has no slash', () => {
      const result = getWalletIdFromAccountGroup('invalid-group-id' as any);
      expect(result).toBe('invalid-group-id');
    });

    it('throws error when account group ID is empty before slash', () => {
      expect(() => {
        getWalletIdFromAccountGroup('/ethereum' as any);
      }).toThrow('Invalid account group ID');
    });

    it('throws error when account group ID is completely empty', () => {
      expect(() => {
        getWalletIdFromAccountGroup('' as any);
      }).toThrow('Invalid account group ID');
    });

    it('handles complex wallet IDs correctly', () => {
      const complexGroupId =
        'keyring:my-complex-wallet-123/ethereum-mainnet' as any;
      const result = getWalletIdFromAccountGroup(complexGroupId);
      expect(result).toBe('keyring:my-complex-wallet-123');
    });
  });

  describe('selectSelectedInternalAccountByScope', () => {
    it('returns undefined when AccountTreeController is undefined', () => {
      const mockState = createMockState(undefined);
      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns undefined when selectedAccountGroup is undefined', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: undefined,
          wallets: {},
        },
      });

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns undefined when wallet does not exist', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: ACCOUNT_GROUP_ID_1,
          wallets: {},
        },
      });

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns undefined when selected account group does not exist', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: ACCOUNT_GROUP_ID_1,
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {},
            },
          },
        },
      });

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no account matches EVM scope', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_2,
            wallets: {
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_2]: mockSolanaAccount },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no account matches non-EVM scope', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_1,
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_1]: mockEvmAccount },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(SOLANA_SCOPE);
      expect(result).toBeUndefined();
    });

    it('returns account when EVM scope matches', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_1,
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_1]: mockEvmAccount },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toEqual(mockEvmAccount);
    });

    it('returns account when non-EVM scope matches exactly', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_2,
            wallets: {
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_2]: mockSolanaAccount },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(SOLANA_SCOPE);
      expect(result).toEqual(mockSolanaAccount);
    });

    it('returns account with multiple scopes when EVM scope matches', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_1,
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_4],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_4]: mockMultiScopeAccount },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toEqual(mockMultiScopeAccount);
    });

    it('returns first matching account when multiple accounts exist', () => {
      const mockState = createMockState(
        {
          accountTree: {
            selectedAccountGroup: ACCOUNT_GROUP_ID_1,
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1, ACCOUNT_ID_4],
                  },
                },
              },
            },
          },
        },
        {
          [ACCOUNT_ID_1]: mockEvmAccount,
          [ACCOUNT_ID_4]: mockMultiScopeAccount,
        },
      );

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toEqual(mockEvmAccount);
    });

    it('handles empty accounts array in selected group', () => {
      const mockState = createMockState({
        accountTree: {
          selectedAccountGroup: ACCOUNT_GROUP_ID_1,
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {
                [ACCOUNT_GROUP_ID_1]: {
                  accounts: [],
                },
              },
            },
          },
        },
      });

      const selector = selectSelectedInternalAccountByScope(mockState);
      const result = selector(EVM_SCOPE);
      expect(result).toBeUndefined();
    });
  });

  describe('selectInternalAccountByAccountGroupAndScope', () => {
    it('returns undefined when AccountTreeController is undefined', () => {
      const mockState = createMockState(undefined);
      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('returns undefined when accountGroupId is empty string', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, '');
      expect(result).toBeUndefined();
    });

    it('returns undefined when wallet does not exist', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {},
        },
      });

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('returns undefined when account group does not exist', () => {
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

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no account matches EVM scope', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_2]: mockSolanaAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_2);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no account matches non-EVM scope', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_1]: mockEvmAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(SOLANA_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('returns account when EVM scope matches', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_1]: mockEvmAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(mockEvmAccount);
    });

    it('returns account when non-EVM scope matches exactly', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_2]: mockSolanaAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(SOLANA_SCOPE, ACCOUNT_GROUP_ID_2);
      expect(result).toEqual(mockSolanaAccount);
    });

    it('returns account with multiple scopes when EVM scope matches', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_4],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_4]: mockMultiScopeAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(mockMultiScopeAccount);
    });

    it('returns account with multiple scopes when non-EVM scope matches', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_4],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_4]: mockMultiScopeAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(SOLANA_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(mockMultiScopeAccount);
    });

    it('returns first matching account when multiple accounts exist', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1, ACCOUNT_ID_4],
                  },
                },
              },
            },
          },
        },
        {
          [ACCOUNT_ID_1]: mockEvmAccount,
          [ACCOUNT_ID_4]: mockMultiScopeAccount,
        },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(mockEvmAccount);
    });

    it('handles empty accounts array in account group', () => {
      const mockState = createMockState({
        accountTree: {
          wallets: {
            [WALLET_ID_1]: {
              id: WALLET_ID_1,
              metadata: { name: 'Wallet 1' },
              groups: {
                [ACCOUNT_GROUP_ID_1]: {
                  accounts: [],
                },
              },
            },
          },
        },
      });

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toBeUndefined();
    });

    it('can find accounts in different wallets with same scope', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        {
          [ACCOUNT_ID_1]: mockEvmAccount,
          [ACCOUNT_ID_2]: mockSolanaAccount,
        },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);

      const result1 = selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result1).toEqual(mockEvmAccount);

      const result2 = selector(SOLANA_SCOPE, ACCOUNT_GROUP_ID_2);
      expect(result2).toEqual(mockSolanaAccount);
    });

    it('selector function can be called multiple times with different parameters', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_1, ACCOUNT_ID_4],
                  },
                },
              },
              [WALLET_ID_3]: {
                id: WALLET_ID_3,
                metadata: { name: 'Wallet 3' },
                groups: {
                  [ACCOUNT_GROUP_ID_3]: {
                    accounts: [ACCOUNT_ID_3],
                  },
                },
              },
            },
          },
        },
        {
          [ACCOUNT_ID_1]: mockEvmAccount,
          [ACCOUNT_ID_3]: mockBitcoinAccount,
          [ACCOUNT_ID_4]: mockMultiScopeAccount,
        },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);

      expect(selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1)).toEqual(mockEvmAccount);
      expect(selector(BITCOIN_SCOPE, ACCOUNT_GROUP_ID_3)).toEqual(
        mockBitcoinAccount,
      );
      expect(selector(SOLANA_SCOPE, ACCOUNT_GROUP_ID_1)).toEqual(
        mockMultiScopeAccount,
      );
      expect(selector(SOLANA_SCOPE, 'nonexistent')).toBeUndefined();
      expect(selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1)).toEqual(mockEvmAccount);
    });

    it('handles accounts with any EVM chain scope when requesting EVM scope', () => {
      const polygonEvmAccount: InternalAccount = {
        ...createMockInternalAccount('0x789', 'Polygon Account'),
        id: ACCOUNT_ID_2,
        scopes: ['eip155:137' as CaipChainId],
      };

      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [WALLET_ID_1]: {
                id: WALLET_ID_1,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ACCOUNT_GROUP_ID_1]: {
                    accounts: [ACCOUNT_ID_2],
                  },
                },
              },
            },
          },
        },
        { [ACCOUNT_ID_2]: polygonEvmAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector('eip155:1' as CaipChainId, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(polygonEvmAccount);
    });
  });
});
