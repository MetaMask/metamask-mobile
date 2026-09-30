import type { CandleData, PriceUpdate } from '@metamask/perps-controller';

export interface CachedPerpsHeaderQuote {
  price: number;
  percentChange24h: number | null;
  /**
   * True when `price` is the asset screen's chart close. That value stays the
   * header price so the trade sheet does not replace it with a mid from a
   * new subscription.
   */
  matchesChartPrice: boolean;
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
 * The asset screen shows the last chart candle close. The 24h change comes
 * from the shared price cache: the focused update for this symbol, otherwise
 * the allMids snapshot. Either source is enough to skip the header skeleton.
 */
export function getCachedPerpsHeaderQuote(params: {
  asset: string;
  candleData: CandleData | null | undefined;
  focusedPrice: PriceUpdate | null | undefined;
  priceSnapshot: Record<string, PriceUpdate> | null | undefined;
}): CachedPerpsHeaderQuote | null {
  const { asset, candleData, focusedPrice, priceSnapshot } = params;
  const chartClose =
    candleData?.symbol === asset
      ? parsePositivePrice(candleData.candles.at(-1)?.close)
      : null;
  const focused = focusedPrice?.symbol === asset ? focusedPrice : undefined;
  const streamPrice = focused ?? priceSnapshot?.[asset];
  const price = chartClose ?? parsePositivePrice(streamPrice?.price);

  if (price === null) {
    return null;
  }

  return {
    price,
    percentChange24h: parsePercentChange(streamPrice?.percentChange24h),
    matchesChartPrice: chartClose !== null,
  };
}

/**
 * Header price for the trade sheet. A fresh chart close wins so the number
 * matches the asset screen. Otherwise use the live subscription, then the
 * price-stream cache, so the sheet does not wait on a new tick.
 */
export function resolveTradeSheetHeaderPrice(params: {
  cachedQuote: CachedPerpsHeaderQuote | null;
  livePrice: number;
}): number {
  const { cachedQuote, livePrice } = params;
  if (cachedQuote?.matchesChartPrice) {
    return cachedQuote.price;
  }
  if (livePrice > 0) {
    return livePrice;
  }
  return cachedQuote?.price ?? 0;
}

/**
 * 24h change shown next to the header price. Prefer the live update once it
 * exists; until then use the cached change from the same price snapshot.
 */
export function resolveTradeSheetHeaderChange(params: {
  cachedQuote: CachedPerpsHeaderQuote | null;
  hasLivePrice: boolean;
  livePercent: number | null;
}): number | null {
  const { cachedQuote, hasLivePrice, livePercent } = params;
  if (hasLivePrice && livePercent !== null) {
    return livePercent;
  }
  return cachedQuote?.percentChange24h ?? null;
}
