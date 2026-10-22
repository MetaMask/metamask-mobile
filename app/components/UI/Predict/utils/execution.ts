import { Side, type OrderPreview } from '../types';
import { isValidPrice } from './prices';

/**
 * Signing freshness window for an execution-checked sell preview: older
 * previews are never signed directly and force a revalidation.
 */
export const PREDICT_EXECUTION_PREVIEW_MAX_AGE_MS = 1_000;

/**
 * Deadline for the pre-submit order book fetch. Much shorter than the shared
 * Polymarket request timeout because the user waits on it after pressing
 * Cash Out or Confirm.
 */
export const PREDICT_EXECUTION_PREVIEW_TIMEOUT_MS = 4_000;

/**
 * True for a sell preview built by the pre-submit execution operation.
 * Only that operation sets `fetchedAt`, after the market and position
 * pre-flight checks passed, so ordinary polled previews never match.
 */
export const isPredictExecutionCheckedSell = (
  preview: OrderPreview,
): preview is OrderPreview & { fetchedAt: number } =>
  preview.side === Side.SELL && preview.fetchedAt !== undefined;

export const isPredictExecutionPreviewStale = (
  preview: OrderPreview & { fetchedAt: number },
  now: number = Date.now(),
): boolean => now - preview.fetchedAt > PREDICT_EXECUTION_PREVIEW_MAX_AGE_MS;

/**
 * A single normalized order-book level for execution-depth calculations.
 * `price` is a dollar price per share; `size` is shares at that price.
 */
export interface PredictExecutionLevel {
  price: number;
  size: number;
}

export interface PredictExecutionBandFloorParams {
  side: Side;
  /** Displayed share price the user approved; the band is measured from it. */
  approvedPrice: number;
  /** Approved slippage band: 0.05 (sell) / 0.03 (buy). */
  slippage: number;
  /** Market tick size from the fresh book; valid prices are multiples of it. */
  tickSize: number;
}

export interface PredictExecutionDepthParams
  extends PredictExecutionBandFloorParams {
  /**
   * Size the user asked to execute. Unit matches the side: shares to sell for
   * SELL, dollars to spend for BUY.
   */
  requestedSize: number;
  /**
   * Book levels on the order's side: bids for SELL, asks for BUY. Order does
   * not matter; the best level is consumed first.
   */
  levels: PredictExecutionLevel[];
}

/**
 * Pure execution-depth facts for one fresh order book, measured against the
 * price the user approved. All values come from one snapshot so the signing
 * amounts, the UI decision, and analytics cannot disagree.
 */
export interface PredictExecutionDepth {
  /** Unit matches the side: SELL shares, BUY dollars. */
  requestedSize: number;
  /** Same unit as `requestedSize`; how much is executable inside the band. */
  executableSize: number;
  /** Worst price still inside the approved band: SELL floor, BUY ceiling. */
  bandFloorPrice: number;
  /**
   * Best book level price regardless of band, matching the preview's
   * displayed share-price convention. Null when no valid level exists.
   */
  refreshedPrice: number | null;
  /** Deepest in-band level consumed while filling; null when nothing consumed. */
  worstExecutablePrice: number | null;
  /** SELL: gross dollar proceeds of the in-band fill. BUY: shares received. */
  grossAmount: number;
  /** True only when the entire requested size fills inside the approved band. */
  isFullyExecutable: boolean;
}

/**
 * Float drift on tick-multiple comparisons: real books price in tick
 * multiples (never finer than 1e-6), so a 1e-9 tolerance never merges two
 * genuinely different prices but does absorb representation noise.
 */
const TICK_SNAP_EPSILON = 1e-9;
const PRICE_COMPARISON_EPSILON = 1e-9;
const FILL_EPSILON = 1e-9;

const isValidLevel = (level: PredictExecutionLevel): boolean =>
  isValidPrice(level.price) && Number.isFinite(level.size) && level.size > 0;

const roundUpToTick = (price: number, tickSize: number): number => {
  const ticks = price / tickSize;
  const nearest = Math.round(ticks);
  // Snap when float drift put an exact tick multiple just under itself.
  const snapped =
    Math.abs(ticks - nearest) <= TICK_SNAP_EPSILON ? nearest : Math.ceil(ticks);
  return snapped * tickSize;
};

const roundDownToTick = (price: number, tickSize: number): number => {
  const ticks = price / tickSize;
  const nearest = Math.round(ticks);
  const snapped =
    Math.abs(ticks - nearest) <= TICK_SNAP_EPSILON
      ? nearest
      : Math.floor(ticks);
  return snapped * tickSize;
};

/**
 * Worst price still inside the approved slippage band, rounded to a valid
 * tick. For SELL the exact floor `approvedPrice × (1 − slippage)` is rounded
 * UP to the next tick so a lower bid is never counted due to rounding; for
 * BUY the ceiling `approvedPrice × (1 + slippage)` is rounded DOWN for the
 * same guarantee. Falls back to the unrounded boundary when the tick size is
 * not usable, so an invalid tick never widens the band.
 */
export function getPredictExecutionBandFloorPrice({
  side,
  approvedPrice,
  slippage,
  tickSize,
}: PredictExecutionBandFloorParams): number {
  const rawFloor =
    side === Side.SELL
      ? approvedPrice * (1 - slippage)
      : approvedPrice * (1 + slippage);

  if (!Number.isFinite(rawFloor) || rawFloor <= 0) {
    return rawFloor;
  }
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    return rawFloor;
  }
  return side === Side.SELL
    ? roundUpToTick(rawFloor, tickSize)
    : roundDownToTick(rawFloor, tickSize);
}

