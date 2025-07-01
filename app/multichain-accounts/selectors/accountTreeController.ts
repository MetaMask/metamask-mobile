import { createDeepEqualSelector } from '../../selectors/util';
import { RootState } from '../../reducers';
import { selectMultichainAccountsState1Enabled } from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  AccountWallet,
  AccountWalletId,
} from '@metamask/account-tree-controller';

/**
 * Get the AccountTreeController state
 * @param state - Root redux state
 * @returns AccountTreeController state
 */
const selectAccountTreeControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTreeController;

/**
 * Get account sections from AccountTreeController
 * For now, this returns a simple structure until the controller is fully integrated
 */
export const selectAccountSections = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) => {
    if (
      !multichainAccountsState1Enabled ||
      !accountTreeState?.accountTree?.wallets
    ) {
      return null;
    }

    return Object.values(accountTreeState.accountTree.wallets).map(
      (wallet: AccountWallet) => ({
        title: wallet.metadata.name,
        wallet,
        data: Object.values(wallet.groups).flatMap((group) => group.accounts),
      }),
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
    (walletId: AccountWalletId): AccountWallet | null => {
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
