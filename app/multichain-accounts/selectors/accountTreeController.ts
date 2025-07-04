import { createDeepEqualSelector } from '../../selectors/util';
import { RootState } from '../../reducers';
import { selectMultichainAccountsState1Enabled } from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

/**
 * Get the AccountTreeController state
 * @param state - Root redux state
 * @returns AccountTreeController state
 */
const selectAccountTreeControllerState = (state: RootState) => state.engine.backgroundState.AccountTreeController;

/**
 * Get account sections from AccountTreeController
 * For now, this returns a simple structure until the controller is fully integrated
 */
export const selectAccountSections = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) => {
    if (!multichainAccountsState1Enabled || !accountTreeState?.accountTree?.wallets) {
      return null;
    }

    return Object.values(accountTreeState.accountTree.wallets).map((wallet) => ({
      title: wallet.metadata.name,
      data: Object.values(wallet.groups).flatMap((group) => group.accounts),
    }));
  }
);
