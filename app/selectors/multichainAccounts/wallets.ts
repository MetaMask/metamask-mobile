import { selectAccountTreeControllerState } from './accountTreeController';
import { createDeepEqualSelector } from '../util';
import { AccountWalletCategory } from '@metamask/account-api';

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
    wallets.filter((wallet) =>
      wallet.id.startsWith(AccountWalletCategory.Entropy),
    ),
);
