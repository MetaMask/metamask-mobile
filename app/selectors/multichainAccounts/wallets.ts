import { selectAccountTreeControllerState } from './accountTreeController';
import { selectMultichainAccountsState1Enabled } from '../featureFlagController/multichainAccounts';
import { createDeepEqualSelector } from '../util';
import { AccountWalletType } from '@metamask/account-api';

export const selectWallets = createDeepEqualSelector(
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

export const selectMultichainWallets = createDeepEqualSelector(
  [selectWallets],
  (wallets) =>
    wallets.filter((wallet) => wallet.type === AccountWalletType.Entropy),
);
