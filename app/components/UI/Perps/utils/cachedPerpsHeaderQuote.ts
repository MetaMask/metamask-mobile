import type { CandleData, PriceUpdate } from '@metamask/perps-controller';

export interface CachedPerpsHeaderQuote {
  price: number;
  percentChange24h: number | null;
}

const parsePositivePrice = (value: string | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parsePercentChange = (value: string | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Price already in memory when the trade sheet opens.
 *
 * Only used until the sheet's own price subscription delivers; after that the
 * header follows the same live mid the order math uses.
 *
 * Price: the asset screen's last chart candle close, otherwise the focused
 * update, otherwise the allMids entry. 24h change: the allMids entry first,
 * matching `PerpsMarketHeader`, then the focused update.
 *
 * @param params.asset - Market symbol shown in the sheet.
 * @param params.candleData - Fresh candle cache for the asset screen's chart.
 * @param params.focusedPrice - Last focused-price update, if any.
 * @param params.cachedPrice - Cached allMids entry for `asset`.
 */
export function getCachedPerpsHeaderQuote(params: {
  asset: string;
  candleData: CandleData | null | undefined;
  focusedPrice: PriceUpdate | null | undefined;
  cachedPrice: PriceUpdate | null | undefined;
}): CachedPerpsHeaderQuote | null {
  const { asset, candleData, focusedPrice, cachedPrice } = params;
  const chartClose =
    candleData?.symbol === asset
      ? parsePositivePrice(candleData.candles.at(-1)?.close)
      : null;
  const focused = focusedPrice?.symbol === asset ? focusedPrice : undefined;
  const mid = cachedPrice?.symbol === asset ? cachedPrice : undefined;
  const price =
    chartClose ??
    parsePositivePrice(focused?.price) ??
    parsePositivePrice(mid?.price);

  if (price === null) {
    return null;
  }

  return {
    price,
    percentChange24h:
      parsePercentChange(mid?.percentChange24h) ??
      parsePercentChange(focused?.percentChange24h),
  };
}
