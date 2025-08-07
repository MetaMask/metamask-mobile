import { createDeepEqualSelector } from '../util';
import { RootState } from '../../reducers';
import { selectMultichainAccountsState1Enabled } from '../featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { AccountWalletId } from '@metamask/account-api';
import { AccountId } from '@metamask/accounts-controller';
import { AccountWalletObject } from '@metamask/account-tree-controller';
import { selectInternalAccounts } from '../accountsController';

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
export const selectAccountSections = createDeepEqualSelector(
  [
    selectAccountTreeControllerState,
    selectInternalAccounts,
    selectMultichainAccountsState1Enabled,
  ],
  (accountTreeState, internalAccounts, multichainAccountsState1Enabled) => {
    if (
      !multichainAccountsState1Enabled ||
      !accountTreeState?.accountTree?.wallets ||
      Object.keys(accountTreeState.accountTree.wallets).length === 0
    ) {
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
export const selectWalletById = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) =>
    (walletId: AccountWalletId): AccountWalletObject | null => {
      if (
        !multichainAccountsState1Enabled ||
        !accountTreeState?.accountTree?.wallets
      ) {
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
 * @param multichainAccountsState1Enabled - Whether multichain accounts feature is enabled
 * @returns Selector function that takes an account ID and returns the containing wallet or null
 **/
// TODO: Use reverse mapping once available, for fast indexing.
export const selectWalletByAccount = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) =>
    (accountId: AccountId): AccountWalletObject | null => {
      if (
        !multichainAccountsState1Enabled ||
        !accountTreeState?.accountTree?.wallets
      ) {
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
