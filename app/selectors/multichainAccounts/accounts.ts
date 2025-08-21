import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import {
  AccountGroupId,
  AccountWalletId,
  selectOne,
} from '@metamask/account-api';
import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';
import { EthAccountType } from '@metamask/keyring-api';

import { createDeepEqualSelector } from '../util';
import {
  selectAccountGroupWithInternalAccounts,
  selectAccountTreeControllerState,
} from './accountTreeController';
import { selectInternalAccountsById } from '../accountsController';
import {
  type EvmAndMultichainNetworkConfigurationsWithCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../networkController';
import { TEST_NETWORK_IDS } from '../../constants/network';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import { AccountGroupWithInternalAccounts } from './accounts.type';
import { createSelector } from 'reselect';

/**
 * Extracts the wallet ID from an account group ID.
 *
 * Account group IDs follow the format: "{walletId}/{groupName}"
 * For example: "keyring:wallet1/1" -> "keyring:wallet1"
 *
 * @param accountGroupId - The account group ID to extract the wallet ID from
 * @returns The wallet ID portion of the account group ID
 * @throws {Error} If the account group ID is invalid (no wallet ID before '/')
 *
 * @example
 * ```typescript
 * const walletId = getWalletIdFromAccountGroup('keyring:wallet1/ethereum');
 * // Returns: 'keyring:wallet1'
 * ```
 */
export const getWalletIdFromAccountGroup = (
  accountGroupId: AccountGroupId,
): AccountWalletId => {
  const walletId = accountGroupId.split('/')[0];

  if (!walletId) {
    throw new Error('Invalid account group ID');
  }

  return walletId as AccountWalletId;
};

/**
 * Helper function to find an internal account by scope within a specific account group.
 *
 * This function performs the core logic for finding accounts that match a given scope
 * within a specific account group. It handles both EVM and non-EVM scopes:
 * - For EVM scopes (eip155:*): Matches any account with any EVM scope
 * - For non-EVM scopes: Requires exact scope match
 *
 * @param accountTreeState - The AccountTreeController state containing wallet/group data
 * @param internalAccountsMap - Map of account IDs to internal account objects
 * @param accountGroupId - The account group ID to search within
 * @param scope - The CAIP chain ID scope to match against account scopes
 * @returns The first matching internal account, or undefined if none found
 *
 * @example
 * ```typescript
 * const account = findInternalAccountByScope(
 *   accountTreeState,
 *   accountsMap,
 *   'keyring:wallet1/ethereum',
 *   'eip155:1'
 * );
 * ```
 */
const findInternalAccountByScope = (
  accountTreeState: AccountTreeControllerState,
  internalAccountsMap: Record<AccountId, InternalAccount>,
  accountGroupId: string,
  scope: CaipChainId,
): InternalAccount | undefined => {
  if (!accountTreeState?.accountTree?.wallets || !accountGroupId) {
    return undefined;
  }

  const walletId = getWalletIdFromAccountGroup(
    accountGroupId as AccountGroupId,
  );

  const wallet: AccountWalletObject | undefined =
    accountTreeState.accountTree.wallets[walletId];
  if (!wallet) {
    return undefined;
  }

  const accountGroup =
    wallet.groups[accountGroupId as keyof typeof wallet.groups];

  if (!accountGroup) {
    return undefined;
  }

  const accountGroupInternalAccounts = accountGroup.accounts
    .map((accountId: AccountId) => internalAccountsMap[accountId])
    // filter out undefined accounts. The accounts should never be undefined
    // because the accounts in the accountGroup comes from the accounts controller
    .filter((account): account is InternalAccount => Boolean(account));

  // Handle EVM scope matching: for EVM scopes (eip155:*), match any account with any EVM scope
  // For non-EVM scopes, require exact scope match
  const isEvmScope = scope.startsWith('eip155:');

  if (isEvmScope) {
    // Find any account that has any EVM scope
    return accountGroupInternalAccounts.find((account) =>
      account.scopes.some((accountScope) => accountScope.startsWith('eip155:')),
    );
  }
  // For non-EVM scopes, use exact matching
  return selectOne(accountGroupInternalAccounts, {
    scopes: [scope],
  });
};

/**
 * Helper function to filter out testnets from a list of scopes.
 *
 * Given a list of scopes and the available network configurations, this function filters out all testnet scopes
 * for both EVM and non-EVM networks.
 *
 * @param scopes - The list of scopes to filter.
 * @param networksData - The network configurations data containing information about each scope.
 * @returns A new list of scopes excluding testnets.
 */
const filterTestnets = (
  scopes: CaipChainId[],
  networksData: Record<
    CaipChainId,
    EvmAndMultichainNetworkConfigurationsWithCaipChainId
  >,
): CaipChainId[] =>
  scopes.filter((scope) => {
    const network = networksData[scope];
    // TODO: Improve network data types on core module
    return (
      network &&
      // @ts-expect-error - The typing here is not consistent because of NetworkConfiguration and MultichainNetworkConfiguration types
      (!network.isTestnet || !TEST_NETWORK_IDS.includes(network.chainId))
    );
  });

/**
 * Selector to get an internal account by scope from the currently selected account group.
 *
 * This selector finds an account that matches the given scope within the currently
 * selected account group in the AccountTreeController. If no account group is selected
 * or no matching account is found, returns undefined.
 *
 * @param state - The Redux root state
 * @returns A function that takes a scope and returns the matching internal account or undefined
 *
 * @example
 * ```typescript
 * const selector = selectSelectedInternalAccountByScope(state);
 * const evmAccount = selector('eip155:1'); // Get EVM account from selected group
 * const solanaAccount = selector('solana:mainnet'); // Get Solana account from selected group
 * ```
 */
export const selectSelectedInternalAccountByScope = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectInternalAccountsById],
  (
      accountTreeState: AccountTreeControllerState,
      internalAccountsMap: Record<AccountId, InternalAccount>,
    ) =>
    (scope: CaipChainId): InternalAccount | undefined => {
      if (!accountTreeState?.accountTree?.selectedAccountGroup) {
        return undefined;
      }

      return findInternalAccountByScope(
        accountTreeState,
        internalAccountsMap,
        accountTreeState.accountTree.selectedAccountGroup,
        scope,
      );
    },
);

