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
 * A single normalized order-book bid for execution-depth calculations.
 * `price` is a dollar price per share; `size` is shares at that price.
 */
export interface PredictExecutionLevel {
  price: number;
  size: number;
}

export interface PredictExecutionBandFloorParams {
  /** Displayed share price the user approved; the band is measured from it. */
  approvedPrice: number;
  /** Approved sell slippage band, e.g. 0.05. */
  slippage: number;
  /** Market tick size from the fresh book; valid prices are multiples of it. */
  tickSize: number;
}

export interface PredictExecutionDepthParams
  extends PredictExecutionBandFloorParams {
  /** Shares the user asked to sell. */
  requestedSize: number;
  /** Bid levels of the book. Order does not matter; the best bid is consumed first. */
  levels: PredictExecutionLevel[];
}

/**
 * Pure execution-depth facts for one fresh order book, measured against the
 * price the user approved. All values come from one snapshot so the signing
 * amounts, the UI decision, and analytics cannot disagree.
 */
export interface PredictExecutionDepth {
  requestedSize: number;
  /** Shares executable inside the band. */
  executableSize: number;
  /** Lowest bid still inside the band. */
  bandFloorPrice: number;
  /**
   * Best bid regardless of band, matching the preview's displayed
   * share-price convention. Null when no valid bid exists.
   */
  refreshedPrice: number | null;
  /** Deepest in-band bid consumed while filling; null when nothing consumed. */
  worstExecutablePrice: number | null;
  /** Gross dollar proceeds of the in-band fill. */
  grossAmount: number;
  /** True only when the entire requested size fills inside the band. */
  isFullyExecutable: boolean;
  /**
   * True when the band was measured from the refreshed price because the
   * approved band could not fill: the fill goes below the approved band.
   */
  isOutsideApprovedBand: boolean;
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

/**
 * Lowest bid still inside the approved sell slippage band, rounded to a valid
 * tick. The exact floor `approvedPrice × (1 − slippage)` is rounded UP to the
 * next tick so a lower bid is never counted due to rounding. Falls back to
 * the unrounded floor when the tick size is not usable, so an invalid tick
 * never widens the band.
 */
export function getPredictExecutionBandFloorPrice({
  approvedPrice,
  slippage,
  tickSize,
}: PredictExecutionBandFloorParams): number {
  const rawFloor = approvedPrice * (1 - slippage);

  if (!Number.isFinite(rawFloor) || rawFloor <= 0) {
    return rawFloor;
  }
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    return rawFloor;
  }
  return roundUpToTick(rawFloor, tickSize);
}

/**
 * Accumulates executable sell depth from one order-book snapshot, counting
 * only bids inside the approved band. Bids are consumed best-first, so
 * `grossAmount` is the dollar proceeds for filling as much of the requested
 * size as the band allows. A partial in-band fill is reported
 * (`executableSize` below `requestedSize`, `isFullyExecutable` false) — never
 * as a signable order, because partial cash out is out of scope: the caller
 * classifies it as `no_match`.
 */
export function calculatePredictExecutionDepth({
  approvedPrice,
  slippage,
  tickSize,
  requestedSize,
  levels,
}: PredictExecutionDepthParams): PredictExecutionDepth {
  const validLevels = levels.filter(isValidLevel);

  const refreshedPrice = validLevels.reduce<number | null>(
    (best, level) => (best === null || level.price > best ? level.price : best),
    null,
  );

  const bandFloorPrice = getPredictExecutionBandFloorPrice({
    approvedPrice,
    slippage,
    tickSize,
  });

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
      bandFloorPrice,
      refreshedPrice,
      worstExecutablePrice: null,
      grossAmount: 0,
      isFullyExecutable: false,
      isOutsideApprovedBand: false,
    };
  }

  const inBand = validLevels
    .filter((level) => level.price >= bandFloorPrice - PRICE_COMPARISON_EPSILON)
    .sort((a, b) => b.price - a.price);

  let remaining = requestedSize;
  let executableSize = 0;
  let grossAmount = 0;
  let worstExecutablePrice: number | null = null;

  for (const level of inBand) {
    if (remaining <= FILL_EPSILON) {
      break;
    }
    const shares = Math.min(level.size, remaining);
    executableSize += shares;
    grossAmount += shares * level.price;
    remaining -= shares;
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
    isOutsideApprovedBand: false,
  };
}

/**
 * Execution depth for a pre-submit validation. The band is measured from the
 * approved price first. When the price dropped and that band cannot fill the
 * full size, the band is measured again from the refreshed price: a moved
 * price that is fully executable is then marked `isOutsideApprovedBand`, so
 * the caller asks for confirmation instead of reporting no match. On low
 * prices the tick-rounded band is only a tick or two wide, so without this a
 * small move could never reach the confirmation.
 */
export function resolvePredictExecutionDepth(
  params: PredictExecutionDepthParams,
): PredictExecutionDepth {
  const approvedDepth = calculatePredictExecutionDepth(params);
  const { refreshedPrice } = approvedDepth;
  if (
    approvedDepth.isFullyExecutable ||
    refreshedPrice === null ||
    refreshedPrice >= params.approvedPrice - PRICE_COMPARISON_EPSILON
  ) {
    return approvedDepth;
  }

  const refreshedDepth = calculatePredictExecutionDepth({
    ...params,
    approvedPrice: refreshedPrice,
  });
  return refreshedDepth.isFullyExecutable
    ? { ...refreshedDepth, isOutsideApprovedBand: true }
    : approvedDepth;
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
