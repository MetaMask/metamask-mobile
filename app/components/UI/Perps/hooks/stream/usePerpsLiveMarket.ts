import { useMemo } from 'react';
import {
  PERPS_CONSTANTS,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { usePerpsLivePrices } from './usePerpsLivePrices';

export interface UsePerpsLiveMarketOptions {
  throttleMs?: number;
}

/**
 * Merges live WebSocket price updates into a `PerpsMarketData` object.
 * Returns the original `market` by identity when nothing has changed,
 * so consumers wrapped in `React.memo` skip re-renders for unchanged items.
 *
 * Extracted from `PerpsMarketRowItem` so pill and row renderers share the
 * same live-price merging logic without each opening their own subscription.
 */
export function usePerpsLiveMarket(
  market: PerpsMarketData,
  options: UsePerpsLiveMarketOptions = {},
): PerpsMarketData {
  const { throttleMs = 3000 } = options;

  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs,
  });

  return useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice) {
      return market;
    }

    const currentPrice = parseFloat(livePrice.price);
    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    const fundingRateChanged =
      livePrice.funding !== undefined &&
      livePrice.funding !== market.fundingRate;

    if (comparisonPrice === market.price && !fundingRateChanged) {
      return market;
    }

    const updatedMarket: PerpsMarketData = { ...market, price: formattedPrice };

    if (livePrice.percentChange24h) {
      const changePercent = parseFloat(livePrice.percentChange24h);
      updatedMarket.change24hPercent = formatPercentage(changePercent);
      const divisor = 1 + changePercent / 100;
      const priceChange =
        divisor !== 0 ? currentPrice - currentPrice / divisor : -currentPrice;
      updatedMarket.change24h = formatPnl(priceChange);
    }

    if (livePrice.volume24h !== undefined) {
      updatedMarket.volume =
        livePrice.volume24h > 0
          ? formatVolume(livePrice.volume24h)
          : PERPS_CONSTANTS.ZeroAmountDetailedDisplay;
    } else if (
      !market.volume ||
      market.volume === PERPS_CONSTANTS.ZeroAmountDisplay
    ) {
      updatedMarket.volume = PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    if (livePrice.funding !== undefined) {
      updatedMarket.fundingRate = livePrice.funding;
    }

    return updatedMarket;
  }, [market, livePrices]);
}
