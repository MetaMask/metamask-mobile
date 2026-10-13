import {
  areAddressesEqual,
  renderShortAddress,
} from '../../../../util/address';

export interface SocialPostComposerWalletAccount {
  id: string;
  address: string;
  name?: string;
}

export interface ResolveSocialPostComposerWalletInput {
  linkedAccountId?: string | null;
  linkedAccountAddress?: string | null;
  internalAccounts: readonly SocialPostComposerWalletAccount[];
  selectedGroupAccountIds: readonly string[];
  selectedGroupAddresses: readonly string[];
}

export type ResolveSocialPostComposerWalletResult =
  | { action: 'onboarding' }
  | { action: 'blocked'; reason: 'linked_wallet_missing' }
  | {
      action: 'compose';
      address: string;
      accountLabel: string;
      showLinkedAccountToast: boolean;
    };

const accountLabel = (account: SocialPostComposerWalletAccount): string => {
  const name = account.name?.trim();
  return name || renderShortAddress(account.address);
};

const isLinkedAccountInSelectedGroup = (
  account: SocialPostComposerWalletAccount,
  selectedGroupAccountIds: readonly string[],
  selectedGroupAddresses: readonly string[],
): boolean => {
  if (selectedGroupAccountIds.includes(account.id)) {
    return true;
  }

  return selectedGroupAddresses.some((address) =>
    areAddressesEqual(address, account.address),
  );
};

/**
 * Decides whether tapping Post opens the composer, sends the user to Social
 * profile onboarding, or blocks because the linked wallet is gone.
 *
 * Positions are scoped to the onboarding-linked address. The globally selected
 * account is not changed; `showLinkedAccountToast` is true when that linked
 * account is not in the currently selected account group.
 */
export const resolveSocialPostComposerWallet = (
  input: ResolveSocialPostComposerWalletInput,
): ResolveSocialPostComposerWalletResult => {
  const linkedAddress = input.linkedAccountAddress?.trim();
  if (!linkedAddress) {
    return { action: 'onboarding' };
  }

  const linkedAccount = input.internalAccounts.find(
    (account) =>
      (input.linkedAccountId != null && input.linkedAccountId === account.id) ||
      areAddressesEqual(account.address, linkedAddress),
  );

  if (!linkedAccount) {
    return { action: 'blocked', reason: 'linked_wallet_missing' };
  }

  return {
    action: 'compose',
    address: linkedAccount.address,
    accountLabel: accountLabel(linkedAccount),
    showLinkedAccountToast: !isLinkedAccountInSelectedGroup(
      linkedAccount,
      input.selectedGroupAccountIds,
      input.selectedGroupAddresses,
    ),
  };
};
