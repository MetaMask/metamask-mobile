import { useCallback, type ReactNode } from 'react';
import type { SocialV1FeedItem } from '../types';
import { useOpenPerpsOrder } from './useOpenPerpsOrder';

export { SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID } from './useOpenPerpsOrder';

export interface UseCopyTradeToPerpsResult {
  /** Undefined unless the item is an open perp. Spot copy trade stays unwired. */
  onCopyTrade?: () => void;
  /** Render next to the card: the geo block shown to an ineligible trader. */
  geoBlockSheet: ReactNode;
}

/**
 * Copy trade for an open perp: opens the Perps order sheet with the trader's
 * direction and leverage, behind the compliance gate and geo block.
 */
export const useCopyTradeToPerps = (
  item: SocialV1FeedItem,
): UseCopyTradeToPerpsResult => {
  const { openPerpsOrder, geoBlockSheet } = useOpenPerpsOrder();

  const handleCopyTrade = useCallback(() => {
    if (item.variant !== 'perpsOpen') {
      return;
    }
    const { direction, leverage, tradeSymbol } = item;
    openPerpsOrder({ direction, asset: tradeSymbol, leverage });
  }, [item, openPerpsOrder]);

  return {
    onCopyTrade: item.variant === 'perpsOpen' ? handleCopyTrade : undefined,
    geoBlockSheet,
  };
};
