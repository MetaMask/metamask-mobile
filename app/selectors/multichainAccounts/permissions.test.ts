import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AccountGroupObject,
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  AccountGroupId,
  AccountWalletId,
  AccountGroupType,
  AccountWalletType,
} from '@metamask/account-api';
import {
  EthAccountType,
  SolAccountType,
  EthScope,
  SolScope,
} from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  selectInternalAccountBySelectedAccountGroupAndCaip,
  selectInternalAccountByGroupAndCaip,
  getCaip25AccountIdToMultichainAccountGroupMap,
  getAccountGroupWithInternalAccounts,
  getMultichainAccountsToScopesMap,
  selectAccountGroupsByScopes,
} from './permissions';

import { RootState } from '../../reducers';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../../util/test/accountsControllerTestUtils';

const MOCK_WALLET_ID: AccountWalletId = 'keyring:wallet1';
const MOCK_GROUP_ID: AccountGroupId = 'entropy:test-group-1/1';
const MOCK_SINGLE_ACCOUNT_GROUP_ID: AccountGroupId = 'keyring:wallet1/account1';
const MOCK_CAIP_CHAIN_ID_EVM: CaipChainId = EthScope.Eoa;
const MOCK_CAIP_CHAIN_ID_SOLANA: CaipChainId = SolScope.Mainnet;

function createMockEvmAccount(
  address = '0x1234567890123456789012345678901234567890',
  name = 'Account 1',
): InternalAccount {
  return createMockInternalAccount(
    address,
    name,
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );
}

function createMockSolanaAccount(
  address = 'BQWWFhzBdw2vKKBUX17NHeFbCoFQHfRARpdztPE2tDJ',
  name = 'Account 2',
): InternalAccount {
  return createMockSnapInternalAccount(
    address,
    name,
    SolAccountType.DataAccount,
  );
}

function createMockAccountNoScopes(
  address = '0x9999999999999999999999999999999999999999',
  name = 'Account No Scopes',
  id = 'account-no-scopes',
): InternalAccount {
  const account = createMockInternalAccount(
    address,
    name,
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );
  account.scopes = [];
  account.id = id;
  return account;
}

function createMockAccountGroup(
  accounts: InternalAccount[],
  groupId: AccountGroupId = MOCK_GROUP_ID,
  groupType: AccountGroupType = AccountGroupType.MultichainAccount,
  name = 'Test Group',
): AccountGroupObject {
  const baseMetadata = {
    name,
    pinned: false,
    hidden: false,
  };

  const metadata =
    groupType === AccountGroupType.MultichainAccount
      ? { ...baseMetadata, entropy: { groupIndex: 1 } }
      : baseMetadata;

  return {
    id: groupId,
    type: groupType,
    accounts: accounts.map((acc) => acc.id),
    metadata,
  } as AccountGroupObject;
}

function createMockMultichainAccountGroup(
  accounts: InternalAccount[],
  name = 'Test Group',
): AccountGroupObject {
  return createMockAccountGroup(
    accounts,
    MOCK_GROUP_ID,
    AccountGroupType.MultichainAccount,
    name,
  );
}

function createMockSingleAccountGroup(
  account: InternalAccount,
  name = 'Test Single Account Group',
): AccountGroupObject {
  return createMockAccountGroup(
    [account],
    MOCK_SINGLE_ACCOUNT_GROUP_ID,
    AccountGroupType.SingleAccount,
    name,
  );
}

function createMockWallet(groups: AccountGroupObject[]): AccountWalletObject {
  const groupsMap: Record<string, AccountGroupObject> = {};
  groups.forEach((group) => {
    groupsMap[group.id] = group;
  });

  return {
    id: MOCK_WALLET_ID,
    type: AccountWalletType.Keyring,
    metadata: {
      name: 'Test Wallet',
      keyring: {
        type: KeyringTypes.hd,
      },
    },
    groups: groupsMap,
  } as AccountWalletObject;
}

function createMockAccountTreeState(
  wallets: AccountWalletObject[],
  selectedAccountGroup?: AccountGroupId | null,
): AccountTreeControllerState {
  const walletsMap: Record<string, AccountWalletObject> = {};
  wallets.forEach((wallet) => {
    walletsMap[wallet.id] = wallet;
  });

  return {
    accountTree: {
      wallets: walletsMap,
      selectedAccountGroup:
        selectedAccountGroup === null
          ? ''
          : selectedAccountGroup || MOCK_GROUP_ID,
    },
    accountGroupsMetadata: {},
    accountWalletsMetadata: {},
  };
}

function createMockAccountsControllerState(
  accounts: InternalAccount[],
  selectedAccount?: string,
): AccountsControllerState {
  const accountsMap: Record<string, InternalAccount> = {};
  accounts.forEach((account) => {
    accountsMap[account.id] = account;
  });

  return {
    internalAccounts: {
      accounts: accountsMap,
      selectedAccount: selectedAccount || accounts[0]?.id,
    },
  };
}

