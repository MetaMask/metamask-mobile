import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';
import { CaipChainId } from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';
import {
  BtcAccountType,
  EthAccountType,
  SolAccountType,
} from '@metamask/keyring-api';
import { RootState } from '../../reducers';

import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../../util/test/accountsControllerTestUtils';
import {
  getWalletIdFromAccountGroup,
  selectSelectedInternalAccountByScope,
  selectInternalAccountByAccountGroupAndScope,
  selectInternalAccountsByGroupId,
  selectInternalAccountListSpreadByScopesByGroupId,
  selectScopeToAccountGroupMap,
  selectCaip25AccountIdToMultichainAccountGroupMap,
} from './accounts';
import {
  AccountWalletType,
  AccountGroupType,
  AccountGroupId,
} from '@metamask/account-api';
import { selectAccountGroupWithInternalAccounts } from './accountTreeController';

// Test constants
const EIP155_MAINNET_SCOPE = 'eip155:1' as CaipChainId;
const ENTROPY_GROUP_1_ID = 'entropy:wallet1/0' as AccountGroupId;
const ENTROPY_GROUP_2_ID = 'entropy:wallet2/0' as AccountGroupId;
const ACCOUNT_1_ADDRESS = '0x123456789abcdef123456789abcdef123456789a';
const ACCOUNT_2_ADDRESS = '0x987654321fedcba987654321fedcba987654321b';
const ACCOUNT_3_ADDRESS = '0xabcdef123456789abcdef123456789abcdef123456';

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'entropy:wallet2' as const;
const WALLET_ID_3 = 'snap:wallet3' as const;

// Additional entropy wallet for comprehensive testing
const ENTROPY_WALLET_ID = 'entropy:testWallet' as const;

const ACCOUNT_GROUP_ID_1 = 'keyring:wallet1/1' as const;
const ACCOUNT_GROUP_ID_2 = 'entropy:wallet2/2' as const;
const ACCOUNT_GROUP_ID_3 = 'snap:wallet3/3' as const;

// Entropy wallet account group that contains both EVM and non-EVM accounts
const ENTROPY_GROUP_ID = 'entropy:testWallet/multichain' as const;

const ACCOUNT_ID_1 = 'account1' as AccountId;
const ACCOUNT_ID_2 = 'account2' as AccountId;
const ACCOUNT_ID_3 = 'account3' as AccountId;
const ACCOUNT_ID_4 = 'account4' as AccountId;

// Additional account IDs for entropy wallet tests
const ENTROPY_EVM_ACCOUNT_ID = 'entropyEvmAccount' as AccountId;
const ENTROPY_SOLANA_ACCOUNT_ID = 'entropySolanaAccount' as AccountId;

const EVM_SCOPE = 'eip155:1' as CaipChainId;
const SOLANA_MAINNET_SCOPE =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
const SOLANA_TESTNET_SCOPE =
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z' as CaipChainId;
const BITCOIN_SCOPE = 'bip122:000000000019d6689c085ae165831e93' as CaipChainId;

const mockEvmAccount: InternalAccount = {
  ...createMockInternalAccount('0x123', 'EVM Account'),
  id: ACCOUNT_ID_1,
  scopes: [EVM_SCOPE],
};

const mockSolanaAccount: InternalAccount = {
  ...createMockSnapInternalAccount(
    'solana123',
    'Solana Account',
    SolAccountType.DataAccount,
  ),
  id: ACCOUNT_ID_2,
  scopes: [SOLANA_MAINNET_SCOPE, SOLANA_TESTNET_SCOPE],
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

const mockAnotherSolanaAccount: InternalAccount = {
  ...createMockSnapInternalAccount(
    'solana456',
    'Another Solana Account',
    SolAccountType.DataAccount,
  ),
  id: ACCOUNT_ID_4,
  scopes: [SOLANA_MAINNET_SCOPE],
};

// Mock accounts for entropy wallet testing
const mockEntropyEvmAccount: InternalAccount = {
  ...createMockInternalAccount('0x789', 'Entropy EVM Account'),
  id: ENTROPY_EVM_ACCOUNT_ID,
  scopes: [EVM_SCOPE],
};

const mockEntropySolanaAccount: InternalAccount = {
  ...createMockSnapInternalAccount(
    'entropySolana789',
    'Entropy Solana Account',
    SolAccountType.DataAccount,
  ),
  id: ENTROPY_SOLANA_ACCOUNT_ID,
  scopes: [SOLANA_MAINNET_SCOPE],
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
        NetworkController: {
          networkConfigurationsByChainId: {
            0x1: {
              chainId: '0x1',
              name: 'Ethereum',
            },
            0xaa36a7: {
              chainId: '0xaa36a7',
              name: 'Sepolia Test Network',
            },
            0x2105: {
              chainId: '0x2105',
              name: 'Base',
            },
            0xa4b1: {
              chainId: '0xa4b1',
              name: 'Arbitrum One',
            },
          },
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              name: 'Solana Mainnet',
              chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              isTestnet: false,
            },
            'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': {
              name: 'Solana Testnet',
              chainId: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
              isTestnet: true,
            },
            'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
              name: 'Solana Devnet',
              chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
              isTestnet: true,
            },
          },
        },
        KeyringController: {
          keyrings: [],
          isUnlocked: true,
        },
      },
    },
  } as unknown as RootState);

