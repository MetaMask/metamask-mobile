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

  if (limit.gt(market)) {
    return LimitOrderPriceComparisonDirection.AT_OR_ABOVE;
  }

  if (limit.lt(market)) {
    return LimitOrderPriceComparisonDirection.AT_OR_BELOW;
  }

  return defaultDirection;
};