/**
 * Accumulates executable depth from one order-book snapshot, counting only
 * levels inside the approved band. Levels are consumed best-first, so SELL
 * `grossAmount` is the dollar proceeds and BUY `grossAmount` the shares
 * received for filling as much of the requested size as the band allows.
 * A partial in-band fill is reported (`executableSize` below
 * `requestedSize`, `isFullyExecutable` false) — never as a signable order,
 * because partial cash out is out of scope: the caller classifies it as
 * `no_match`.
 */
export function calculatePredictExecutionDepth({
  side,
  approvedPrice,
  slippage,
  tickSize,
  requestedSize,
  levels,
}: PredictExecutionDepthParams): PredictExecutionDepth {
  const validLevels = levels.filter(isValidLevel);

  const refreshedPrice =
    side === Side.SELL
      ? validLevels.reduce<number | null>(
          (best, level) =>
            best === null || level.price > best ? level.price : best,
          null,
        )
      : validLevels.reduce<number | null>(
          (best, level) =>
            best === null || level.price < best ? level.price : best,
          null,
        );

  const hasValidRequest =
    Number.isFinite(requestedSize) &&
    requestedSize > 0 &&
    isValidPrice(approvedPrice) &&
    Number.isFinite(slippage) &&
    slippage >= 0;

  if (!hasValidRequest || validLevels.length === 0) {
    return {
      requestedSize: Number.isFinite(requestedSize) ? requestedSize : 0,
      executableSize: 0,
      bandFloorPrice: getPredictExecutionBandFloorPrice({
        side,
        approvedPrice,
        slippage,
        tickSize,
      }),
      refreshedPrice,
      worstExecutablePrice: null,
      grossAmount: 0,
      isFullyExecutable: false,
    };
  }

  const bandFloorPrice = getPredictExecutionBandFloorPrice({
    side,
    approvedPrice,
    slippage,
    tickSize,
  });

  const inBand = validLevels
    .filter((level) =>
      side === Side.SELL
        ? level.price >= bandFloorPrice - PRICE_COMPARISON_EPSILON
        : level.price <= bandFloorPrice + PRICE_COMPARISON_EPSILON,
    )
    .sort((a, b) =>
      side === Side.SELL ? b.price - a.price : a.price - b.price,
    );

  let remaining = requestedSize;
  let executableSize = 0;
  let grossAmount = 0;
  let worstExecutablePrice: number | null = null;

  for (const level of inBand) {
    if (remaining <= FILL_EPSILON) {
      break;
    }
    if (side === Side.SELL) {
      const shares = Math.min(level.size, remaining);
      executableSize += shares;
      grossAmount += shares * level.price;
      remaining -= shares;
    } else {
      const dollars = Math.min(level.size * level.price, remaining);
      executableSize += dollars;
      grossAmount += dollars / level.price;
      remaining -= dollars;
    }
    worstExecutablePrice = level.price;
  }

  return {
    requestedSize,
    executableSize,
    bandFloorPrice,
    refreshedPrice,
    worstExecutablePrice,
    grossAmount,
    isFullyExecutable: remaining <= FILL_EPSILON,
  };
}

/**
 * Execution depth for a pre-submit validation. The band is measured from the
 * approved price first. When the book moved against the user and that band
 * cannot fill the full size, the band is measured again from the refreshed
 * price: a moved price that is fully executable then goes to price consent
 * (auto-submit within one tick, confirmation beyond it) instead of reporting
 * no match. On low prices the tick-rounded band is only a tick or two wide,
 * so without this a small move could never reach the confirmation.
 */
export function resolvePredictExecutionDepth(
  params: PredictExecutionDepthParams,
): PredictExecutionDepth {
  const approvedDepth = calculatePredictExecutionDepth(params);
  const { refreshedPrice } = approvedDepth;
  if (approvedDepth.isFullyExecutable || refreshedPrice === null) {
    return approvedDepth;
  }

  const movedAgainstUser =
    params.side === Side.SELL
      ? refreshedPrice < params.approvedPrice - PRICE_COMPARISON_EPSILON
      : refreshedPrice > params.approvedPrice + PRICE_COMPARISON_EPSILON;
  if (!movedAgainstUser) {
    return approvedDepth;
  }

  const refreshedDepth = calculatePredictExecutionDepth({
    ...params,
    approvedPrice: refreshedPrice,
  });
  return refreshedDepth.isFullyExecutable ? refreshedDepth : approvedDepth;
}

/**
 * Returns the sell preview with its worst case measured from its own share
 * price. A price-moved candidate is built against the old approved price,
 * but pressing Confirm adopts the candidate price as the new baseline, so the
 * order that gets signed uses this lower floor.
 */
export function withPredictSellBandFloorFromSharePrice(
  preview: OrderPreview,
): OrderPreview {
  const bandFloorPrice = getPredictExecutionBandFloorPrice({
    side: Side.SELL,
    approvedPrice: preview.sharePrice,
    slippage: preview.slippage,
    tickSize: preview.tickSize,
  });
  if (!Number.isFinite(bandFloorPrice) || bandFloorPrice <= 0) {
    return preview;
  }
  return {
    ...preview,
    minAmountReceivedAfterSlippage: preview.maxAmountSpent * bandFloorPrice,
  };
}
