import {
  BASIS_POINTS_DIVISOR,
  calculateFinalPositionSize,
  calculateOrderPriceAndSize,
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

export interface MarketOrderLiquidityParams extends EstimatedSlippageParams {
  /** Mid price used for the submitted size and slippage limit. */
  currentPrice?: number;
  /** Cap in basis points. Omit when calculating only the VWAP estimate. */
  maxSlippageBps?: number;
  /** Venue size precision, when known. */
  szDecimals?: number;
  /** Reduce-only sizing never rounds up. */
  reduceOnly?: boolean;
  /** Exact position size for a full reduce-only close, submitted without USD. */
  size?: string;
}

export interface MarketOrderLiquidity {
  estimatedSlippageBps: number | null;
  /** Distance of the worst required level from the submission mid. */
  worstSlippageBps: number | null;
  /** Null while unavailable; false when visible depth cannot fill within the cap. */
  canFillWithinSlippage: boolean | null;
}

const unavailableLiquidity: MarketOrderLiquidity = {
  estimatedSlippageBps: null,
  worstSlippageBps: null,
  canFillWithinSlippage: null,
};

/**
 * Estimate slippage in basis points for a market order of `sizeUsd` against
 * the current L2 book. Converts the USD size to a target base size
 * (`sizeUsd / midPrice`) — matching the provider's execution model — walks
 * the relevant side accumulating base size, then checks the worst required level against the submitted limit. Missing
 * data stays unknown; insufficient visible depth explicitly fails the fill check.
 *
 * @param params - Order book snapshot, USD notional, and direction.
 * @returns VWAP, worst required level slippage and fill eligibility.
 */
export function calculateMarketOrderLiquidity({
  orderBook,
  sizeUsd,
  isBuy,
  currentPrice,
  maxSlippageBps,
  szDecimals,
  reduceOnly,
  size: sizeCap,
}: MarketOrderLiquidityParams): MarketOrderLiquidity {
  if (!orderBook || !(sizeUsd > 0)) {
    return unavailableLiquidity;
  }

  const midPrice = currentPrice ?? Number(orderBook.midPrice);
  if (!Number.isFinite(midPrice) || midPrice <= 0) {
    return unavailableLiquidity;
  }

  const levels = isBuy ? orderBook.asks : orderBook.bids;
  if (!levels || levels.length === 0) {
    return { ...unavailableLiquidity, canFillWithinSlippage: false };
  }

  // Mirror the HyperLiquid execution model: the provider derives a fixed base
  // size from `usdValue / currentPrice` and submits a limit at the slippage-
  // buffered price, so the book walk must accumulate base size rather than
  // quote notional. Walking by USD notional underestimates buy slippage and
  // overestimates sell slippage versus the real fill.
  let targetBaseSize = sizeUsd / midPrice;
  if (szDecimals !== undefined) {
    try {
      targetBaseSize = calculateFinalPositionSize({
        usdAmount: sizeCap === undefined ? String(sizeUsd) : undefined,
        size: sizeCap,
        currentPrice: midPrice,
        szDecimals,
        reduceOnly,
      }).finalPositionSize;
    } catch {
      // A reduce-only amount below the venue's size increment has no fill estimate.
      return unavailableLiquidity;
    }
  }
  if (!Number.isFinite(targetBaseSize) || targetBaseSize <= 0) {
    return unavailableLiquidity;
  }

  let filledBaseSize = 0;
  let weightedPriceSum = 0;
  let worstPrice: number | null = null;

  for (const level of levels) {
    const price = Number(level.price);
    const size = Number(level.size);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(size) ||
      size <= 0
    ) {
      continue;
    }

    worstPrice =
      worstPrice === null
        ? price
        : isBuy
          ? Math.max(worstPrice, price)
          : Math.min(worstPrice, price);
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

  if (
    filledBaseSize < targetBaseSize ||
    filledBaseSize <= 0 ||
    worstPrice === null
  ) {
    return { ...unavailableLiquidity, canFillWithinSlippage: false };
  }

  const vwap = weightedPriceSum / filledBaseSize;
  const slippageBps =
    ((vwap - midPrice) / midPrice) * BASIS_POINTS_DIVISOR * (isBuy ? 1 : -1);
  const worstSlippageBps = Math.max(
    0,
    ((worstPrice - midPrice) / midPrice) *
      BASIS_POINTS_DIVISOR *
      (isBuy ? 1 : -1),
  );
  let canFillWithinSlippage: boolean | null = null;
  if (maxSlippageBps !== undefined) {
    // Reuse the venue's rounding so the guard checks the actual submitted limit.
    const limitPrice =
      szDecimals === undefined
        ? midPrice *
          (1 + ((isBuy ? 1 : -1) * maxSlippageBps) / BASIS_POINTS_DIVISOR)
        : Number(
            calculateOrderPriceAndSize({
              orderType: 'market',
              isBuy,
              finalPositionSize: targetBaseSize,
              currentPrice: midPrice,
              maxSlippageBps,
              szDecimals,
            }).formattedPrice,
          );
    canFillWithinSlippage = isBuy
      ? worstPrice <= limitPrice
      : worstPrice >= limitPrice;
  }
  return {
    estimatedSlippageBps: Math.max(0, slippageBps),
    worstSlippageBps,
    canFillWithinSlippage,
  };
}

/**
 * Returns the VWAP estimate for display, or null for unavailable/insufficient depth.
 *
 * @param params - Order book, USD size and side.
 * @returns Estimated slippage in basis points.
 */
export function calculateEstimatedSlippageBps(
  params: EstimatedSlippageParams,
): number | null {
  return calculateMarketOrderLiquidity(params).estimatedSlippageBps;
}
