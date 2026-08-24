import BigNumber from 'bignumber.js';

export const SCALE_MIN_ORDERS = 2;
export const SCALE_MAX_ORDERS = 20;
export const SCALE_DEFAULT_ORDERS = 5;
export const SCALE_DEFAULT_SKEW = '1.00';

export interface ScaleOrderRung {
  index: number;
  price: string;
  size: string;
  usdAmount: string;
}

export interface BuildScaleOrderLadderParams {
  startPrice: string;
  endPrice: string;
  totalUsdAmount: string;
  totalOrders: number;
  skew: string;
  sizeDecimals: number;
}

export type ScaleOrderValidationCode =
  | 'prices_required'
  | 'invalid_range'
  | 'invalid_order_count'
  | 'invalid_skew'
  | 'minimum_lot';

export type ScaleOrderLadderResult =
  | { success: true; rungs: ScaleOrderRung[] }
  | { success: false; code: ScaleOrderValidationCode };

const toCanonicalPrice = (value: BigNumber): string =>
  value
    .decimalPlaces(8, BigNumber.ROUND_HALF_UP)
    .toFixed()
    .replace(/\.0+$/, '');

/**
 * Builds a price ladder with linear weights from 1 to skew, normalized to the
 * requested USD notional. Asset sizes are rounded down to venue precision so
 * the preview is exactly what placement submits.
 */
export const buildScaleOrderLadder = ({
  startPrice,
  endPrice,
  totalUsdAmount,
  totalOrders,
  skew,
  sizeDecimals,
}: BuildScaleOrderLadderParams): ScaleOrderLadderResult => {
  const start = new BigNumber(startPrice);
  const end = new BigNumber(endPrice);
  const total = new BigNumber(totalUsdAmount);
  const skewValue = new BigNumber(skew);

  if (!start.isFinite() || !end.isFinite() || start.lte(0) || end.lte(0)) {
    return { success: false, code: 'prices_required' };
  }
  if (start.eq(end)) {
    return { success: false, code: 'invalid_range' };
  }
  if (
    !Number.isInteger(totalOrders) ||
    totalOrders < SCALE_MIN_ORDERS ||
    totalOrders > SCALE_MAX_ORDERS
  ) {
    return { success: false, code: 'invalid_order_count' };
  }
  if (!skewValue.isFinite() || skewValue.lte(0)) {
    return { success: false, code: 'invalid_skew' };
  }

  const denominator = totalOrders - 1;
  const weights = Array.from({ length: totalOrders }, (_, index) =>
    new BigNumber(1).plus(
      skewValue.minus(1).times(index).dividedBy(denominator),
    ),
  );
  const totalWeight = weights.reduce(
    (sum, weight) => sum.plus(weight),
    new BigNumber(0),
  );
  const priceStep = end.minus(start).dividedBy(denominator);

  const rungs = weights.map((weight, index) => {
    const price = start.plus(priceStep.times(index));
    const usdAmount = total.times(weight).dividedBy(totalWeight);
    const size = usdAmount
      .dividedBy(price)
      .decimalPlaces(sizeDecimals, BigNumber.ROUND_DOWN);
    return {
      index,
      price: toCanonicalPrice(price),
      size: size.toFixed(),
      usdAmount: usdAmount.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toFixed(2),
    };
  });

  if (
    !total.isFinite() ||
    total.lte(0) ||
    rungs.some((rung) => rung.size === '0')
  ) {
    return { success: false, code: 'minimum_lot' };
  }

  return { success: true, rungs };
};

export const coerceScaleSkew = (value: string): string => {
  const parsed = new BigNumber(value);
  return parsed.isFinite() && parsed.gt(0)
    ? parsed.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toFixed(2)
    : SCALE_DEFAULT_SKEW;
};
