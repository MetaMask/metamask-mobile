import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  selectInternalAccounts,
  selectSelectedInternalAccountId,
} from '../../selectors/accountsController';
import {
  AccountGroupId,
  AccountWalletId,
  AccountWalletType,
} from '@metamask/account-api';
import { AccountId } from '@metamask/accounts-controller';
import {
  AccountWalletObject,
  AccountGroupObject,
  AccountTreeControllerState,
} from '@metamask/account-tree-controller';
import { CaipChainId } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountGroupWithInternalAccounts } from './accounts.type';

// Stable empty references to prevent unnecessary re-renders
const EMPTY_ARR: readonly never[] = Object.freeze([]);
const EMPTY_OBJ: Readonly<Record<string, never>> = Object.freeze({});

// Type definitions for reverse mappings
type AccountToWalletMap = Readonly<Record<AccountId, AccountWalletId>>;
type AccountToGroupMap = Readonly<Record<AccountId, AccountGroupObject>>;

/**
 * Get the AccountTreeController state
 * @param state - Root redux state
 * @returns AccountTreeController state
 */
export const selectAccountTreeControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTreeController;

/**
 * Get account sections from AccountTreeController
 * For now, this returns a simple structure until the controller is fully integrated
 */
export const selectAccountSections = createSelector(
  [selectAccountTreeControllerState, selectInternalAccounts],
  (accountTreeState, internalAccounts) => {
    if (!accountTreeState?.accountTree?.wallets) {
      return EMPTY_ARR;
    }

    return Object.values(accountTreeState.accountTree.wallets).map(
      (wallet: AccountWalletObject) => {
        const allAccountsIdInWallet = Object.values(wallet.groups).flatMap(
          (group) => group.accounts,
        );
        // To preserve the order of the accounts in the accounts controller
        const accountIds = internalAccounts
          .filter((account) => allAccountsIdInWallet.includes(account.id))
          .map((account) => account.id);

        return {
          title: wallet.metadata.name,
          wallet,
          data: accountIds,
        };
      },
    );
  },
);

/**
 * Get a wallet by its ID from AccountTreeController
 * @param state - Root redux state
 * @param walletId - The ID of the wallet to find
 * @returns The wallet if found, null otherwise
 */
export const selectWalletById = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState) =>
    (walletId: AccountWalletId): AccountWalletObject | null => {
      if (!accountTreeState?.accountTree?.wallets) {
        return null;
      }

      return (
        accountTreeState.accountTree.wallets[
          walletId as keyof typeof accountTreeState.accountTree.wallets
        ] || null
      );
    },
);

/**
 * Get wallets map from AccountTreeController state
 * @param state - Root redux state
 * @returns Wallets map or null
 */
export const selectWalletsMap = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState) => accountTreeState?.accountTree?.wallets ?? null,
);

/**
 * Create reverse mapping from account ID to wallet ID for fast lookups
 * @param state - Root redux state
 * @returns Map of account ID to wallet ID
 */
export const selectAccountToWalletMap = createSelector(
  [selectWalletsMap],
  (wallets): AccountToWalletMap => {
    if (!wallets) return EMPTY_OBJ as AccountToWalletMap;

    const map: Record<AccountId, AccountWalletId> = Object.create(null);
    for (const wallet of Object.values(wallets)) {
      for (const group of Object.values(wallet.groups)) {
        for (const accountId of group.accounts) {
          map[accountId] = wallet.id;
        }
      }
    }
    return map;
  },
);

/**
 * Create reverse mapping from account ID to group for fast lookups
 * @param state - Root redux state
 * @returns Map of account ID to group object
 */
export const selectAccountToGroupMap = createSelector(
  [selectWalletsMap],
  (wallets): AccountToGroupMap => {
    if (!wallets) return EMPTY_OBJ as AccountToGroupMap;

    const map: Record<string, AccountGroupObject> = Object.create(null);
    for (const wallet of Object.values(wallets)) {
      for (const group of Object.values(wallet.groups)) {
        for (const accountId of group.accounts) {
          map[accountId] = group as AccountGroupObject;
        }
      }
    }
    return map;
  },
);

