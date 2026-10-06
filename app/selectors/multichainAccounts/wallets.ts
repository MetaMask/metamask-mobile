import { selectAccountTreeControllerState } from './accountTreeController';
import { createDeepEqualSelector } from '../util';
import { AccountWalletType } from '@metamask/account-api';

export const selectWallets = createDeepEqualSelector(
  [selectAccountTreeControllerState],
  (accountTreeState) => {
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

/** Account groups of the first entropy wallet, in tree order. Empty when none exists. */
export const selectFirstEntropyWalletAccountGroups = createDeepEqualSelector(
  [selectMultichainWallets],
  (wallets) => Object.values(wallets[0]?.groups ?? {}),
);
