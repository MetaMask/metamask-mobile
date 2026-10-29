import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectIsProfileTradingActivityPrivate,
  selectProfileControllerLinkedEvmAddress,
} from '../../../../selectors/profileController';
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
 * Returns a callback that picks the post-trade prompt at submit time. Profile
 * and account state come from Redux and the counts from storage, so the call
 * never fetches.
 */
export const usePostTradePromptResolver = (): ((
  product: PostTradePromptProduct,
) => PostTradePrompt) => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  const linkedEvmAddress = useSelector(selectProfileControllerLinkedEvmAddress);
  const isProfileTradingActivityPrivate = useSelector(
    selectIsProfileTradingActivityPrivate,
  );
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );

  return useCallback(
    (product: PostTradePromptProduct) => {
      const linkedAccount = linkedEvmAddress
        ? internalAccounts.find((account) =>
            areAddressesEqual(account.address, linkedEvmAddress),
          )
        : undefined;
      const isLinkedInSelectedGroup = linkedAccount
        ? isLinkedAccountInSelectedGroup(
            linkedAccount,
            selectedGroupAccounts.map((account) => account.id),
            selectedGroupAccounts.map((account) => account.address),
          )
        : false;

      return resolvePostTradePrompt({
        product,
        isSocialV1Enabled,
        linkedEvmAddress,
        isProfileTradingActivityPrivate,
        isLinkedAccountInSelectedGroup: isLinkedInSelectedGroup,
        shareSheetCount: linkedEvmAddress
          ? getShareSheetCount(linkedEvmAddress, product)
          : 0,
        hasSeenClaimSheet: hasSeenClaimSheet(product),
      });
    },
    [
      internalAccounts,
      isSocialV1Enabled,
      isProfileTradingActivityPrivate,
      linkedEvmAddress,
      selectedGroupAccounts,
    ],
  );
};
