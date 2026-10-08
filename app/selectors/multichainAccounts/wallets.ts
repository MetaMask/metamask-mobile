import { selectAccountTreeControllerState } from './accountTreeController';
import { createDeepEqualSelector } from '../util';
import {
  AccountWalletType,
  toMultichainAccountWalletId,
} from '@metamask/account-api';
import { selectProfileEntropySourceIds } from '../identity';

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

/**
 * Visible account groups of the SRPs that belong to the wallet's profile (the
 * primary SRP and those paired to it), in tree order. Hidden groups are
 * excluded.
 *
 * This selector is exclusively used for the social profile feature
 */
export const selectProfileAccountGroups = createDeepEqualSelector(
  [selectMultichainWallets, selectProfileEntropySourceIds],
  (wallets, profileEntropySourceIds) => {
    const profileWalletIds = new Set<string>(
      profileEntropySourceIds.map(toMultichainAccountWalletId),
    );

    return wallets
      .filter((wallet) => profileWalletIds.has(wallet.id))
      .flatMap((wallet) => Object.values(wallet.groups))
      .filter((group) => !group.metadata.hidden);
  },
);
