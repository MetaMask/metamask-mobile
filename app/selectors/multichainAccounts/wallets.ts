import type { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AccountWalletType,
  toMultichainAccountWalletId,
} from '@metamask/account-api';

import { selectAccountTreeControllerState } from './accountTreeController';
import { createDeepEqualSelector } from '../util';
import { selectProfileEntropySourceIds } from '../identity';

/** Visible account groups of one profile SRP, shown as a category. */
export interface ProfileWalletSection {
  id: string;
  name: string;
  groups: AccountGroupObject[];
}

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
 * Profile SRPs (the primary SRP and those paired to it), each with its visible
 * account groups. Hidden groups are dropped, and a wallet with none left is
 * omitted. Tree order is preserved.
 *
 * Exclusively used by the social profile feature.
 */
export const selectProfileWalletSections = createDeepEqualSelector(
  [selectMultichainWallets, selectProfileEntropySourceIds],
  (wallets, profileEntropySourceIds): ProfileWalletSection[] => {
    const profileWalletIds = new Set<string>(
      profileEntropySourceIds.map(toMultichainAccountWalletId),
    );

    return wallets
      .filter((wallet) => profileWalletIds.has(wallet.id))
      .map((wallet) => ({
        id: wallet.id,
        name: wallet.metadata.name,
        groups: Object.values(wallet.groups).filter(
          (group) => !group.metadata.hidden,
        ),
      }))
      .filter((section) => section.groups.length > 0);
  },
);

/**
 * Visible account groups of the profile SRPs, in tree order.
 *
 * Exclusively used by the social profile feature.
 */
export const selectProfileAccountGroups = createDeepEqualSelector(
  [selectProfileWalletSections],
  (sections) => sections.flatMap((section) => section.groups),
);