/**
 * Get all account groups from all wallets in the AccountTreeController
 * Returns a flat array of all account groups across all wallets
 */
export const selectAccountGroups = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState): readonly AccountGroupObject[] => {
    if (!accountTreeState?.accountTree?.wallets) {
      return EMPTY_ARR;
    }

    return Object.values(accountTreeState.accountTree.wallets).flatMap(
      (wallet: AccountWalletObject) =>
        Object.values(wallet.groups) as AccountGroupObject[],
    );
  },
);

/**
 * Get account groups filtered to only multichain accounts
 * Multichain accounts have IDs that start with AccountWalletType.Entropy
 */
export const selectMultichainAccountGroups = createSelector(
  [selectAccountGroups],
  (accountGroups: readonly AccountGroupObject[]) =>
    accountGroups.filter((group) =>
      group.id.startsWith(AccountWalletType.Entropy),
    ),
);

/**
 * Get account groups filtered to only non-multichain accounts
 * Non-multichain accounts have IDs that do not start with AccountWalletType.Entropy
 */
export const selectSingleAccountGroups = createSelector(
  [selectAccountGroups],
  (accountGroups: readonly AccountGroupObject[]) =>
    accountGroups.filter(
      (group) => !group.id.startsWith(AccountWalletType.Entropy),
    ),
);

/**
 * Get account groups organized by wallet sections
 * Returns wallet sections containing account groups instead of account IDs
 */
export const selectAccountGroupsByWallet = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState) => {
    if (!accountTreeState?.accountTree?.wallets) {
      return EMPTY_ARR;
    }

    return Object.values(accountTreeState.accountTree.wallets).map(
      (wallet: AccountWalletObject) => ({
        title: wallet.metadata.name,
        wallet,
        // Return account groups instead of flattened accounts
        data: Object.values(wallet.groups) as AccountGroupObject[],
      }),
    );
  },
);

/**
 * Get a wallet by account ID from AccountTreeController using optimized reverse mapping
 * @param state - Root redux state
 * @param accountId - The ID of the account to find the wallet for
 * @returns The wallet if found, null otherwise
 */
export const selectWalletByAccount = createSelector(
  [selectWalletsMap, selectAccountToWalletMap],
  (wallets, accountToWalletMap) =>
    (accountId: AccountId): AccountWalletObject | null => {
      if (!wallets) return null;

      const walletId = accountToWalletMap[accountId];
      return walletId ? wallets[walletId] ?? null : null;
    },
);

/**
 * Get the selected account group from the AccountTreeController using optimized reverse mapping
 * @param state - Root redux state
 * @param selectedAccountId - The ID of the selected account
 * @returns The selected account group or null if not found
 */
export const selectSelectedAccountGroup = createSelector(
  [selectAccountToGroupMap, selectSelectedInternalAccountId],
  (accountToGroupMap, selectedAccountId): AccountGroupObject | null => {
    if (!selectedAccountId) return null;

    return accountToGroupMap[selectedAccountId] ?? null;
  },
);

/**
 * Resolves the selected account group preferring the controller's explicit selection,
 * and falling back to deriving from the selected internal account.
 */
export const selectResolvedSelectedAccountGroup = createSelector(
  [
    selectAccountTreeControllerState,
    selectAccountToGroupMap,
    selectSelectedInternalAccountId,
  ],
  (
    accountTreeState,
    accountToGroupMap,
    selectedAccountId,
  ): AccountGroupObject | null => {
    const selectedAccountGroupId =
      accountTreeState?.accountTree?.selectedAccountGroup;
    if (selectedAccountGroupId) {
      const [walletId] = selectedAccountGroupId.split('/') as [AccountWalletId];
      const wallet = accountTreeState?.accountTree?.wallets?.[walletId];
      const group = wallet?.groups?.[
        selectedAccountGroupId as keyof typeof wallet.groups
      ] as AccountGroupObject | undefined;
      return group ?? null;
    }

    if (!selectedAccountId) return null;
    return accountToGroupMap[selectedAccountId] ?? null;
  },
);

