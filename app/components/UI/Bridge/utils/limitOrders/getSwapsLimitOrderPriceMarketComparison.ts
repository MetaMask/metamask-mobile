import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderExecutionType } from '../../constants/limitOrders';

interface Params {
  limitFiat: string | undefined;
  marketFiat: number | undefined;
  executionType: LimitOrderExecutionType;
  threshold: number;
}

/**
 * Returns the market-comparison label for a quoted-token unit limit price.
 *
 * Hidden when the displayed percent rounds to 0.00. Buy: shown only when the
 * limit is at least X% below the quoted token's market fiat. Sell: shown only
 * when the limit is more than X% above market.
 *
 * X = threshold
 */
export const getSwapsLimitOrderPriceMarketComparison = ({
  limitFiat,
  marketFiat,
  executionType,
  threshold,
}: Params): { label: string; isNegative: boolean } | undefined => {
  if (!limitFiat || !marketFiat) {
    return undefined;
  }

  const limit = new BigNumber(limitFiat);
  const market = new BigNumber(marketFiat);
  if (
    !limit.isFinite() ||
    limit.lte(0) ||
    !market.isFinite() ||
    market.lte(0)
  ) {
    return undefined;
  }

  const percent = limit.minus(market).dividedBy(market).multipliedBy(100);
  const displayPercent = percent.abs().toFixed(2);
  if (!percent.isFinite() || displayPercent === '0.00') {
    return undefined;
  }

  if (executionType === LimitOrderExecutionType.SELL) {
    if (percent.lte(threshold)) {
      return undefined;
    }

    return {
      label: strings('bridge.limit.from_market_above', {
        percent: displayPercent,
      }),
      isNegative: false,
    };
  }

  if (percent.gt(-threshold)) {
    return undefined;
  }

  return {
    label: strings('bridge.limit.from_market', {
      percent: displayPercent,
    }),
    isNegative: true,
  };
};
