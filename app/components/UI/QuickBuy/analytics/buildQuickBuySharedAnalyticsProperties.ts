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
    | 'source'
    | 'originalEntryPoint'
    | 'marketCap'
    | 'isCopyTrade'
    | 'traderAddress'
  > & { copyTradeOrigin?: CopyTradeOrigin },
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};

  if (analyticsContext?.source) {
    props[QuickBuyEventProperties.SOURCE] = analyticsContext.source;
  }
  props[QuickBuyEventProperties.IS_COPY_TRADE] = isQuickBuyCopyTrade({
    copyTradeOrigin: analyticsContext?.copyTradeOrigin,
    isCopyTrade: analyticsContext?.isCopyTrade,
    source: analyticsContext?.source,
    traderAddress: analyticsContext?.traderAddress,
  });
  if (analyticsContext?.originalEntryPoint) {
    props[QuickBuyEventProperties.ORIGINAL_ENTRY_POINT] =
      analyticsContext.originalEntryPoint;
  }
  if (typeof analyticsContext?.marketCap === 'number') {
    props[QuickBuyEventProperties.MARKET_CAP] = analyticsContext.marketCap;
  }

  return props;
}
