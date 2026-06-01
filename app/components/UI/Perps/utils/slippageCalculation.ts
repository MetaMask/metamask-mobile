import {
  BASIS_POINTS_DIVISOR,
  type OrderBookData,
} from '@metamask/perps-controller';

export interface EstimatedSlippageParams {
  /** Live order book snapshot (typically from usePerpsLiveOrderBook). */
  orderBook: OrderBookData | null;
  /** USD notional to fill. */
  sizeUsd: number;
  /** true = BUY (sweeps asks), false = SELL (sweeps bids). */
  isBuy: boolean;
}

/**
 * Estimate slippage in basis points for a market order of `sizeUsd` against
 * the current L2 book. Converts the USD size to a target base size
 * (`sizeUsd / midPrice`) — matching the provider's execution model — walks
 * the relevant side accumulating base size, then returns the VWAP's distance
 * from the mid. Returns `null` when the book is missing or too shallow; the
 * caller must treat that as "unknown" rather than zero.
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

  // Mirror the HyperLiquid execution model: the provider derives a fixed base
  // size from `usdValue / currentPrice` and submits a limit at the slippage-
  // buffered price, so the book walk must accumulate base size rather than
  // quote notional. Walking by USD notional underestimates buy slippage and
  // overestimates sell slippage versus the real fill.
  const targetBaseSize = sizeUsd / midPrice;
  if (!Number.isFinite(targetBaseSize) || targetBaseSize <= 0) {
    return null;
  }

  let filledBaseSize = 0;
  let weightedPriceSum = 0;

  for (const level of levels) {
    const price = Number(level.price);
    const size = Number(level.size);
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) {
      continue;
    }

    const remainingBase = targetBaseSize - filledBaseSize;

    if (remainingBase <= size) {
      // This level finishes the fill — only take the remaining base size.
      weightedPriceSum += remainingBase * price;
      filledBaseSize += remainingBase;
      break;
    }

    weightedPriceSum += size * price;
    filledBaseSize += size;
  }

  if (filledBaseSize < targetBaseSize || filledBaseSize <= 0) {
    return null;
  }

  const vwap = weightedPriceSum / filledBaseSize;
  const slippageBps =
    ((vwap - midPrice) / midPrice) * BASIS_POINTS_DIVISOR * (isBuy ? 1 : -1);
  return Math.max(0, slippageBps);
}
