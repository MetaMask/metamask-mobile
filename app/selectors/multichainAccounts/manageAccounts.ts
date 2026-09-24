import { createSelector } from 'reselect';
import type { AccountGroupId } from '@metamask/account-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type { RootState } from '../../reducers';
import {
  selectAccountGroupsByWallet,
  selectAccountGroupById,
  selectAccountGroups,
  selectWalletsMap,
} from './accountTreeController';
import type { AccountSection } from '../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/MultichainAccountSelectorList.types';

/**
 * Selector that returns account groups organized by wallet sections,
 * excluding groups marked as hidden (`metadata.hidden === true`).
 */
export const selectVisibleAccountGroupsByWallet = createSelector(
  [selectAccountGroupsByWallet],
  (accountSections): AccountSection[] =>
    accountSections.map((section) => ({
      ...section,
      data: section.data.filter(
        (group: AccountGroupObject) => !group.metadata?.hidden,
      ),
    })),
);

/**
 * Selector factory that returns whether a given account group is hidden.
 *
 * @param groupId - The ID of the account group to inspect
 * @returns A selector that returns true if the group is hidden, false otherwise
 */
export const selectAccountGroupHidden = (groupId: AccountGroupId) =>
  createSelector(
    (state: RootState) => selectAccountGroupById(state, groupId),
    (group: AccountGroupObject | undefined): boolean =>
      Boolean(group?.metadata?.hidden),
  );

/**
 * Get the IDs of all hidden account groups across all wallets.
 *
 * @param state - Root redux state
 * @returns An array of hidden account group IDs in tree order
 */
export const selectHiddenAccountGroupIds = createSelector(
  [selectAccountGroups],
  (accountGroups): AccountGroupId[] =>
    accountGroups
      .filter((group: AccountGroupObject) => Boolean(group.metadata?.hidden))
      .map((group: AccountGroupObject) => group.id),
);

/**
 * Counts describing the account tree as a whole, used by the Manage Accounts
 * analytics.
 */
export interface AccountListStats {
  /**
   * Account groups across every wallet, hidden ones included. A group is one
   * row in the account list whatever wallet backs it, so this counts rows
   * rather than the addresses underneath them.
   */
  totalAccounts: number;
  /** Wallets in the tree: SRPs, hardware devices, imported keys and snaps. */
  totalWallets: number;
  /** Account groups marked `metadata.hidden`. */
  hiddenCount: number;
}

/**
 * Get account list statistics (total accounts, total wallets, hidden count).
 *
 * Counts come from the whole account tree, including hidden groups, so they
 * stay correct in views that render a searched or otherwise filtered subset.
 *
 * @param state - Root redux state
 * @returns The account, wallet and hidden-account totals.
 */
export const selectAccountListStats = createSelector(
  [selectWalletsMap],
  (wallets): AccountListStats => {
    let totalAccounts = 0;
    let totalWallets = 0;
    let hiddenCount = 0;

    for (const wallet of Object.values(wallets ?? {})) {
      totalWallets += 1;

      for (const group of Object.values(wallet.groups ?? {})) {
        totalAccounts += 1;
        if (group.metadata?.hidden) {
          hiddenCount += 1;
        }
      }
    }

    return { totalAccounts, totalWallets, hiddenCount };
  },
);
