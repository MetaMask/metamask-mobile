import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import { useQuoteTokensQuery } from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/useQuoteTokensQuery';
import { isUnsupportedPostTradeAsset } from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/quoteTokens';
import {
  FEED_CAIP2_CHAINS,
  HYPERLIQUID_CAIP2_CHAIN_ID,
} from '../../SocialFeed/data/feed-constants';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectMemecoinTdpV1TabConfigOrder } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { getTopTenWalletHolders } from '../utils/securityFacts';
import Logger from '../../../../util/Logger';

export const useTokenDetailsSocialTabs = ({
  caip19AssetId,
  orderAssetChainId,
  topHolders,
}: {
  caip19AssetId: CaipAssetType | null;
  orderAssetChainId: CaipChainId | undefined;
  topHolders: Parameters<typeof getTopTenWalletHolders>[0];
}): {
  tabConfigOrder: ReturnType<typeof selectMemecoinTdpV1TabConfigOrder>;
  showFeedTab: boolean;
  showHoldersTab: boolean;
} => {
  const tabConfigOrder = useSelector(selectMemecoinTdpV1TabConfigOrder);
  const socialEnabled = useSelector(selectIsSocialV1Enabled);
  const feedEnabled = useSelector(selectSocialLeaderboardEnabled);
  const canCheckFeedEligibility =
    socialEnabled &&
    feedEnabled &&
    tabConfigOrder.includes('feed') &&
    caip19AssetId !== null &&
    orderAssetChainId !== undefined &&
    FEED_CAIP2_CHAINS.includes(orderAssetChainId) &&
    orderAssetChainId !== HYPERLIQUID_CAIP2_CHAIN_ID;
  const quoteTokens = useQuoteTokensQuery(canCheckFeedEligibility);
  const quoteTokensError = quoteTokens.error;
  useEffect(() => {
    if (canCheckFeedEligibility && quoteTokensError) {
      Logger.error(quoteTokensError, 'TokenDetails: quote-token list failed');
    }
  }, [canCheckFeedEligibility, quoteTokensError]);
  const showFeedTab =
    canCheckFeedEligibility &&
    quoteTokens.isSuccess &&
    !isUnsupportedPostTradeAsset(caip19AssetId, orderAssetChainId);
  const showHoldersTab =
    socialEnabled && getTopTenWalletHolders(topHolders).length > 0;
  return { tabConfigOrder, showFeedTab, showHoldersTab };
};
