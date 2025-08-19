import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  selectInternalAccounts,
  selectSelectedInternalAccountId,
} from '../../selectors/accountsController';
import { AccountWalletId } from '@metamask/account-api';
import { AccountId } from '@metamask/accounts-controller';
import {
  AccountWalletObject,
  AccountGroupObject,
  AccountTreeControllerState,
} from '@metamask/account-tree-controller';

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
