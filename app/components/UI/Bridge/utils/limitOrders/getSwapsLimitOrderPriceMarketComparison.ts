import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';

interface Params {
  limitFiat: string | undefined;
  marketFiat: number | undefined;
}

/**
 * Returns the signed market-comparison label for a quoted-token unit limit
 * price, whether the limit is above or below market.
 *
 * Hidden when the displayed percent rounds to 0.00.
 */
export const getSwapsLimitOrderPriceMarketComparison = ({
  limitFiat,
  marketFiat,
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

  const isNegative = percent.isNegative();

  return {
    label: strings(
      isNegative
        ? 'bridge.limit.from_market'
        : 'bridge.limit.from_market_above',
      { percent: displayPercent },
    ),
    isNegative,
  };
};
