import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import {
  selectAccountsControllerState,
  selectInternalAccounts,
} from '../accountsController';
import {
  selectAccountGroups,
  selectAccountTreeControllerState,
  selectInternalAccountFromAccountGroup,
  selectMultichainAccountGroups,
  selectSelectedAccountGroup,
} from './accountTreeController';
import {
  AccountGroupObject,
  AccountTreeControllerState,
} from '@metamask/account-tree-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { AccountGroupId } from '@metamask/account-api';
import { selectAccountGroupByGroupId } from './accounts';
import { createSelector } from 'reselect';
import {
  AccountGroupWithInternalAccounts,
  MultichainAccountGroupScopeToCaipAccountId,
  MultichainAccountGroupToScopesMap,
} from './accounts.type';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { createDeepEqualSelector } from '../util';

/**
 * Selector that retrieves an internal account from the currently selected account group
 * that matches the specified CAIP chain ID.
 *
 * This selector combines the account tree state, accounts controller state, and currently
 * selected account group to find a specific account by its chain scope. It's useful for
 * getting the active account for a particular blockchain network.
 *
 * @param state - The Redux root state
 * @param caipChainId - The CAIP chain ID to search for (e.g., 'eip155:1' for Ethereum mainnet)
 * @returns The matching internal account object, or null if no selected group or matching account
 */
export const selectInternalAccountBySelectedAccountGroupAndCaip =
  createSelector(
    [
      selectAccountTreeControllerState,
      selectAccountsControllerState,
      selectSelectedAccountGroup,
      (_, caipChainId: CaipChainId) => caipChainId,
    ],
    (
      accountTree: AccountTreeControllerState,
      accountsControllerState: AccountsControllerState,
      selectedAccountGroup: AccountGroupObject | null,
      caipChainId: CaipChainId,
    ) => {
      if (!selectedAccountGroup) {
        return null;
      }

      const { wallets } = accountTree.accountTree;
      const group = selectAccountGroupByGroupId(
        wallets,
        selectedAccountGroup.id,
      );

      return selectInternalAccountFromAccountGroup(
        group,
        caipChainId,
        accountsControllerState.internalAccounts.accounts,
      );
    },
  );

/**
 * Selector that retrieves an internal account from a specific account group
 * that matches the specified CAIP chain ID.
 *
 * This selector is similar to `selectInternalAccountBySelectedAccountGroupAndCaip` but allows
 * you to specify any account group by its ID rather than using the currently selected one.
 * It's useful when you need to access accounts from specific groups programmatically.
 *
 * @param state - The Redux root state
 * @param groupId - The ID of the account group to search in
 * @param caipChainId - The CAIP chain ID to search for (e.g., 'eip155:1' for Ethereum mainnet)
 * @returns The matching internal account object, or null if group not found or no matching account
 * ```
 */
export const selectInternalAccountByGroupAndCaip = createDeepEqualSelector(
  selectAccountTreeControllerState,
  selectAccountsControllerState,
  (_, groupId: AccountGroupId, caipChainId: CaipChainId) => ({
    groupId,
    caipChainId,
  }),
  (
    accountTree: AccountTreeControllerState,
    accountsControllerState: AccountsControllerState,
    {
      groupId,
      caipChainId,
    }: { groupId: AccountGroupId; caipChainId: CaipChainId },
  ) => {
    const { wallets } = accountTree.accountTree;
    const group = selectAccountGroupByGroupId(wallets, groupId);

    return selectInternalAccountFromAccountGroup(
      group,
      caipChainId,
      accountsControllerState.internalAccounts.accounts,
    );
  },
);

/**
 * Selector that creates a mapping from CAIP-25 account IDs to their corresponding
 * multichain account group IDs.
 *
 * CAIP-25 account IDs are formatted as `{chainId}:{address}` (e.g., 'eip155:1:0x123...').
 * This selector is useful for permission management and determining which account group
 * an account belongs to based on its CAIP-25 identifier.
 *
 * @param state - The Redux root state
 * @returns A Map where keys are CAIP-25 account IDs and values are account group IDs
 */
export const getCaip25AccountIdToMultichainAccountGroupMap =
  createDeepEqualSelector(
    [selectAccountGroups, selectInternalAccounts],
    (
      accountGroups: readonly AccountGroupObject[],
      internalAccounts: InternalAccount[],
    ) => {
      const caip25AccountIdToMultichainAccountGroupMap: Map<
        CaipAccountId,
        AccountGroupId
      > = new Map();
      accountGroups.forEach((accountGroup) => {
        accountGroup.accounts.forEach((accountId) => {
          const internalAccount = internalAccounts.find(
            (account) => account.id === accountId,
          );
          if (!internalAccount) {
            return;
          }
          const [caip25Id] = internalAccount.scopes;
          if (caip25Id) {
            caip25AccountIdToMultichainAccountGroupMap.set(
              `${caip25Id}:${internalAccount.address}`,
              accountGroup.id,
            );
          }
        });
      });
      return caip25AccountIdToMultichainAccountGroupMap;
    },
  );