// Additional test utility functions
const createStateWithNetworkConfigurations = (
  accountTreeState: Record<string, unknown>,
  accountsState: Record<string, unknown>,
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: {
          accountTree: accountTreeState,
        },
        AccountsController: {
          internalAccounts: accountsState,
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Ethereum',
            },
            '0x5': {
              chainId: '0x5',
              name: 'Goerli',
            },
            '0xaa36a7': {
              chainId: '0xaa36a7',
              name: 'Sepolia Test Network',
            },
            '0x38': {
              chainId: '0x38',
              name: 'BNB Smart Chain',
            },
          },
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              name: 'Solana Mainnet',
              chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
              isTestnet: false,
            },
            'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': {
              name: 'Solana Testnet',
              chainId: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
              isTestnet: true,
            },
          },
          KeyringController: {
            keyrings: [],
          },
        },
      },
    },
  } as unknown as RootState);

// Ensure all states created with createStateWithNetworkConfigurations have KeyringController
const createStateWithNetworkConfigurationsAndKeyring = (
  accountTreeState: Record<string, unknown>,
  accountsState: Record<string, unknown>,
): RootState => {
  const baseState = createStateWithNetworkConfigurations(
    accountTreeState,
    accountsState,
  );
  return {
    ...baseState,
    engine: {
      ...baseState.engine,
      backgroundState: {
        ...baseState.engine.backgroundState,
        KeyringController: {
          keyrings: [],
          isUnlocked: true,
        },
      },
    },
  };
};

