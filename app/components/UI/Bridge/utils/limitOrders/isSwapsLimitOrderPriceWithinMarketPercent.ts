import { BigNumber } from 'bignumber.js';

/**
 * Whether a limit/trigger price sits within `percent` (inclusive) of market.
 *
 * `price` and `marketPrice` must be in the same unit (both fiat, or both the
 * same counter token).
 */
export const isSwapsLimitOrderPriceWithinMarketPercent = ({
  price,
  marketPrice,
  percent,
}: {
  price: string | undefined;
  marketPrice: number | string | undefined;
  percent: number;
}): boolean => {
  if (price === undefined || price === '' || marketPrice === undefined) {
    return false;
  }

  const limit = new BigNumber(price);
  const market = new BigNumber(marketPrice);
  if (
    !limit.isFinite() ||
    limit.lte(0) ||
    !market.isFinite() ||
    market.lte(0)
  ) {
    return false;
  }

  const absPercent = limit
    .minus(market)
    .dividedBy(market)
    .abs()
    .multipliedBy(100);

  return absPercent.isFinite() && absPercent.lte(percent);
};
