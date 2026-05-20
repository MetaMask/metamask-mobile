import type { OrderBookData } from '@metamask/perps-controller';

export interface EstimatedSlippageParams {
  /** Live order book snapshot (typically from usePerpsLiveOrderBook). */
  orderBook: OrderBookData | null;
  /** USD notional to fill. */
  sizeUsd: number;
  /** true = BUY (sweeps asks), false = SELL (sweeps bids). */
  isBuy: boolean;
}

/**
 * Estimate the slippage in basis points that a market order of the given USD
 * size would incur against the current order book.
 *
 * Walks the appropriate side of the book in price order, accumulating filled
 * notional until the target USD size is reached, then computes the volume
 * weighted average price (VWAP) of the fill and returns its distance from the
 * mid price.
 *
 * Returns `null` when the book is unavailable, the size is non-positive, or
 * the book does not have enough depth to fill the requested size — callers
 * should treat that as "unknown" rather than zero.
 *
 * @param params - Order book snapshot, USD notional, and direction.
 * @returns Estimated slippage in basis points (always non-negative) or null.
 */
export function calculateEstimatedSlippageBps({
  orderBook,
  sizeUsd,
  isBuy,
}: EstimatedSlippageParams): number | null {
  if (!orderBook || !(sizeUsd > 0)) {
    return null;
  }

  const midPrice = Number(orderBook.midPrice);
  if (!Number.isFinite(midPrice) || midPrice <= 0) {
    return null;
  }

  const levels = isBuy ? orderBook.asks : orderBook.bids;
  if (!levels || levels.length === 0) {
    return null;
  }

  let filledNotional = 0;
  let filledBaseSize = 0;
  let weightedPriceSum = 0;

  for (const level of levels) {
    const price = Number(level.price);
    const size = Number(level.size);
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) {
      continue;
    }

    const levelNotional = price * size;
    const remainingNotional = sizeUsd - filledNotional;

    if (remainingNotional <= levelNotional) {
      // This level finishes the fill — only take what we need from it.
      const partialSize = remainingNotional / price;
      weightedPriceSum += partialSize * price;
      filledBaseSize += partialSize;
      filledNotional = sizeUsd;
      break;
    }

    weightedPriceSum += size * price;
    filledBaseSize += size;
    filledNotional += levelNotional;
  }

  if (filledNotional < sizeUsd || filledBaseSize <= 0) {
    return null;
  }

  const vwap = weightedPriceSum / filledBaseSize;
  const slippageBps = ((vwap - midPrice) / midPrice) * 10000 * (isBuy ? 1 : -1);
  return Math.max(0, slippageBps);
}