const createStateWithMixedAccounts = (): RootState =>
  createStateWithNetworkConfigurationsAndKeyring(
    {
      wallets: {
        'entropy:test': {
          id: 'entropy:test',
          type: AccountWalletType.Entropy,
          groups: {
            'entropy:test/0': {
              id: 'entropy:test/0',
              type: AccountGroupType.MultichainAccount,
              accounts: ['existing-account', 'missing-account'],
              metadata: {
                name: 'Test',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Test Wallet',
            entropy: { id: 'test' },
          },
        },
      },
      selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
    },
    {
      accounts: {
        'existing-account': {
          ...createMockInternalAccount('0x123', 'Test Account'),
          id: 'existing-account',
        },
      },
      selectedAccount: 'existing-account',
    },
  );

const createStateWithNoMatchingAccounts = (): RootState =>
  createStateWithNetworkConfigurationsAndKeyring(
    {
      wallets: {
        'entropy:test': {
          id: 'entropy:test',
          type: AccountWalletType.Entropy,
          groups: {
            'entropy:test/0': {
              id: 'entropy:test/0',
              type: AccountGroupType.MultichainAccount,
              accounts: ['placeholder-account'],
              metadata: {
                name: 'Empty Group',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Test Wallet',
            entropy: { id: 'test' },
          },
        },
      },
      selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
    },
    {
      accounts: {},
      selectedAccount: '',
    },
  );

const createStateWithMissingInternalAccount = (): RootState =>
  createStateWithNetworkConfigurationsAndKeyring(
    {
      wallets: {
        'entropy:test': {
          id: 'entropy:test',
          type: AccountWalletType.Entropy,
          groups: {
            'entropy:test/0': {
              id: 'entropy:test/0',
              type: AccountGroupType.MultichainAccount,
              accounts: ['missing-account-id'],
              metadata: {
                name: 'Test',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Test Wallet',
            entropy: { id: 'test' },
          },
        },
      },
      selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
    },
    {
      accounts: {},
      selectedAccount: '',
    },
  );

const typedMockState: RootState =
  createStateWithNetworkConfigurationsAndKeyring(
    {
      wallets: {
        'entropy:wallet1': {
          id: 'entropy:wallet1',
          type: AccountWalletType.Entropy,
          groups: {
            [ENTROPY_GROUP_1_ID]: {
              id: ENTROPY_GROUP_1_ID,
              type: AccountGroupType.MultichainAccount,
              accounts: ['account1', 'account2'],
              metadata: {
                name: 'Entropy Group 1',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Entropy Wallet 1',
            entropy: { id: 'wallet1' },
          },
        },
        'entropy:wallet2': {
          id: 'entropy:wallet2',
          type: AccountWalletType.Entropy,
          groups: {
            [ENTROPY_GROUP_2_ID]: {
              id: ENTROPY_GROUP_2_ID,
              type: AccountGroupType.MultichainAccount,
              accounts: ['account3'],
              metadata: {
                name: 'Entropy Group 2',
                entropy: { groupIndex: 0 },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Entropy Wallet 2',
            entropy: { id: 'wallet2' },
          },
        },
        'keyring:wallet1': {
          id: 'keyring:wallet1',
          type: AccountWalletType.Keyring,
          groups: {
            'keyring:wallet1/0': {
              id: 'keyring:wallet1/0',
              type: AccountGroupType.SingleAccount,
              accounts: ['keyring-account1'],
              metadata: {
                name: 'Keyring Account 1',
                keyring: { type: 'HD Key Tree' },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Keyring Wallet 1',
            keyring: { type: 'HD Key Tree' },
          },
        },
        'snap:wallet1': {
          id: 'snap:wallet1',
          type: AccountWalletType.Snap,
          groups: {
            'snap:wallet1/0': {
              id: 'snap:wallet1/0',
              type: AccountGroupType.SingleAccount,
              accounts: ['snap-account1'],
              metadata: {
                name: 'Snap Account 1',
                snap: { id: 'test-snap', name: 'Test Snap' },
                pinned: false,
                hidden: false,
              },
            },
          },
          metadata: {
            name: 'Snap Wallet 1',
            snap: { id: 'test-snap', name: 'Test Snap' },
          },
        },
      },
      selectedAccountGroup: ENTROPY_GROUP_1_ID,
    },
    {
      accounts: {
        account1: {
          ...createMockInternalAccount(ACCOUNT_1_ADDRESS, 'Account 1'),
          id: 'account1',
        },
        account2: {
          ...createMockInternalAccount(ACCOUNT_2_ADDRESS, 'Account 2'),
          id: 'account2',
        },
        account3: {
          ...createMockInternalAccount(ACCOUNT_3_ADDRESS, 'Account 3'),
          id: 'account3',
        },
        'keyring-account1': {
          ...createMockInternalAccount('0xkeyring123', 'Keyring Account 1'),
          id: 'keyring-account1',
        },
        'snap-account1': {
          ...createMockSnapInternalAccount(
            'snap123',
            'Snap Account 1',
            SolAccountType.DataAccount,
          ),
          id: 'snap-account1',
        },
      },
      selectedAccount: 'account1',
    },
  );

// Ensure typedMockState has KeyringController
const typedMockStateWithKeyring: RootState = {
  ...typedMockState,
  engine: {
    ...typedMockState.engine,
    backgroundState: {
      ...typedMockState.engine.backgroundState,
      KeyringController: {
        keyrings: [],
        isUnlocked: true,
      },
    },
  },
};

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
      // @ts-expect-error - we want to test the error case
      const result = getWalletIdFromAccountGroup('invalid-group-id');
      expect(result).toBe('invalid-group-id');
    });

    it('throws error when account group ID is empty before slash', () => {
      expect(() => {
        // @ts-expect-error - we want to test the error case
        getWalletIdFromAccountGroup('/ethereum');
      }).toThrow('Invalid account group ID');
    });

    it('throws error when account group ID is completely empty', () => {
      expect(() => {
        // @ts-expect-error - we want to test the error case
        getWalletIdFromAccountGroup('');
      }).toThrow('Invalid account group ID');
    });

    it('handles complex wallet IDs correctly', () => {
      const complexGroupId = 'keyring:my-complex-wallet-123/1';
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
      const result = selector(SOLANA_MAINNET_SCOPE);
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
      const result = selector(SOLANA_MAINNET_SCOPE);
      expect(result).toEqual(mockSolanaAccount);
    });

    it('returns EVM account from selected account group when EVM scope matches', () => {
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
      const result = selector(SOLANA_MAINNET_SCOPE, ACCOUNT_GROUP_ID_1);
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
      const result = selector(SOLANA_MAINNET_SCOPE, ACCOUNT_GROUP_ID_2);
      expect(result).toEqual(mockSolanaAccount);
    });

    it('returns EVM account from specific account group when EVM scope matches', () => {
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

    it('returns account when non-EVM scope matches', () => {
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
        { [ACCOUNT_ID_4]: mockAnotherSolanaAccount },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);
      const result = selector(SOLANA_MAINNET_SCOPE, ACCOUNT_GROUP_ID_1);
      expect(result).toEqual(mockAnotherSolanaAccount);
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

      const result2 = selector(SOLANA_MAINNET_SCOPE, ACCOUNT_GROUP_ID_2);
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
                    accounts: [ACCOUNT_ID_1],
                  },
                },
              },
              [WALLET_ID_2]: {
                id: WALLET_ID_2,
                metadata: { name: 'Wallet 2' },
                groups: {
                  [ACCOUNT_GROUP_ID_2]: {
                    accounts: [ACCOUNT_ID_4],
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
          [ACCOUNT_ID_4]: mockAnotherSolanaAccount,
        },
      );

      const selector = selectInternalAccountByAccountGroupAndScope(mockState);

      expect(selector(EVM_SCOPE, ACCOUNT_GROUP_ID_1)).toEqual(mockEvmAccount);
      expect(selector(BITCOIN_SCOPE, ACCOUNT_GROUP_ID_3)).toEqual(
        mockBitcoinAccount,
      );
      expect(selector(SOLANA_MAINNET_SCOPE, ACCOUNT_GROUP_ID_2)).toEqual(
        mockAnotherSolanaAccount,
      );
      expect(selector(SOLANA_MAINNET_SCOPE, 'nonexistent')).toBeUndefined();
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

    describe('entropy wallet tests', () => {
      it('finds EVM account in entropy wallet multichain group when requesting EVM scope', () => {
        const mockState = createMockState(
          {
            accountTree: {
              wallets: {
                [ENTROPY_WALLET_ID]: {
                  id: ENTROPY_WALLET_ID,
                  metadata: { name: 'Entropy Test Wallet' },
                  groups: {
                    [ENTROPY_GROUP_ID]: {
                      accounts: [
                        ENTROPY_EVM_ACCOUNT_ID,
                        ENTROPY_SOLANA_ACCOUNT_ID,
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            [ENTROPY_EVM_ACCOUNT_ID]: mockEntropyEvmAccount,
            [ENTROPY_SOLANA_ACCOUNT_ID]: mockEntropySolanaAccount,
          },
        );

        const selector = selectInternalAccountByAccountGroupAndScope(mockState);
        const result = selector(EVM_SCOPE, ENTROPY_GROUP_ID);
        expect(result).toEqual(mockEntropyEvmAccount);
      });

      it('finds Solana account in entropy wallet multichain group when requesting Solana scope', () => {
        const mockState = createMockState(
          {
            accountTree: {
              wallets: {
                [ENTROPY_WALLET_ID]: {
                  id: ENTROPY_WALLET_ID,
                  metadata: { name: 'Entropy Test Wallet' },
                  groups: {
                    [ENTROPY_GROUP_ID]: {
                      accounts: [
                        ENTROPY_EVM_ACCOUNT_ID,
                        ENTROPY_SOLANA_ACCOUNT_ID,
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            [ENTROPY_EVM_ACCOUNT_ID]: mockEntropyEvmAccount,
            [ENTROPY_SOLANA_ACCOUNT_ID]: mockEntropySolanaAccount,
          },
        );

        const selector = selectInternalAccountByAccountGroupAndScope(mockState);
        const result = selector(SOLANA_MAINNET_SCOPE, ENTROPY_GROUP_ID);
        expect(result).toEqual(mockEntropySolanaAccount);
      });

      it('returns undefined when requesting Bitcoin scope from entropy multichain group', () => {
        const mockState = createMockState(
          {
            accountTree: {
              wallets: {
                [ENTROPY_WALLET_ID]: {
                  id: ENTROPY_WALLET_ID,
                  metadata: { name: 'Entropy Test Wallet' },
                  groups: {
                    [ENTROPY_GROUP_ID]: {
                      accounts: [
                        ENTROPY_EVM_ACCOUNT_ID,
                        ENTROPY_SOLANA_ACCOUNT_ID,
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            [ENTROPY_EVM_ACCOUNT_ID]: mockEntropyEvmAccount,
            [ENTROPY_SOLANA_ACCOUNT_ID]: mockEntropySolanaAccount,
          },
        );

        const selector = selectInternalAccountByAccountGroupAndScope(mockState);

        // Try to find Bitcoin account in multichain group that only has EVM and Solana - should return undefined
        const result = selector(BITCOIN_SCOPE, ENTROPY_GROUP_ID);
        expect(result).toBeUndefined();
      });

      it('works with selectedAccountGroup for entropy wallets', () => {
        const mockState = createMockState(
          {
            accountTree: {
              selectedAccountGroup: ENTROPY_GROUP_ID,
              wallets: {
                [ENTROPY_WALLET_ID]: {
                  id: ENTROPY_WALLET_ID,
                  metadata: { name: 'Entropy Test Wallet' },
                  groups: {
                    [ENTROPY_GROUP_ID]: {
                      accounts: [
                        ENTROPY_EVM_ACCOUNT_ID,
                        ENTROPY_SOLANA_ACCOUNT_ID,
                      ],
                    },
                  },
                },
              },
            },
          },
          {
            [ENTROPY_EVM_ACCOUNT_ID]: mockEntropyEvmAccount,
            [ENTROPY_SOLANA_ACCOUNT_ID]: mockEntropySolanaAccount,
          },
        );

        const selector = selectSelectedInternalAccountByScope(mockState);

        // Test both EVM and Solana scope matching from the same selected group
        const evmResult = selector(EVM_SCOPE);
        expect(evmResult).toEqual(mockEntropyEvmAccount);

        const solanaResult = selector(SOLANA_MAINNET_SCOPE);
        expect(solanaResult).toEqual(mockEntropySolanaAccount);
      });

      it('handles multiple entropy wallets with mixed multichain groups', () => {
        const secondEntropyWallet = 'entropy:secondWallet' as const;
        const secondEntropyGroup = 'entropy:secondWallet/multichain' as const;
        const secondEvmAccountId = 'secondEvmAccount' as AccountId;
        const secondBtcAccountId = 'secondBtcAccount' as AccountId;

        const secondEvmAccount: InternalAccount = {
          ...createMockInternalAccount('0xABC', 'Second EVM Account'),
          id: secondEvmAccountId,
          scopes: [EVM_SCOPE],
        };

        const secondBtcAccount: InternalAccount = {
          ...createMockSnapInternalAccount(
            'btc456',
            'Second Bitcoin Account',
            BtcAccountType.P2wpkh,
          ),
          id: secondBtcAccountId,
          scopes: [BITCOIN_SCOPE],
        };

        const mockState = createMockState(
          {
            accountTree: {
              wallets: {
                [ENTROPY_WALLET_ID]: {
                  id: ENTROPY_WALLET_ID,
                  metadata: { name: 'First Entropy Wallet' },
                  groups: {
                    [ENTROPY_GROUP_ID]: {
                      accounts: [
                        ENTROPY_EVM_ACCOUNT_ID,
                        ENTROPY_SOLANA_ACCOUNT_ID,
                      ],
                    },
                  },
                },
                [secondEntropyWallet]: {
                  id: secondEntropyWallet,
                  metadata: { name: 'Second Entropy Wallet' },
                  groups: {
                    [secondEntropyGroup]: {
                      accounts: [secondEvmAccountId, secondBtcAccountId],
                    },
                  },
                },
              },
            },
          },
          {
            [ENTROPY_EVM_ACCOUNT_ID]: mockEntropyEvmAccount,
            [ENTROPY_SOLANA_ACCOUNT_ID]: mockEntropySolanaAccount,
            [secondEvmAccountId]: secondEvmAccount,
            [secondBtcAccountId]: secondBtcAccount,
          },
        );

        const selector = selectInternalAccountByAccountGroupAndScope(mockState);

        // Test first entropy wallet (EVM and Solana)
        const firstEvmResult = selector(EVM_SCOPE, ENTROPY_GROUP_ID);
        expect(firstEvmResult).toEqual(mockEntropyEvmAccount);

        const firstSolanaResult = selector(
          SOLANA_MAINNET_SCOPE,
          ENTROPY_GROUP_ID,
        );
        expect(firstSolanaResult).toEqual(mockEntropySolanaAccount);

        // Test second entropy wallet (EVM and Bitcoin)
        const secondEvmResult = selector(EVM_SCOPE, secondEntropyGroup);
        expect(secondEvmResult).toEqual(secondEvmAccount);

        const secondBtcResult = selector(BITCOIN_SCOPE, secondEntropyGroup);
        expect(secondBtcResult).toEqual(secondBtcAccount);
      });
    });
  });

  describe('selectInternalAccountsByGroupId', () => {
    it('returns empty array when AccountTreeController is undefined', () => {
      const mockState = createMockState(undefined);
      const selector = selectInternalAccountsByGroupId(mockState);
      const result = selector(ACCOUNT_GROUP_ID_1);
      expect(result).toEqual([]);
    });

    it('returns empty array when group ID does not exist', () => {
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

      const selector = selectInternalAccountsByGroupId(mockState);
      const result = selector(ACCOUNT_GROUP_ID_1);
      expect(result).toEqual([]);
    });

    it('returns empty array when group has no accounts', () => {
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

      const selector = selectInternalAccountsByGroupId(mockState);
      const result = selector(ACCOUNT_GROUP_ID_1);
      expect(result).toEqual([]);
    });

    it('returns accounts for given group ID', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [ENTROPY_WALLET_ID]: {
                id: ENTROPY_WALLET_ID,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ENTROPY_GROUP_ID]: {
                    accounts: [
                      ENTROPY_EVM_ACCOUNT_ID,
                      ENTROPY_SOLANA_ACCOUNT_ID,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          [ENTROPY_EVM_ACCOUNT_ID]: mockEvmAccount,
          [ENTROPY_SOLANA_ACCOUNT_ID]: mockSolanaAccount,
        },
      );

      const selector = selectInternalAccountsByGroupId(mockState);
      const result = selector(ENTROPY_GROUP_ID);
      expect(result).toEqual([mockEvmAccount, mockSolanaAccount]);
    });
  });

  describe('selectInternalAccountListSpreadByScopesByGroupId', () => {
    it('returns internal accounts spread by networks', () => {
      const mockState = createMockState(
        {
          accountTree: {
            wallets: {
              [ENTROPY_WALLET_ID]: {
                id: ENTROPY_WALLET_ID,
                metadata: { name: 'Wallet 1' },
                groups: {
                  [ENTROPY_GROUP_ID]: {
                    accounts: [
                      ENTROPY_EVM_ACCOUNT_ID,
                      ENTROPY_SOLANA_ACCOUNT_ID,
                    ],
                  },
                },
              },
            },
          },
        },
        {
          [ENTROPY_EVM_ACCOUNT_ID]: mockEvmAccount,
          [ENTROPY_SOLANA_ACCOUNT_ID]: mockSolanaAccount,
        },
      );

      const result =
        selectInternalAccountListSpreadByScopesByGroupId(mockState)(
          ENTROPY_GROUP_ID,
        );
      expect(result).toEqual([
        {
          account: mockEvmAccount,
          scope: 'eip155:1',
          networkName: 'Ethereum',
        },
        {
          account: mockEvmAccount,
          scope: 'eip155:33875',
          networkName: 'Base',
        },
        {
          account: mockEvmAccount,
          scope: 'eip155:270689',
          networkName: 'Arbitrum One',
        },
        {
          account: mockSolanaAccount,
          scope: SOLANA_MAINNET_SCOPE,
          networkName: 'Solana Mainnet',
        },
      ]);
    });
  });

  describe('selectScopeToAccountGroupMap', () => {
    it('maps scopes to account groups for EOA accounts', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      expect(result.get(EIP155_MAINNET_SCOPE)).toBeDefined();
      expect(result.get(EIP155_MAINNET_SCOPE)?.length).toBeGreaterThan(0);

      expect(result.get('eip155:0')).toBeDefined();
      expect(result.get('eip155:0')?.length).toBeGreaterThan(0);

      expect(result.get('eip155:1')).toBeDefined(); // Mainnet
      expect(result.get('eip155:5')).toBeDefined(); // Goerli
      expect(result.get('eip155:11155111')).toBeDefined(); // Sepolia
    });

    it('maps non-EVM scopes to account groups', () => {
      const stateWithNonEvmAccounts =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['solana-account'],
                    metadata: {
                      name: 'Solana Account',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {
              'solana-account': {
                ...createMockSnapInternalAccount(
                  'SolanaAddress123',
                  'Solana Account',
                  SolAccountType.DataAccount,
                ),
                id: 'solana-account',
              },
            },
            selectedAccount: 'solana-account',
          },
        );

      const result = selectScopeToAccountGroupMap(stateWithNonEvmAccounts);

      expect(result.get(SOLANA_MAINNET_SCOPE)).toBeDefined();
      expect(result.get(SOLANA_MAINNET_SCOPE)?.[0]?.id).toBe('entropy:test/0');
    });

    it('correctly maps EIP155 wildcard scope for EOA accounts', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      const wildcardMapping = result.get('eip155:0');
      expect(wildcardMapping).toBeDefined();

      expect(wildcardMapping?.[0]?.id).toMatch(/^entropy:/u);
    });

    it('handles multiple accounts in the same group', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      const firstGroupMapping = result.get(EIP155_MAINNET_SCOPE);
      expect(firstGroupMapping?.[0]?.id).toBe(ENTROPY_GROUP_1_ID);

      expect(firstGroupMapping?.[0]?.accounts).toHaveLength(2);
    });

    it('handles accounts with multiple scopes', () => {
      const stateWithMultiScopeAccount =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['multi-scope-account'],
                    metadata: {
                      name: 'Multi Scope Account',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {
              'multi-scope-account': {
                ...createMockInternalAccount('0x123', 'Multi Scope Account'),
                id: 'multi-scope-account',
              },
            },
            selectedAccount: 'multi-scope-account',
          },
        );

      const result = selectScopeToAccountGroupMap(stateWithMultiScopeAccount);

      expect(result.get(EIP155_MAINNET_SCOPE)?.[0]?.id).toBe('entropy:test/0');
      expect(result.get('eip155:0')?.[0]?.id).toBe('entropy:test/0');
    });

    it('handles empty account groups', () => {
      const stateWithEmptyGroup =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['placeholder-account'] as [string, ...string[]],
                    metadata: {
                      name: 'Empty Group',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {},
            selectedAccount: '',
          },
        );

      const result = selectScopeToAccountGroupMap(stateWithEmptyGroup);

      expect(result.size).toBe(0);
    });

    it('filters out accounts without matching internal accounts', () => {
      const stateWithMissingAccount =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['missing-account-id'],
                    metadata: {
                      name: 'Test',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {},
            selectedAccount: '',
          },
        );
      const result = selectScopeToAccountGroupMap(stateWithMissingAccount);

      expect(result.size).toBe(0);
    });

    it('handles mixed existing and missing internal accounts', () => {
      const stateWithMixedAccounts =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['existing-account', 'missing-account'],
                    metadata: {
                      name: 'Test',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {
              'existing-account': {
                ...createMockInternalAccount('0x123', 'Test Account'),
                id: 'existing-account',
              },
            },
            selectedAccount: 'existing-account',
          },
        );
      const result = selectScopeToAccountGroupMap(stateWithMixedAccounts);

      expect(result.size).toBeGreaterThan(0);

      const groupWithExistingAccount = Array.from(result.values())
        .flat()
        .find((group) =>
          group.accounts.some((account) => account.id === 'existing-account'),
        );
      expect(groupWithExistingAccount).toBeDefined();
    });

    it('maps all EVM network configurations for EOA accounts', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      const evmChains = [
        'eip155:1',
        'eip155:5',
        'eip155:11155111',
        'eip155:56',
      ];

      evmChains.forEach((chainId) => {
        const mapping = result.get(chainId);
        expect(mapping).toBeDefined();
        expect(mapping?.[0]?.id).toMatch(/^entropy:/u); // Should be entropy groups with EOA accounts
      });
    });

    it('does not add EVM chain mappings for non-EOA accounts', () => {
      const stateWithErc4337Account =
        createStateWithNetworkConfigurationsAndKeyring(
          {
            wallets: {
              'entropy:test': {
                id: 'entropy:test',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:test/0': {
                    id: 'entropy:test/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: ['erc4337-account'],
                    metadata: {
                      name: 'ERC4337 Account',
                      entropy: { groupIndex: 0 },
                      pinned: false,
                      hidden: false,
                    },
                  },
                },
                metadata: {
                  name: 'Test Wallet',
                  entropy: { id: 'test' },
                },
              },
            },
            selectedAccountGroup: 'entropy:test/0' as AccountGroupId,
          },
          {
            accounts: {
              'erc4337-account': {
                ...createMockInternalAccount(
                  '0x456',
                  'ERC4337 Account',
                  undefined,
                  EthAccountType.Erc4337,
                ),
                id: 'erc4337-account',
              },
            },
            selectedAccount: 'erc4337-account',
          },
        );

      const result = selectScopeToAccountGroupMap(stateWithErc4337Account);

      expect(result.get('eip155:11155111')).toBeDefined();

      expect(result.get('eip155:0')).toBeUndefined();
    });

    it('handles account groups from different wallet types', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      const mappedGroups = Array.from(result.values()).flat();
      const walletTypes = new Set(
        mappedGroups.map((group) => group.id.split(':')[0]),
      );

      expect(walletTypes.size).toBeGreaterThan(1);
      expect(walletTypes).toContain('entropy');
      expect(walletTypes).toContain('keyring');
      expect(walletTypes).toContain('snap');
    });

    it('returns empty map when no account groups exist', () => {
      const emptyState = createStateWithNetworkConfigurationsAndKeyring(
        {
          wallets: {},
          selectedAccountGroup: null as unknown as AccountGroupId,
        },
        {
          accounts: {},
          selectedAccount: '',
        },
      );
      const result = selectScopeToAccountGroupMap(emptyState);

      expect(result.size).toBe(0);
    });

    it('preserves account group structure and metadata', () => {
      const result = selectScopeToAccountGroupMap(typedMockStateWithKeyring);

      const firstMapping = result.get(EIP155_MAINNET_SCOPE);
      expect(firstMapping).toBeDefined();

      expect(firstMapping?.[0]).toHaveProperty('id');
      expect(firstMapping?.[0]).toHaveProperty('type');
      expect(firstMapping?.[0]).toHaveProperty('accounts');
      expect(firstMapping?.[0]).toHaveProperty('metadata');

      expect(firstMapping?.[0]?.accounts[0]).toHaveProperty('address');
      expect(firstMapping?.[0]?.accounts[0]).toHaveProperty('scopes');
      expect(firstMapping?.[0]?.accounts[0]).toHaveProperty('type');
    });
  });
  describe('selectAccountGroupWithInternalAccounts', () => {
    it('returns account groups with resolved internal accounts', () => {
      const result = selectAccountGroupWithInternalAccounts(
        typedMockStateWithKeyring,
      );

      expect(result).toHaveLength(4);

      const entropyGroup = result.find(
        (group) => group.id === ENTROPY_GROUP_1_ID,
      );
      expect(entropyGroup?.accounts).toHaveLength(2);
      expect(entropyGroup?.accounts[0]).toHaveProperty(
        'address',
        ACCOUNT_1_ADDRESS,
      );
      expect(entropyGroup?.accounts[1]).toHaveProperty(
        'address',
        ACCOUNT_2_ADDRESS,
      );
    });

    it('filters out undefined accounts', () => {
      const stateWithMissingAccount = createStateWithMixedAccounts();

      const result = selectAccountGroupWithInternalAccounts(
        stateWithMissingAccount,
      );
      const testGroup = result.find((group) => group.id === 'entropy:test/0');

      expect(testGroup?.accounts).toHaveLength(1);
      expect(testGroup?.accounts[0].id).toBe('existing-account');
    });

    it('returns empty accounts array when no internal accounts match', () => {
      const stateWithNoMatchingAccounts = createStateWithNoMatchingAccounts();

      const result = selectAccountGroupWithInternalAccounts(
        stateWithNoMatchingAccounts,
      );
      expect(result[0].accounts).toEqual([]);
    });
  });

  describe('selectCaip25AccountIdToMultichainAccountGroupMap', () => {
    it('maps CAIP-25 account IDs to multichain account group IDs', () => {
      const result = selectCaip25AccountIdToMultichainAccountGroupMap(
        typedMockStateWithKeyring,
      );

      expect(result.size).toBeGreaterThan(0);
      expect(
        result.get(
          `${EIP155_MAINNET_SCOPE}:${ACCOUNT_1_ADDRESS}` as `${string}:${string}:${string}`,
        ),
      ).toBe(ENTROPY_GROUP_1_ID);
      expect(
        result.get(
          `${EIP155_MAINNET_SCOPE}:${ACCOUNT_2_ADDRESS}` as `${string}:${string}:${string}`,
        ),
      ).toBe(ENTROPY_GROUP_1_ID);
      expect(
        result.get(
          `${EIP155_MAINNET_SCOPE}:${ACCOUNT_3_ADDRESS}` as `${string}:${string}:${string}`,
        ),
      ).toBe(ENTROPY_GROUP_2_ID);
    });

    it('returns empty map when no accounts exist', () => {
      const emptyState = {
        ...typedMockStateWithKeyring,
        engine: {
          ...typedMockState.engine,
          backgroundState: {
            ...typedMockState.engine.backgroundState,
            AccountTreeController: {
              accountTree: {
                wallets: {},
                selectedAccountGroup: null as unknown as AccountGroupId,
              },
              accountGroupsMetadata: {},
              accountWalletsMetadata: {},
            },
            AccountsController: {
              internalAccounts: {
                accounts: {},
                selectedAccount: '',
              },
            },
            KeyringController: {
              keyrings: [],
              isUnlocked: true,
            },
          },
        },
      };
      const result =
        selectCaip25AccountIdToMultichainAccountGroupMap(emptyState);

      expect(result.size).toBe(0);
    });

    it('skips accounts without matching internal accounts', () => {
      const stateWithMissingInternalAccount =
        createStateWithMissingInternalAccount();
      const result = selectCaip25AccountIdToMultichainAccountGroupMap(
        stateWithMissingInternalAccount,
      );

      expect(result.size).toBe(0);
    });
  });
});