/**
 * Selector to get an account group by its ID from the account tree controller state.
 *
 * @param state - The Redux state
 * @param accountId - The account group ID to look up
 * @returns The account group object if found, undefined otherwise
 */
export const selectAccountGroupById = createSelector(
  selectAccountTreeControllerState,
  (_, accountId: AccountGroupId) => accountId,
  (
    accountTree: AccountTreeControllerState | undefined,
    accountId: AccountGroupId,
  ) => {
    if (!accountTree?.accountTree?.wallets) {
      return undefined;
    }

    const { wallets } = accountTree.accountTree;
    const [walletId] = accountId.split('/');
    const wallet = wallets[walletId as AccountWalletId];

    return wallet?.groups[accountId as AccountGroupId];
  },
);

/**
 * Get an internal account from a group by its CAIP chain ID.
 *
 * @param group - The group object to search in.
 * @param caipChainId - The CAIP chain ID to search for.
 * @param internalAccounts - The internal accounts object.
 * @returns The internal account object, or null if not found.
 */
export const selectInternalAccountFromAccountGroup = (
  group: AccountGroupObject | null,
  caipChainId: CaipChainId,
  internalAccounts: Record<AccountId, InternalAccount>,
) => {
  if (!group) {
    return null;
  }

  for (const account of group.accounts) {
    const internalAccount = internalAccounts[account];
    if (internalAccount?.scopes.includes(caipChainId)) {
      return internalAccount;
    }
  }

  return null;
};

/**
 * Selector to get the currently selected account group from the AccountTreeController state.
 * This selector retrieves the selected account group ID from the account tree state.
 *
 * @param state - The Redux root state
 * @returns The currently selected account group ID or null if none is found
 */
export const selectSelectedAccountGroupId = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeState: AccountTreeControllerState) =>
    accountTreeState?.accountTree?.selectedAccountGroup || null,
);

/**
 * Selects account groups with their internal accounts fully populated.
 * This selector transforms `accountGroup.accounts` by replacing account IDs
 * with the corresponding internal account objects from the `internalAccounts` array.
 *
 * @param accountGroups - An array of all account group objects.
 * @param internalAccounts - An array containing internal accounts to match against account IDs.
 * @returns An array of account group objects, where account IDs in the `accounts` field
 * are replaced with their corresponding internal account objects.
 */
export const selectAccountGroupWithInternalAccounts = createSelector(
  [selectAccountGroups, selectInternalAccounts],
  (
    accountGroups: readonly AccountGroupObject[],
    internalAccounts: readonly InternalAccount[],
  ): readonly AccountGroupWithInternalAccounts[] =>
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
 * Selector to get internal accounts associated with the currently selected account group.
 *
 * This composes `selectAccountGroupWithInternalAccounts` and `selectSelectedAccountGroup`
 * to return the list of internal accounts belonging to the selected group.
 *
 * @param state - The Redux root state
 * @returns A readonly array of internal accounts for the selected account group
 */
export const selectSelectedAccountGroupInternalAccounts = createSelector(
  [selectAccountGroupWithInternalAccounts, selectResolvedSelectedAccountGroup],
  (
    accountGroupsWithAccounts: readonly AccountGroupWithInternalAccounts[],
    selectedGroup: AccountGroupObject | null,
  ): readonly InternalAccount[] => {
    if (!selectedGroup) {
      return EMPTY_ARR as readonly InternalAccount[];
    }

    const group = accountGroupsWithAccounts.find(
      (groupItem) => groupItem.id === selectedGroup.id,
    );

    return (group?.accounts ?? EMPTY_ARR) as readonly InternalAccount[];
  },
);
