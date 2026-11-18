import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { areAddressesEqual } from '../../../../util/address';
import {
  getShareSheetCount,
  hasSeenClaimSheet,
  type PostTradePromptProduct,
} from '../../../../util/social/postTradePromptStorage';
import { isLinkedAccountInSelectedGroup } from '../navigation/resolveSocialPostComposerWallet';
import {
  resolvePostTradePrompt,
  type PostTradePrompt,
} from './resolvePostTradePrompt';

/**
 * Returns a callback telling whether the account linked to the social profile
 * is in the selected account group, which is the only account that can post.
 */
const useIsLinkedAccountSelected = (
  linkedEvmAddress: string | null | undefined,
): (() => boolean) => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  return useCallback(() => {
    const linkedAccount = linkedEvmAddress
      ? internalAccounts.find((account) =>
          areAddressesEqual(account.address, linkedEvmAddress),
        )
      : undefined;
    return linkedAccount
      ? isLinkedAccountInSelectedGroup(
          linkedAccount,
          selectedGroupAccounts.map((account) => account.id),
          selectedGroupAccounts.map((account) => account.address),
        )
      : false;
  }, [internalAccounts, linkedEvmAddress, selectedGroupAccounts]);
};

/**
 * Returns a callback that picks the post-trade prompt at submit time. Profile
 * and account state come from Redux and the counts from storage, so the call
 * never fetches.
 */
export const usePostTradePromptResolver = (): ((
  product: PostTradePromptProduct,
) => PostTradePrompt) => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const linkedEvmAddress = useSelector(selectProfileControllerLinkedEvmAddress);
  const isLinkedAccountSelected = useIsLinkedAccountSelected(linkedEvmAddress);

  return useCallback(
    (product: PostTradePromptProduct) =>
      resolvePostTradePrompt({
        product,
        isSocialV1Enabled,
        linkedEvmAddress,
        isLinkedAccountInSelectedGroup: isLinkedAccountSelected(),
        shareSheetCount: linkedEvmAddress
          ? getShareSheetCount(linkedEvmAddress, product)
          : 0,
        hasSeenClaimSheet: hasSeenClaimSheet(product),
      }),
    [isLinkedAccountSelected, isSocialV1Enabled, linkedEvmAddress],
  );
};

/**
 * Returns a callback telling whether a Social V1 copy-trade may open the share
 * sheet. Copy-trades skip the share-sheet limit, but the post can only land
 * when the account linked to the social profile is the one trading.
 */
export const useCanShareCopyTrade = (): (() => boolean) => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const linkedEvmAddress = useSelector(selectProfileControllerLinkedEvmAddress);
  const isLinkedAccountSelected = useIsLinkedAccountSelected(linkedEvmAddress);

  return useCallback(
    () =>
      isSocialV1Enabled &&
      Boolean(linkedEvmAddress?.trim()) &&
      isLinkedAccountSelected(),
    [isLinkedAccountSelected, isSocialV1Enabled, linkedEvmAddress],
  );
};