function createMockRootState(
  accounts: InternalAccount[],
  groups: AccountGroupObject[],
  selectedAccountGroup?: AccountGroupId | null,
): RootState {
  const wallet = createMockWallet(groups);
  const accountTreeState = createMockAccountTreeState(
    [wallet],
    selectedAccountGroup,
  );
  const accountsControllerState = createMockAccountsControllerState(accounts);

  return {
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeState,
        AccountsController: accountsControllerState,
      },
    },
  } as RootState;
}

// Common test scenarios
function createStandardTestState() {
  const evmAccount = createMockEvmAccount();
  const solanaAccount = createMockSolanaAccount();
  const multichainGroup = createMockMultichainAccountGroup([
    evmAccount,
    solanaAccount,
  ]);
  const singleGroup = createMockSingleAccountGroup(evmAccount);
  const state = createMockRootState(
    [evmAccount, solanaAccount],
    [multichainGroup, singleGroup],
  );

  return { evmAccount, solanaAccount, multichainGroup, singleGroup, state };
}

function createNoSelectedGroupTestState() {
  const evmAccount = createMockEvmAccount();
  const solanaAccount = createMockSolanaAccount();
  const multichainGroup = createMockMultichainAccountGroup([
    evmAccount,
    solanaAccount,
  ]);
  const state = createMockRootState(
    [evmAccount, solanaAccount],
    [multichainGroup],
    null,
  );

  return { evmAccount, solanaAccount, multichainGroup, state };
}

function createNoScopesTestState() {
  const accountWithoutScopes = createMockAccountNoScopes();
  const groupWithNoScopesAccount = createMockMultichainAccountGroup([
    accountWithoutScopes,
  ]);
  const state = createMockRootState(
    [accountWithoutScopes],
    [groupWithNoScopesAccount],
  );

  return { accountWithoutScopes, groupWithNoScopesAccount, state };
}

