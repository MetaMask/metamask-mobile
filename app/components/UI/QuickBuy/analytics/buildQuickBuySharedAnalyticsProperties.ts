import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import { isQuickBuyCopyTrade } from './isQuickBuyCopyTrade';
import { QuickBuyEventProperties } from './quickBuyEvents';
import type { QuickBuyAnalyticsContext } from '../types';

/**
 * Shared Quick Buy lifecycle properties from `metamask-mobile-social-quick-buy-globals`.
 * `source` is the surface where the sheet opened; `original_entry_point` is only
 * set for trade-screen flows.
 */
export function buildQuickBuySharedAnalyticsProperties(
  analyticsContext?: Pick<
    QuickBuyAnalyticsContext,
    'source' | 'originalEntryPoint' | 'marketCap' | 'isCopyTrade'
  > & { copyTradeOrigin?: CopyTradeOrigin },
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};

  if (analyticsContext?.source) {
    props[QuickBuyEventProperties.SOURCE] = analyticsContext.source;
  }
  props[QuickBuyEventProperties.IS_COPY_TRADE] = isQuickBuyCopyTrade({
    copyTradeOrigin: analyticsContext?.copyTradeOrigin,
    isCopyTrade: analyticsContext?.isCopyTrade,
  });
  if (analyticsContext?.originalEntryPoint) {
    props[QuickBuyEventProperties.ORIGINAL_ENTRY_POINT] =
      analyticsContext.originalEntryPoint;
  }
  // The source post of a copy trade, so every Quick Buy event in the copy
  // session (buy and sell) joins to the post it came from.
  if (analyticsContext?.copyTradeOrigin) {
    props[QuickBuyEventProperties.POST_ID] =
      analyticsContext.copyTradeOrigin.commentId;
    if (analyticsContext.copyTradeOrigin.authorId) {
      props[QuickBuyEventProperties.AUTHOR_TRADER_ID] =
        analyticsContext.copyTradeOrigin.authorId;
    }
  }
  if (typeof analyticsContext?.marketCap === 'number') {
    props[QuickBuyEventProperties.MARKET_CAP] = analyticsContext.marketCap;
  }

  return props;
}
