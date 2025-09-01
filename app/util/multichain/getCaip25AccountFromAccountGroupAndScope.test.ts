import { getCaip25AccountFromAccountGroupAndScope } from './getCaip25AccountFromAccountGroupAndScope';
import { AccountGroupWithInternalAccounts } from '../../selectors/multichainAccounts/accounts.type';
import { CaipChainId } from '@metamask/utils';
import {
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
  createMockInternalAccount,
  createMockSnapInternalAccount,
  MOCK_ACCOUNT_BIP122_P2WPKH,
  MOCK_SOLANA_ACCOUNT,
} from '../test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  EthAccountType,
  BtcAccountType,
  SolAccountType,
} from '@metamask/keyring-api';

describe('getCaip25AccountFromAccountGroupAndScope', () => {
  const createAccountGroup = (
    id: string,
    accounts: ReturnType<typeof createMockInternalAccount>[],
  ): AccountGroupWithInternalAccounts => {
    const accountGroup = {
      id: `keyring:${id}/0` as const,
      type: 'single-account' as const,
      accounts: Array.isArray(accounts)
        ? accounts.map((account) => account.id)
        : [],
      metadata: {
        name: `Test Group ${id}`,
        pinned: false,
        hidden: false,
      },
    };

    return {
      ...accountGroup,
      accounts: Array.isArray(accounts) ? accounts : [],
    } as AccountGroupWithInternalAccounts;
  };

  describe('scope parsing logic', () => {
    it('parses valid CAIP chain IDs correctly', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:1', 'eip155:137'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`,
        `eip155:137:${MOCK_ADDRESS_1}`,
      ]);
    });

    it('filters out invalid CAIP chain IDs during parsing', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes = [
        'eip155:1',
        'invalid-scope',
        'also:invalid:scope:format',
      ] as CaipChainId[];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([`eip155:1:${MOCK_ADDRESS_1}`]);
    });

    it('handles empty scopes array', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = [];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]);
    });

    it('handles all invalid scopes', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes = [
        'invalid',
        'also-invalid',
        '',
      ] as unknown as CaipChainId[];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]);
    });
  });

  describe('account enumeration logic', () => {
    it('enumerates accounts across multiple account groups', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      const account2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');
      account1.scopes = ['eip155:1'];
      account2.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
        createAccountGroup('group2', [account2]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`,
        `eip155:1:${MOCK_ADDRESS_2}`,
      ]);
    });

    it('handles multiple accounts within same group', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      const account2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');
      account1.scopes = ['eip155:1'];
      account2.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1, account2]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`,
        `eip155:1:${MOCK_ADDRESS_2}`,
      ]);
    });

    it('only includes accounts that support the requested scope', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      const account2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');
      // Override scopes for this test
      account1.scopes = ['eip155:1'];
      account2.scopes = ['eip155:137']; // Different scope

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1, account2]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([`eip155:1:${MOCK_ADDRESS_1}`]);
    });

    it('handles empty account groups', () => {
      const accountGroups: AccountGroupWithInternalAccounts[] = [];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]);
    });

    it('handles account groups with no accounts', () => {
      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', []),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]);
    });
  });

  describe('EVM wildcard scope matching', () => {
    it('matches EVM accounts with wildcard scope', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:0'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`,
        `eip155:137:${MOCK_ADDRESS_1}`,
      ]);
    });

    it('matches EVM accounts with both wildcard and specific scopes', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:0', 'eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      // Should match once (not duplicate)
      expect(result).toEqual([`eip155:1:${MOCK_ADDRESS_1}`]);
    });

    it('does not apply wildcard matching to non-EVM namespaces', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = ['eip155:0'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
      ]; // Non-EVM scope

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]); // Should not match
    });

    it('handles mixed EVM and non-EVM scopes correctly', () => {
      const ethAccount = createMockInternalAccount(
        MOCK_ADDRESS_1,
        'ETH Account',
      );
      const btcAccount = { ...MOCK_ACCOUNT_BIP122_P2WPKH };
      const solanaAccount = { ...MOCK_SOLANA_ACCOUNT };
      ethAccount.scopes = ['eip155:0'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [ethAccount, btcAccount, solanaAccount]),
      ];
      const scopes: CaipChainId[] = [
        'eip155:1' as CaipChainId, // Should match ETH account via wildcard
        btcAccount.scopes[0] as CaipChainId, // Should match BTC account
        solanaAccount.scopes[0] as CaipChainId, // Should match Solana account
      ];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`, // ETH account matched via wildcard
        `${btcAccount.scopes[0]}:${btcAccount.address}`, // BTC account exact match
        `${solanaAccount.scopes[0]}:${solanaAccount.address}`, // Solana account exact match
      ]);
    });
  });

  describe('edge cases and error handling', () => {
    it('handles accounts with empty scopes array', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = [];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([]);
    });

    it('handles very large numbers of accounts and scopes', () => {
      const largeAccountGroups: AccountGroupWithInternalAccounts[] = Array.from(
        { length: 10 },
        (__, groupIndex) => {
          const accounts = Array.from({ length: 10 }, (_, accountIndex) => {
            const address = `0x${groupIndex}${accountIndex}${'0'.repeat(38)}`;
            const account = createMockInternalAccount(
              address,
              `Account ${groupIndex}-${accountIndex}`,
            );
            account.scopes = ['eip155:1' as const];
            return account;
          });
          return createAccountGroup(`group${groupIndex}`, accounts);
        },
      );
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        largeAccountGroups,
        scopes,
      );

      expect(result).toHaveLength(100); // 10 groups × 10 accounts
      expect(result[0]).toMatch(/^eip155:1:0x00/);
    });
  });

  describe('performance and optimization', () => {
    it('pre-parses scopes to avoid repeated parsing', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      const account2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');
      account1.scopes = ['eip155:1'];
      account2.scopes = ['eip155:1'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1, account2]),
      ];
      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${MOCK_ADDRESS_1}`,
        `eip155:1:${MOCK_ADDRESS_2}`,
      ]);
    });

    it('uses Set for efficient scope lookups', () => {
      const account1 = createMockInternalAccount(MOCK_ADDRESS_1, 'Account 1');
      account1.scopes = Array.from(
        { length: 100 },
        (_, i) => `eip155:${i}` as const,
      );

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('group1', [account1]),
      ];
      const scopes: CaipChainId[] = ['eip155:50' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([`eip155:50:${MOCK_ADDRESS_1}`]);
    });
  });

  describe('multichain account types', () => {
    it('handles different account types from Snap keyrings', () => {
      const ethSnapAccount = createMockSnapInternalAccount(
        MOCK_ADDRESS_1,
        'ETH Snap Account',
        EthAccountType.Eoa,
      );
      const btcSnapAccount = createMockSnapInternalAccount(
        'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
        'BTC Snap Account',
        BtcAccountType.P2wpkh,
      );
      const solanaSnapAccount = createMockSnapInternalAccount(
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        'Solana Snap Account',
        SolAccountType.DataAccount,
      );

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('snap-group', [
          ethSnapAccount,
          btcSnapAccount,
          solanaSnapAccount,
        ]),
      ];

      const scopes: CaipChainId[] = [
        ethSnapAccount.scopes[0] as CaipChainId,
        btcSnapAccount.scopes[0] as CaipChainId,
        solanaSnapAccount.scopes[0] as CaipChainId,
      ];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `${ethSnapAccount.scopes[0]}:${ethSnapAccount.address}`,
        `${btcSnapAccount.scopes[0]}:${btcSnapAccount.address}`,
        `${solanaSnapAccount.scopes[0]}:${solanaSnapAccount.address}`,
      ]);
    });

    it('handles mixed keyring types in same group', () => {
      const hdAccount = createMockInternalAccount(
        MOCK_ADDRESS_1,
        'HD Account',
        KeyringTypes.hd,
      );
      const snapAccount = createMockInternalAccount(
        MOCK_ADDRESS_2,
        'Snap Account',
        KeyringTypes.snap,
      );

      hdAccount.scopes = ['eip155:1', 'eip155:137'];
      snapAccount.scopes = ['eip155:1', 'eip155:137'];

      const accountGroups: AccountGroupWithInternalAccounts[] = [
        createAccountGroup('mixed-group', [hdAccount, snapAccount]),
      ];

      const scopes: CaipChainId[] = ['eip155:1' as CaipChainId];

      const result = getCaip25AccountFromAccountGroupAndScope(
        accountGroups,
        scopes,
      );

      expect(result).toEqual([
        `eip155:1:${hdAccount.address}`,
        `eip155:1:${snapAccount.address}`,
      ]);
    });
  });
});
