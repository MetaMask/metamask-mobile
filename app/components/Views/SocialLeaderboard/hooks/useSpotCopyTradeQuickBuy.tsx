import { useCallback, type ReactNode } from 'react';
import {
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
  type QuickBuyTradeMode,
} from '../../../UI/QuickBuy';
import type { QuickBuySheetSource } from '../../../UI/QuickBuy/analytics';
import { useQuickBuySheet } from '../../../UI/QuickBuy/QuickBuySheetHost';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import { toSpotCopyTradeTarget } from '../../../UI/SocialFeed/utils/copyTrade';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  usePostTradeShareReopen,
  type PostTradeShareOwnerId,
} from '../PostTradeShareBottomSheet';

export interface UseSpotCopyTradeQuickBuyOptions {
  /** Quick Buy analytics `source` for trades started here. */
  source: QuickBuySheetSource;
  /** Owner that reopens Quick Buy when the post-trade retry fires. */
  postTradeShareOwner: PostTradeShareOwnerId;
  /** Only the visible screen may reopen Quick Buy. */
  isActive: boolean;
}

export interface UseSpotCopyTradeQuickBuyResult {
  /** Opens Quick Buy for a spot post. Perps and unresolvable tokens are ignored. */
  onCopyTrade: (item: SocialV1FeedItem, commentId?: string) => void;
  /** Render at the screen root. Null when a tabs host draws the sheet. */
  quickBuySheet: ReactNode;
}

/**
 * Spot Copy trade for a screen that hosts Social V1 posts outside the feed,
 * with the same Quick Buy options the feed uses.
 */
export const useSpotCopyTradeQuickBuy = ({
  source,
  postTradeShareOwner,
  isActive,
}: UseSpotCopyTradeQuickBuyOptions): UseSpotCopyTradeQuickBuyResult => {
  const { openQuickBuy: showQuickBuy, quickBuySheet } = useQuickBuySheet();

  const openQuickBuy = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin?: CopyTradeOrigin,
      tradeMode: QuickBuyTradeMode = 'buy',
      traderAddress?: string,
    ) => {
      showQuickBuy({
        target,
        copyTradeOrigin,
        features: TOP_TRADERS_QUICK_BUY_FEATURES,
        initialTradeMode: tradeMode,
        analyticsContext: {
          source,
          isCopyTrade: true,
          ...(traderAddress ? { traderAddress } : {}),
        },
        postTradeShare: true,
        postTradeShareOwner,
      });
    },
    [postTradeShareOwner, showQuickBuy, source],
  );

  usePostTradeShareReopen(
    openQuickBuy,
    isActive ? postTradeShareOwner : undefined,
  );

  const onCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      const target = toSpotCopyTradeTarget(item);
      if (!target) {
        return;
      }
      openQuickBuy(
        target,
        commentId ? { commentId } : undefined,
        'buy',
        item.author.address,
      );
    },
    [openQuickBuy],
  );

  return { onCopyTrade, quickBuySheet };
};
