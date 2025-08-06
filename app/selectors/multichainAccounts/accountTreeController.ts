import { createDeepEqualSelector } from '../../selectors/util';
import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { selectMultichainAccountsState1Enabled } from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { selectSelectedInternalAccountId } from '../../selectors/accountsController';
import { AccountWalletId } from '@metamask/account-api';
import { AccountId } from '@metamask/accounts-controller';
import {
  AccountWalletObject,
  AccountGroupObject,
} from '@metamask/account-tree-controller';

/**
 * Get the AccountTreeController state
 * @param state - Root redux state
 * @returns AccountTreeController state
 */
export const selectAccountTreeControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTreeController;

/**
 * Get validated AccountTreeController state with feature flag and wallets checks
 * @param state - Root redux state
 * @returns Object with validation status and account tree state
 */
export const selectValidatedAccountTreeState = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) => ({
    isValid: multichainAccountsState1Enabled,
    accountTreeState,
  }),
);

/**
 * Get account sections from AccountTreeController
 * For now, this returns a simple structure until the controller is fully integrated
 */
export const selectAccountSections = createDeepEqualSelector(
  [selectValidatedAccountTreeState],
  ({ isValid, accountTreeState }) => {
    if (!isValid) {
      return null;
    }

    return Object.values(accountTreeState.accountTree.wallets).map(
      (wallet: AccountWalletObject) => {
        const allAccountsIdInWallet = Object.values(wallet.groups).flatMap(
          (group) => group.accounts,
        );
        // To presevere the order of the accounts in the accounts controller
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
  [selectValidatedAccountTreeState],
  ({ isValid, accountTreeState }) =>
    (walletId: AccountWalletId): AccountWalletObject | null => {
      if (!isValid) {
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
 * Get a wallet by account ID from AccountTreeController
 * Returns a selector function that can be called with an account ID to find the wallet containing that account
 * @param state - Root redux state
 * @returns Selector function that takes an account ID and returns the containing wallet or null
 **/
// TODO: Use reverse mapping once available, for fast indexing.
export const selectWalletByAccount = createSelector(
  [selectValidatedAccountTreeState],
  ({ isValid, accountTreeState }) =>
    (accountId: AccountId): AccountWalletObject | null => {
      if (!isValid) {
        return null;
      }

      const accountWallets = Object.values(
        accountTreeState.accountTree.wallets,
      ).map((wallet) => ({
        walletId: wallet.id,
        accounts: Object.values(wallet.groups).flatMap(
          (group) => group.accounts,
        ),
      }));

      const accountWallet = accountWallets.find((wallet) =>
        wallet.accounts.some((account) => account === accountId),
      );

      return accountWallet
        ? accountTreeState.accountTree.wallets[accountWallet.walletId]
        : null;
    },
);
/**
 * Get all account groups from all wallets in the AccountTreeController
 * Returns a flat array of all account groups across all wallets
 */
export const selectAccountGroups = createDeepEqualSelector(
  [selectValidatedAccountTreeState],
  ({ isValid, accountTreeState }): AccountGroupObject[] => {
    if (!isValid) {
      return [];
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
export const selectAccountGroupsByWallet = createDeepEqualSelector(
  [selectValidatedAccountTreeState],
  ({ isValid, accountTreeState }) => {
    if (!isValid) {
      return null;
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
 * Get the selected account group from the AccountTreeController
 * @param state - Root redux state
 * @param selectedAccountId - The ID of the selected account
 * @returns The selected account group or null if not found
 */
export const selectSelectedAccountGroup = createDeepEqualSelector(
  [selectValidatedAccountTreeState, selectSelectedInternalAccountId],
  (
    { isValid, accountTreeState },
    selectedAccountId,
  ): AccountGroupObject | null => {
    if (!isValid || !selectedAccountId) {
      return null;
    }

    // Search through all wallets and groups to find the one containing the selected account
    for (const wallet of Object.values(accountTreeState.accountTree.wallets)) {
      for (const group of Object.values(wallet.groups)) {
        if (group.accounts.includes(selectedAccountId)) {
          return group as AccountGroupObject;
        }
      }
    }

    return null;
  },
);