/**
 * Selector that transforms account groups by replacing account ID references
 * with actual internal account objects.
 *
 * Account groups normally contain arrays of account IDs. This selector resolves those
 * IDs to full account objects, making it easier to work with account data in components.
 * It also filters out any undefined accounts (in case an account ID doesn't match
 * any existing internal account).
 *
 * @param state - The Redux root state
 * @returns Array of account groups with resolved internal account objects instead of IDs
 */
export const getAccountGroupWithInternalAccounts = createDeepEqualSelector(
  [selectAccountGroups, selectInternalAccounts],
  (
    accountGroups: readonly AccountGroupObject[],
    internalAccounts: InternalAccount[],
  ): AccountGroupWithInternalAccounts[] =>
    accountGroups.map((accountGroup) => ({
      ...accountGroup,
      accounts: accountGroup.accounts
        .map((accountId: string) => {
          const internalAccount = internalAccounts.find(
            (account) => account.id === accountId,
          );
          return internalAccount;
        })
        .filter((account): account is InternalAccount => account !== undefined),
    })),
);

/**
 * Selector that creates a mapping from multichain account group IDs to their supported
 * blockchain scopes and corresponding CAIP account identifiers.
 *
 * This selector builds a nested map structure that associates each multichain account group
 * with the blockchain networks (scopes) it supports and the specific account identifiers
 * for each scope. It's particularly useful for permission management and determining
 * which accounts are available for specific blockchain interactions.
 *
 * @param state - The Redux root state
 * @returns A Map where:
 * - Keys are multichain account group IDs
 * - Values are Maps where:
 * - Keys are CAIP chain IDs (scopes)
 * - Values are full CAIP account IDs (`{chainId}:{address}`)
 */
export const getMultichainAccountsToScopesMap = createDeepEqualSelector(
  selectMultichainAccountGroups,
  selectInternalAccounts,
  (
    multichainAccounts: AccountGroupObject[],
    internalAccounts: InternalAccount[],
  ) => {
    const multichainAccountsToScopesMap: MultichainAccountGroupToScopesMap =
      new Map();

    multichainAccounts.forEach((multichainAccount) => {
      const multichainAccountIdToCaip25Ids: MultichainAccountGroupScopeToCaipAccountId =
        new Map();

      Object.values(multichainAccount.accounts).forEach((internalAccountId) => {
        const internalAccount = internalAccounts.find(
          (account) => account.id === internalAccountId,
        );

        if (!internalAccount) {
          return;
        }
        const [caip25Id] = internalAccount.scopes;
        if (caip25Id) {
          const [namespace, reference] = caip25Id.split(':');
          multichainAccountIdToCaip25Ids.set(
            caip25Id,
            `${namespace}:${reference}:${internalAccount.address}`,
          );
        }
      });

      multichainAccountsToScopesMap.set(
        multichainAccount.id,
        multichainAccountIdToCaip25Ids,
      );
    });

    return multichainAccountsToScopesMap;
  },
);

/**
 * Selector that filters account groups based on their supported blockchain scopes.
 *
 * This selector takes an array of requested scopes (CAIP chain IDs) and returns only the
 * account groups that contain accounts supporting those scopes. It includes special logic
 * for EVM scopes - if any EVM scope is requested, it returns all account groups since
 * most groups support EVM. For non-EVM scopes, it filters based on exact scope matches.
 *
 * @param state - The Redux root state
 * @param scopes - Array of CAIP chain IDs to filter by (e.g., ['eip155:1', 'solana:mainnet'])
 * @returns Array of account groups that support the requested scopes
 */
export const selectAccountGroupsByScopes = createDeepEqualSelector(
  getAccountGroupWithInternalAccounts,
  (_, scopes: string[]) => scopes,
  (
    accountGroupsWithInternalAccounts: AccountGroupWithInternalAccounts[],
    scopes: string[],
  ) => {
    const { cleanedScopes, hasEvmScope } = scopes.reduce(
      (acc, scope) => {
        const [namespace] = scope.split(':');
        if (namespace === KnownCaipNamespace.Eip155) {
          acc.hasEvmScope = true;
        } else {
          acc.cleanedScopes.push(scope as CaipChainId);
        }
        return acc;
      },
      { cleanedScopes: [] as CaipChainId[], hasEvmScope: false },
    );

    // Can early return with all multichain account groups because they all have EVM scopes
    if (hasEvmScope) {
      return accountGroupsWithInternalAccounts;
    }

    const scopesToAccountGroupsMap = new Map<
      CaipChainId,
      AccountGroupWithInternalAccounts[]
    >();

    cleanedScopes.forEach((scope) => {
      const accountGroupsWithScope = accountGroupsWithInternalAccounts.filter(
        (accountGroup) =>
          accountGroup.accounts.some((internalAccount: InternalAccount) =>
            internalAccount.scopes.includes(scope),
          ),
      );
      scopesToAccountGroupsMap.set(scope, accountGroupsWithScope);
    });

    return Array.from(scopesToAccountGroupsMap.values()).flat();
  },
);
