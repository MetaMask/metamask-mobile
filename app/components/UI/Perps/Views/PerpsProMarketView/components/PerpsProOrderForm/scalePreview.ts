import type {
  GetScalePriceLadderParams,
  ExpectedScaleLadder,
  PerpsScalePriceLadder,
  OrderResult,
} from '@metamask/perps-controller';
import BigNumber from 'bignumber.js';

/**
 * Accept a complete venue sizing preview without applying another venue's grids.
 *
 * @param request - Exact preview intent.
 * @param result - Current provider response.
 * @returns Form quantities, or undefined when the receipt is incomplete or inconsistent.
 */
export const getVenueScalePreview = (
  request: GetScalePriceLadderParams,
  result: PerpsScalePriceLadder | null,
) => {
  if (
    result?.status !== 'ready' ||
    result.providerId !== request.providerId ||
    !result.sizingPreview ||
    result.prices.length !== request.count ||
    result.sizingPreview.sizes.length !== request.count
  ) {
    return undefined;
  }
  const sizing = result.sizingPreview;
  const rungs = result.prices.map((price, index) => ({
    index,
    price,
    size: sizing.sizes[index],
  }));
  const size = rungs.reduce(
    (sum, rung) => sum.plus(rung.size),
    new BigNumber(0),
  );
  const notional = rungs.reduce(
    (sum, rung) => sum.plus(new BigNumber(rung.size).times(rung.price)),
    new BigNumber(0),
  );
  if (
    rungs.some(
      (rung) =>
        !new BigNumber(rung.size).isFinite() ||
        !new BigNumber(rung.size).gt(0) ||
        !new BigNumber(rung.price).isFinite() ||
        !new BigNumber(rung.price).gt(0),
    ) ||
    !size.eq(sizing.totalSize) ||
    !notional.eq(sizing.totalNotional) ||
    (request.sizing?.size !== undefined && !size.eq(request.sizing.size)) ||
    (request.sizing?.usdAmount !== undefined &&
      notional.gt(request.sizing.usdAmount))
  ) {
    return undefined;
  }
  const expectedScaleLadder: ExpectedScaleLadder = {
    prices: [...result.prices],
    sizes: [...sizing.sizes],
    totalSize: sizing.totalSize,
    totalNotional: sizing.totalNotional,
    minimumBaseSize: sizing.minimumBaseSize,
    minimumQuoteAmount: sizing.minimumQuoteAmount,
    sizeDecimals: sizing.sizeDecimals,
  };
  return {
    success: true as const,
    rungs,
    minPrice: String(request.minPrice),
    maxPrice: String(request.maxPrice),
    orderCount: request.count,
    skew: request.sizing?.skew ?? 1,
    orderValue: sizing.totalNotional,
    totalSize: sizing.totalSize,
    sizingIntent: request.sizing,
    expectedScaleLadder,
  };
};

/**
 * Classify Lighter placement evidence without treating submitted intent as acceptance.
 *
 * @param result - Actual controller receipt, including failed partial placements.
 * @param requestedCount - Number of requested children.
 * @returns Known acceptance and whether the venue outcome needs review.
 */
export const getLighterScaleReceipt = (
  result: OrderResult,
  requestedCount: number,
) => {
  const acceptedCount = result.acceptedChildren?.length;
  const acceptedSize = result.acceptedSize;
  const isUncertain = acceptedCount === undefined || acceptedSize === undefined;
  return {
    acceptedCount,
    acceptedSize,
    isUncertain,
    isRejected: !isUncertain && acceptedCount === 0,
    isPartial:
      !isUncertain && acceptedCount > 0 && acceptedCount < requestedCount,
    isComplete:
      !isUncertain &&
      Boolean(result.success) &&
      acceptedCount === requestedCount,
  };
};