/**
 * Selector to get an internal account by scope from a specific account group.
 *
 * This selector allows you to find an account that matches a given scope within
 * any specific account group by providing both the scope and account group ID.
 * This is useful when you need to find accounts in groups other than the currently
 * selected one.
 *
 * @param state - The Redux root state
 * @returns A function that takes a scope and account group ID, returns the matching internal account or undefined
 *
 * @example
 * ```typescript
 * const selector = selectInternalAccountByAccountGroupAndScope(state);
 * const evmAccount = selector('eip155:1', 'keyring:wallet1/ethereum');
 * const solanaAccount = selector('solana:mainnet', 'entropy:wallet2/solana');
 * ```
 */
export const selectInternalAccountByAccountGroupAndScope =
  createDeepEqualSelector(
    [selectAccountTreeControllerState, selectInternalAccountsById],
    (
        accountTreeState: AccountTreeControllerState,
        internalAccountsMap: Record<AccountId, InternalAccount>,
      ) =>
      (
        scope: CaipChainId,
        accountGroupId: string,
      ): InternalAccount | undefined =>
        findInternalAccountByScope(
          accountTreeState,
          internalAccountsMap,
          accountGroupId,
          scope,
        ),
  );

/**
 * Selector to get internal accounts by group ID.
 * This selector retrieves all internal accounts associated with a specific account group ID.
 *
 * @param state - The Redux root state
 * @param groupId - The ID of the account group to retrieve internal accounts for
 * @returns Array of internal accounts for the specified group ID
 */
export const selectInternalAccountsByGroupId = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectInternalAccountsById],
  (accountTree, internalAccounts) =>
    (groupId: AccountGroupId): InternalAccount[] => {
      const [walletId] = groupId.split('/') as [AccountWalletId];
      const wallet = accountTree?.accountTree?.wallets[walletId];
      if (!wallet) {
        return [];
      }

      const group = wallet.groups[groupId];
      if (!group || group.accounts.length === 0) {
        return [];
      }

      return group.accounts
        .map((accountId) => internalAccounts[accountId])
        .filter((account): account is InternalAccount => account !== undefined);
    },
);

/**
 * Selector to get a list of internal accounts spread by scopes for a specific group ID.
 *
 * @param state - The Redux root state
 * @param groupId - The ID of the account group to retrieve internal accounts for
 * @returns Array of objects containing account, scope, and network name for each internal account in the specified group
 */
export const selectInternalAccountListSpreadByScopesByGroupId =
  createDeepEqualSelector(
    [selectInternalAccountsByGroupId, selectNetworkConfigurationsByCaipChainId],
    (internalAccounts, networkConfigurations) => {
      // Pre-compute Ethereum network IDs once and filter out non-EVM networks and testnets
      const ethereumNetworkIds = Object.values(networkConfigurations)
        .filter(
          ({ caipChainId, chainId }) =>
            caipChainId.startsWith('eip155:') &&
            // @ts-expect-error - the chain id should be hex for NetworkConfiguration
            !TEST_NETWORK_IDS.includes(chainId),
        )
        .map(({ caipChainId }) => caipChainId);

      // The complexity should be O(len_accounts * len_scopes), the performance for Ethereum EOA
      // accounts will depend on the number of networks available in the NetworkController.
      // And for Ethereum SCA and non-EVM accounts, it will depend on the length of scopes property.
      return (groupId: AccountGroupId) => {
        const accounts = internalAccounts(groupId);

        return accounts.flatMap((account) => {
          // Determine scopes based on account type
          const scopes =
            account.type === EthAccountType.Eoa
              ? ethereumNetworkIds
              : account.scopes || [];
          // Filter out testnets from scopes and map each scope to an account-scope object
          return filterTestnets(
            scopes as CaipChainId[],
            networkConfigurations,
          ).map((scope: CaipChainId) => ({
            account,
            scope,
            networkName:
              networkConfigurations[scope]?.name || 'Unknown Network',
          }));
        });
      };
    },
  );

