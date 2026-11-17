import { BigNumber } from 'bignumber.js';
import {
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';

interface Params {
  limitFiat: string | undefined;
  marketFiat: number | undefined;
  executionType: LimitOrderExecutionType;
}

export const getSwapsLimitOrderDefaultPriceComparisonDirection = (
  executionType: LimitOrderExecutionType,
): LimitOrderPriceComparisonDirection =>
  executionType === LimitOrderExecutionType.SELL
    ? LimitOrderPriceComparisonDirection.AT_OR_ABOVE
    : LimitOrderPriceComparisonDirection.AT_OR_BELOW;

export const getSwapsLimitOrderPriceComparisonDirection = ({
  limitFiat,
  marketFiat,
  executionType,
}: Params): LimitOrderPriceComparisonDirection => {
  const defaultDirection =
    getSwapsLimitOrderDefaultPriceComparisonDirection(executionType);

  if (!limitFiat || !marketFiat) {
    return defaultDirection;
  }

  const limit = new BigNumber(limitFiat);
  const market = new BigNumber(marketFiat);
  if (
    !limit.isFinite() ||
    limit.lte(0) ||
    !market.isFinite() ||
    market.lte(0)
  ) {
    return defaultDirection;
  }

  // Use formatted price to figure out the direction, rather than
  // real market price to avoid rounding issues.
  const percentFromMarket = limit
    .minus(market)
    .dividedBy(market)
    .multipliedBy(100);
  if (
    !percentFromMarket.isFinite() ||
    percentFromMarket.abs().toFixed(2) === '0.00'
  ) {
    return defaultDirection;
  }

  return percentFromMarket.isPositive()
    ? LimitOrderPriceComparisonDirection.AT_OR_ABOVE
    : LimitOrderPriceComparisonDirection.AT_OR_BELOW;
};