describe('permissions selectors', () => {
  describe('selectInternalAccountBySelectedAccountGroupAndCaip', () => {
    it('returns the correct internal account when account group is selected', () => {
      const { evmAccount, state } = createStandardTestState();

      const result = selectInternalAccountBySelectedAccountGroupAndCaip(
        state,
        MOCK_CAIP_CHAIN_ID_EVM,
      );

      expect(result).toEqual(evmAccount);
    });

    it('returns null when no account group is selected', () => {
      const { state } = createNoSelectedGroupTestState();

      const result = selectInternalAccountBySelectedAccountGroupAndCaip(
        state,
        MOCK_CAIP_CHAIN_ID_EVM,
      );

      expect(result).toBeNull();
    });

    it('returns null when no account matches the CAIP chain ID', () => {
      const { state } = createStandardTestState();
      const nonMatchingCaipChainId = 'eip155:999' as CaipChainId;

      const result = selectInternalAccountBySelectedAccountGroupAndCaip(
        state,
        nonMatchingCaipChainId,
      );

      expect(result).toBeNull();
    });
  });

  describe('selectInternalAccountByGroupAndCaip', () => {
    it('returns the correct internal account for given group and CAIP chain ID', () => {
      const { evmAccount, state } = createStandardTestState();

      const result = selectInternalAccountByGroupAndCaip(
        state,
        MOCK_GROUP_ID,
        MOCK_CAIP_CHAIN_ID_EVM,
      );

      expect(result).toEqual(evmAccount);
    });

    it('returns null when group is not found', () => {
      const { state } = createStandardTestState();
      const nonExistentGroupId = 'non-existent' as AccountGroupId;

      const result = selectInternalAccountByGroupAndCaip(
        state,
        nonExistentGroupId,
        MOCK_CAIP_CHAIN_ID_EVM,
      );

      expect(result).toBeNull();
    });

    it('returns correct account for Solana CAIP chain ID', () => {
      const { solanaAccount, state } = createStandardTestState();

      const result = selectInternalAccountByGroupAndCaip(
        state,
        MOCK_GROUP_ID,
        MOCK_CAIP_CHAIN_ID_SOLANA,
      );

      expect(result).toEqual(solanaAccount);
    });
  });

  describe('getCaip25AccountIdToMultichainAccountGroupMap', () => {
    it('creates correct mapping from CAIP-25 account IDs to multichain account groups', () => {
      const { evmAccount, solanaAccount, state } = createStandardTestState();

      const result = getCaip25AccountIdToMultichainAccountGroupMap(state);

      expect(result).toBeInstanceOf(Map);

      const expectedEvmCaipAccountId: CaipAccountId = `${MOCK_CAIP_CHAIN_ID_EVM}:${evmAccount.address}`;
      const expectedSolanaCaipAccountId: CaipAccountId = `${MOCK_CAIP_CHAIN_ID_SOLANA}:${solanaAccount.address}`;

      expect(result.get(expectedEvmCaipAccountId)).toBe(MOCK_GROUP_ID);
      expect(result.get(expectedSolanaCaipAccountId)).toBe(MOCK_GROUP_ID);
    });

    it('handles accounts without scopes gracefully', () => {
      const { state } = createNoScopesTestState();

      const result = getCaip25AccountIdToMultichainAccountGroupMap(state);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('getAccountGroupWithInternalAccounts', () => {
    it('returns account groups with resolved internal accounts', () => {
      const { evmAccount, solanaAccount, state } = createStandardTestState();

      const result = getAccountGroupWithInternalAccounts(state);

      expect(result).toHaveLength(2);

      const multichainGroupResult = result.find(
        (group) => group.id === MOCK_GROUP_ID,
      );
      expect(multichainGroupResult).toBeDefined();
      expect(multichainGroupResult?.accounts).toHaveLength(2);
      expect(multichainGroupResult?.accounts).toContain(evmAccount);
      expect(multichainGroupResult?.accounts).toContain(solanaAccount);

      const singleGroupResult = result.find(
        (group) => group.id === MOCK_SINGLE_ACCOUNT_GROUP_ID,
      );
      expect(singleGroupResult).toBeDefined();
      expect(singleGroupResult?.accounts).toHaveLength(1);
      expect(singleGroupResult?.accounts).toContain(evmAccount);
    });

    it('filters out undefined accounts', () => {
      const evmAccount = createMockEvmAccount();
      // Create a group that references a non-existent account
      const groupWithMissingAccount = createMockAccountGroup(
        [evmAccount],
        MOCK_GROUP_ID,
        AccountGroupType.MultichainAccount,
        'Group with Missing Account',
      );
      // Override accounts to include non-existent account
      groupWithMissingAccount.accounts = [
        evmAccount.id,
        'non-existent-account-id',
      ];

      const state = createMockRootState(
        [evmAccount],
        [groupWithMissingAccount],
      );

      const result = getAccountGroupWithInternalAccounts(state);

      expect(result).toHaveLength(1);
      expect(result[0].accounts).toHaveLength(1);
      expect(result[0].accounts[0]).toEqual(evmAccount);
    });
  });

  describe('getMultichainAccountsToScopesMap', () => {
    it('creates correct mapping from multichain account groups to scopes', () => {
      const { evmAccount, solanaAccount, state } = createStandardTestState();

      const result = getMultichainAccountsToScopesMap(state);

      expect(result).toBeInstanceOf(Map);
      expect(result.has(MOCK_GROUP_ID)).toBe(true);

      const scopesMap = result.get(MOCK_GROUP_ID);
      expect(scopesMap).toBeInstanceOf(Map);

      const expectedEvmCaipAccountId: CaipAccountId = `eip155:1:${evmAccount.address}`;
      const expectedSolanaCaipAccountId: CaipAccountId = `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${solanaAccount.address}`;

      expect(scopesMap?.get(MOCK_CAIP_CHAIN_ID_EVM)).toBe(
        expectedEvmCaipAccountId,
      );
      expect(scopesMap?.get(MOCK_CAIP_CHAIN_ID_SOLANA)).toBe(
        expectedSolanaCaipAccountId,
      );
    });

    it('handles accounts without scopes gracefully', () => {
      const accountWithoutScopes = createMockAccountNoScopes(
        '0x8888888888888888888888888888888888888888',
        'Account No Scopes 2',
        'account-no-scopes-2',
      );
      const multichainGroupWithNoScopesAccount =
        createMockMultichainAccountGroup([accountWithoutScopes]);
      const state = createMockRootState(
        [accountWithoutScopes],
        [multichainGroupWithNoScopesAccount],
      );

      const result = getMultichainAccountsToScopesMap(state);

      expect(result).toBeInstanceOf(Map);
      expect(result.has(MOCK_GROUP_ID)).toBe(true);

      const scopesMap = result.get(MOCK_GROUP_ID);
      expect(scopesMap).toBeInstanceOf(Map);
      expect(scopesMap?.size).toBe(0);
    });
  });

  describe('selectAccountGroupsByScopes', () => {
    it('returns all account groups when EVM scope is requested', () => {
      const { state } = createStandardTestState();
      const scopes = ['eip155:1', 'solana:mainnet'];

      const result = selectAccountGroupsByScopes(state, scopes);

      expect(result).toHaveLength(2);
      expect(result.some((group) => group.id === MOCK_GROUP_ID)).toBe(true);
      expect(
        result.some((group) => group.id === MOCK_SINGLE_ACCOUNT_GROUP_ID),
      ).toBe(true);
    });

    it('returns filtered account groups for non-EVM scopes', () => {
      const { state } = createStandardTestState();
      const scopes = [MOCK_CAIP_CHAIN_ID_SOLANA];

      const result = selectAccountGroupsByScopes(state, scopes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(MOCK_GROUP_ID);
    });

    it('returns empty array when no groups match the scopes', () => {
      const { state } = createStandardTestState();
      const nonMatchingScopes = ['bitcoin:mainnet'];

      const result = selectAccountGroupsByScopes(state, nonMatchingScopes);

      expect(result).toHaveLength(0);
    });

    it('handles empty scopes array', () => {
      const { state } = createStandardTestState();
      const emptyScopes: string[] = [];

      const result = selectAccountGroupsByScopes(state, emptyScopes);

      expect(result).toHaveLength(0);
    });
  });
});