/**
 * Create a map from CAIP-25 account IDs to multichain account group IDs.
 *
 * @param accountGroups - Array of all account groups.
 * @param internalAccounts - Array of internal accounts.
 * @returns Map from CAIP-25 account IDs to multichain account group IDs.
 */
export const selectCaip25AccountIdToMultichainAccountGroupMap =
  createDeepEqualSelector(
    selectAccountGroupWithInternalAccounts,
    selectNetworkConfigurationsByCaipChainId,
    (
      accountGroupsWithInternalAccounts: readonly AccountGroupWithInternalAccounts[],
      networkConfigurationsByCaipChainId: Record<
        CaipChainId,
        EvmAndMultichainNetworkConfigurationsWithCaipChainId
      >,
    ) => {
      const caip25AccountIdToAccountGroupMap = new Map<
        CaipAccountId,
        AccountGroupId
      >();

      // Pre-filter EVM chains once to avoid repeated filtering
      const evmChains = Object.keys(networkConfigurationsByCaipChainId).filter(
        (caipChainId) =>
          caipChainId.startsWith(`${KnownCaipNamespace.Eip155}:`),
      ) as CaipChainId[];

      const addScopedMappings = (
        scopes: string[],
        address: string,
        accountGroupId: AccountGroupId,
      ) => {
        scopes.forEach((scope) => {
          caip25AccountIdToAccountGroupMap.set(
            `${scope}:${address}` as CaipAccountId,
            accountGroupId,
          );
        });
      };

      const addEoaMappings = (
        address: string,
        accountGroupId: AccountGroupId,
      ) => {
        // Add wildcard mapping
        caip25AccountIdToAccountGroupMap.set(
          `${KnownCaipNamespace.Eip155}:0:${address}` as CaipAccountId,
          accountGroupId,
        );
        // Add specific chain mappings
        evmChains.forEach((caipChainId) => {
          caip25AccountIdToAccountGroupMap.set(
            `${caipChainId}:${address}` as CaipAccountId,
            accountGroupId,
          );
        });
      };

      accountGroupsWithInternalAccounts.forEach((accountGroup) => {
        accountGroup.accounts.forEach((account) => {
          const { address, type, scopes } = account;
          const { id: accountGroupId } = accountGroup;

          if (type === EthAccountType.Eoa) {
            addEoaMappings(address, accountGroupId);
          } else {
            // Handle ERC4337 and all other account types with scopes
            addScopedMappings(scopes, address, accountGroupId);
          }
        });
      });

      return caip25AccountIdToAccountGroupMap;
    },
  );

/**
 * Create a map from scope to account groups (multiple groups can support the same scope).
 *
 * @param accountGroupsWithInternalAccounts - Array of account groups with internal accounts.
 * @param networkConfigurationsByCaipChainId - Map of network configurations by CAIP chain ID.
 * @returns Map from scope to array of account groups.
 */
export const selectScopeToAccountGroupMap = createDeepEqualSelector(
  selectAccountGroupWithInternalAccounts,
  selectNetworkConfigurationsByCaipChainId,
  (
    accountGroupsWithInternalAccounts: readonly AccountGroupWithInternalAccounts[],
    networkConfigurationsByCaipChainId: Record<
      CaipChainId,
      EvmAndMultichainNetworkConfigurationsWithCaipChainId
    >,
  ) => {
    const scopeToAccountGroupMap = new Map<
      string,
      AccountGroupWithInternalAccounts[]
    >();

    const addAccountGroupToScope = (
      scope: string,
      accountGroup: AccountGroupWithInternalAccounts,
    ) => {
      const existingGroups = scopeToAccountGroupMap.get(scope) || [];
      if (!existingGroups.includes(accountGroup)) {
        existingGroups.push(accountGroup);
        scopeToAccountGroupMap.set(scope, existingGroups);
      }
    };

    accountGroupsWithInternalAccounts.forEach((accountGroup) => {
      accountGroup.accounts.forEach((account) => {
        account.scopes.forEach((scope) => {
          addAccountGroupToScope(scope, accountGroup);

          if (account.type === EthAccountType.Eoa) {
            addAccountGroupToScope(
              `${KnownCaipNamespace.Eip155}:0`,
              accountGroup,
            );
            Object.keys(networkConfigurationsByCaipChainId).forEach(
              (caipChainId) => {
                if (caipChainId.startsWith(`${KnownCaipNamespace.Eip155}:`)) {
                  addAccountGroupToScope(caipChainId, accountGroup);
                }
              },
            );
          }
        });
      });
    });

    return scopeToAccountGroupMap;
  },
);
