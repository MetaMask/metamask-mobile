import React, { useCallback, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  QuickBuy,
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
  type QuickBuyTradeMode,
} from '../../QuickBuy';
import {
  PostTradeShareOwner,
  usePostTradeShareReopen,
} from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet';
import type { SocialV1FeedItem } from '../../SocialFeed/types';
import { chainNameToId } from '../../SocialFeed/utils/chainMapping';

interface TokenDetailsFeedCopyTrade {
  handleFeedCopyTrade: (item: SocialV1FeedItem, commentId?: string) => void;
  feedCopyTradeSheet: React.ReactElement;
}

/** Wires the spot Feed CTA to the existing Quick Buy and post-trade flow. */
export function useTokenDetailsFeedCopyTrade(): TokenDetailsFeedCopyTrade {
  const isFocused = useIsFocused();
  const [copyTrade, setCopyTrade] = useState<{
    target: QuickBuyTarget;
    copyTradeOrigin?: CopyTradeOrigin;
    tradeMode?: QuickBuyTradeMode;
    traderAddress?: string;
  } | null>(null);
  const handleFeedCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
        return;
      }
      const chain = chainNameToId(item.asset.avatar.chain);
      const tokenAddress = item.asset.avatar.tokenAddress.trim();
      if (!chain || !tokenAddress) {
        return;
      }
      setCopyTrade({
        target: {
          tokenAddress,
          tokenSymbol: item.asset.symbol,
          tokenName: item.asset.name ?? item.asset.symbol,
          chain,
        },
        copyTradeOrigin: commentId
          ? { commentId, authorId: item.author.id }
          : undefined,
        traderAddress: item.author.address,
      });
    },
    [],
  );
  const closeCopyTrade = useCallback(() => setCopyTrade(null), []);
  const copyTradeTraderAddress = copyTrade?.traderAddress;
  const copyTradeAnalyticsContext = useMemo(
    () => ({
      source: 'trader_feed' as const,
      isCopyTrade: true,
      ...(copyTradeTraderAddress
        ? { traderAddress: copyTradeTraderAddress }
        : {}),
    }),
    [copyTradeTraderAddress],
  );
  const handlePostTradeShareReopen = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin?: CopyTradeOrigin,
      tradeMode?: QuickBuyTradeMode,
      traderAddress?: string,
    ) => {
      setCopyTrade({ target, copyTradeOrigin, tradeMode, traderAddress });
    },
    [],
  );
  usePostTradeShareReopen(
    handlePostTradeShareReopen,
    isFocused ? PostTradeShareOwner.tokenDetails : undefined,
  );
  return {
    handleFeedCopyTrade,
    feedCopyTradeSheet: (
      <QuickBuy.Root
        isVisible={copyTrade !== null}
        target={copyTrade?.target ?? null}
        onClose={closeCopyTrade}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        initialTradeMode={copyTrade?.tradeMode ?? 'buy'}
        analyticsContext={copyTradeAnalyticsContext}
        copyTradeOrigin={copyTrade?.copyTradeOrigin}
        postTradeShare
        postTradeShareOwner={PostTradeShareOwner.tokenDetails}
      />
    ),
  };
}
