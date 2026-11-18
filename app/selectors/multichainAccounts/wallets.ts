import type { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AccountWalletType,
  toMultichainAccountWalletId,
} from '@metamask/account-api';

import { selectAccountTreeControllerState } from './accountTreeController';
import { selectVisibleAccountGroupsByWallet } from './manageAccounts';
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
 * Visible account groups for entropy wallets, in tree order.
 *
 * Hidden groups are already removed. Keyring, hardware, and snap wallets are
 * left out, and an entropy wallet with no visible groups is omitted.
 *
 * Shared source for the social onboarding and profile-edit account lists.
 */
export const selectVisibleEntropyAccountGroupsByWallet =
  createDeepEqualSelector([selectVisibleAccountGroupsByWallet], (sections) =>
    sections.filter(
      (section) =>
        section.wallet.type === AccountWalletType.Entropy &&
        section.data.length > 0,
    ),
  );

/**
 * Profile SRPs (the primary SRP and those paired to it), each with its visible
 * account groups. Hidden groups are dropped, and a wallet with none left is
 * omitted. Tree order is preserved.
 *
 * Exclusively used by the social profile feature.
 */
export const selectProfileWalletSections = createDeepEqualSelector(
  [selectVisibleEntropyAccountGroupsByWallet, selectProfileEntropySourceIds],
  (sections, profileEntropySourceIds): ProfileWalletSection[] => {
    const profileWalletIds = new Set<string>(
      profileEntropySourceIds.map(toMultichainAccountWalletId),
    );

    return sections
      .filter((section) => profileWalletIds.has(section.wallet.id))
      .map((section) => ({
        id: section.wallet.id,
        name: section.title,
        groups: section.data,
      }));
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
