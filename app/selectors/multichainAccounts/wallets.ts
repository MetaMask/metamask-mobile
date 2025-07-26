import { selectAccountTreeControllerState } from '../../multichain-accounts/selectors/accountTreeController';
import { selectMultichainAccountsState1Enabled } from '../featureFlagController/multichainAccounts';
import { createDeepEqualSelector } from '../util';

export const selectMultichainWallets = createDeepEqualSelector(
  [selectAccountTreeControllerState, selectMultichainAccountsState1Enabled],
  (accountTreeState, multichainAccountsState1Enabled) => {
    if (!multichainAccountsState1Enabled) {
      return [];
    }

    if (!accountTreeState?.accountTree?.wallets) {
      return [];
    }

    return Object.values(accountTreeState.accountTree.wallets);
  },
);
