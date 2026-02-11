import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountGroupId, AccountWalletId, select } from '@metamask/account-api';
import { CaipChainId } from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';
import { EthAccountType, EthScope } from '@metamask/keyring-api';

import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';
import {
  selectAccountTreeControllerState,
  selectAccountGroupWithInternalAccounts,
} from './accountTreeController';
import { selectInternalAccountsById } from '../accountsController';
import {
  type EvmAndMultichainNetworkConfigurationsWithCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../networkController';
import { TEST_NETWORK_IDS } from '../../constants/network';
import type { AccountGroupWithInternalAccounts } from './accounts.type';
import { sortNetworkAddressItems } from '../../component-library/components-temp/MultichainAccounts/MultichainAddressRowsList/MultichainAddressRowsList.utils';
import { toFormattedAddress } from '../../util/address';

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
  // For non-EVM scopes, use exact first matching account
  const [firstAccount] = select(accountGroupInternalAccounts, {
    scopes: [scope],
  });

  return firstAccount;
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

        const items = accounts.flatMap((account) => {
          // Determine scopes based on account type
          const scopes =
            account.type === EthAccountType.Eoa
              ? ethereumNetworkIds
              : account.scopes || [];
          // Format address once: checksummed for EVM, raw for non-EVM
          const formattedAddress = toFormattedAddress(account.address);
          // Filter out testnets from scopes and map each scope to an account-scope object
          return filterTestnets(
            scopes as CaipChainId[],
            networkConfigurations,
          ).map((scope: CaipChainId) => ({
            account: { ...account, address: formattedAddress },
            scope,
            networkName:
              networkConfigurations[scope]?.name || 'Unknown Network',
          }));
        });

        // Sort items using the same sorting logic as MultichainAddressRowsList
        const sortedItems = sortNetworkAddressItems(
          items.map((item) => ({
            chainId: item.scope,
            networkName: item.networkName,
            address: item.account.address,
          })),
        );

        // Map back to the original format with sorted order
        return sortedItems.map((sortedItem) => {
          const originalItem = items.find(
            (item) =>
              item.scope === sortedItem.chainId &&
              item.account.address === sortedItem.address,
          );
          // originalItem should always exist since sortedItems is derived from items
          if (!originalItem) {
            throw new Error(
              `Failed to find original item for scope ${sortedItem.chainId} and address ${sortedItem.address}`,
            );
          }
          return originalItem;
        });
      };
    },
  );

/**
 * Selector factory to get an icon seed address for an account group.
 * Priority:
 * 1) First EVM account address (any scope starting with 'eip155:')
 * 2) If no EVM account, fallback to the first internal account address in the group
 * 3) Otherwise throw an error
 *
 */
export const selectIconSeedAddressByAccountGroupId = (
  groupId: AccountGroupId,
) =>
  createDeepEqualSelector(
    [
      selectAccountTreeControllerState,
      selectInternalAccountsById,
      selectInternalAccountsByGroupId,
    ],
    (
      accountTreeState: AccountTreeControllerState,
      internalAccountsMap: Record<AccountId, InternalAccount>,
      internalAccountsByGroupId,
    ): string => {
      // Prefer an EVM account address if present
      const evmAccount = findInternalAccountByScope(
        accountTreeState,
        internalAccountsMap,
        groupId,
        EthScope.Mainnet,
      );
      if (evmAccount?.address) {
        return evmAccount.address;
      }

      // Fallback to the first available internal account in the group
      const accountsInGroup = internalAccountsByGroupId(groupId);
      if (accountsInGroup.length > 0) {
        return accountsInGroup[0].address;
      }

      // Fallback to empty string
      return '';
    },
  );

/**
 * Efficient selector to get icon seed addresses for multiple account groups at once.
 * This selector is optimized for batch operations and avoids creating multiple selectors.
 *
 * Priority for each group:
 * 1) First EVM account address (any scope starting with 'eip155:')
 * 2) If no EVM account, fallback to the first internal account address in the group
 * 3) Otherwise returns undefined for that group
 *
 * @param state - The Redux root state
 * @param accountGroupIds - Array of account group IDs to get icon seed addresses for
 * @returns Record mapping account group IDs to their icon seed addresses
 */
export const selectIconSeedAddressesByAccountGroupIds = createDeepEqualSelector(
  [
    selectAccountTreeControllerState,
    selectInternalAccountsById,
    (_state: RootState, accountGroupIds: AccountGroupId[]) => accountGroupIds,
  ],
  (
    accountTreeState: AccountTreeControllerState,
    internalAccountsMap: Record<AccountId, InternalAccount>,
    accountGroupIds: AccountGroupId[],
  ): Record<AccountGroupId, string> => {
    const result: Record<AccountGroupId, string> = {} as Record<
      AccountGroupId,
      string
    >;

    if (!accountTreeState?.accountTree?.wallets) {
      return result;
    }

    for (const groupId of accountGroupIds) {
      try {
        // Prefer an EVM account address if present
        const evmAccount = findInternalAccountByScope(
          accountTreeState,
          internalAccountsMap,
          groupId,
          EthScope.Mainnet,
        );

        if (evmAccount?.address) {
          result[groupId] = evmAccount.address;
          continue;
        }

        // Fallback to the first available internal account in the group
        const walletId = getWalletIdFromAccountGroup(groupId);
        const wallet = accountTreeState.accountTree.wallets[walletId];

        if (!wallet) {
          continue;
        }

        const accountGroup =
          wallet.groups[groupId as keyof typeof wallet.groups];

        if (!accountGroup || accountGroup.accounts.length === 0) {
          continue;
        }

        const firstAccountId = accountGroup.accounts[0];
        const firstAccount = internalAccountsMap[firstAccountId];

        if (firstAccount?.address) {
          result[groupId] = firstAccount.address;
        }
      } catch (error) {
        // Skip this group if there's an error, don't throw
        console.warn(
          `Failed to get icon seed address for group ${groupId}:`,
          error,
        );
      }
    }

    return result;
  },
);

/**
 * Selector to get account groups by a list of addresses.
 * Returns groups that contain at least one account matching any of the provided addresses.
 *
 * @param _state - Redux state.
 * @param addresses - An array of addresses to filter account groups by.
 * @returns An array of AccountGroupWithInternalAccounts that contain at least one matching account.
 */
export const selectAccountGroupsByAddress = createDeepEqualSelector(
  [
    selectAccountGroupWithInternalAccounts,
    (_state: RootState, addresses: string[]) =>
      new Set(addresses.map((address) => address.toLowerCase())),
  ],
  (
    accountGroupWithInternalAccounts,
    addressesSet: Set<string>,
  ): AccountGroupWithInternalAccounts[] => {
    const matchingGroups = new Set<AccountGroupWithInternalAccounts>();

    accountGroupWithInternalAccounts.forEach((group) => {
      const containsMatchingAccount = group.accounts.some((account) =>
        addressesSet.has(account.address.toLowerCase()),
      );

      if (containsMatchingAccount) {
        matchingGroups.add(group);
      }
    });

    // Convert the Set of AccountGroupWithInternalAccounts to an Array
    return [...matchingGroups];
  },
);
