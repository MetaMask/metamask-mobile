import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';

const MAX_DISPLAY_PERCENT = 9999;

interface Params {
  limitFiat: string | undefined;
  marketFiat: number | undefined;
}

/**
 * Returns the signed market-comparison label for a quoted-token unit limit
 * price, whether the limit is above or below market.
 *
 * Hidden when the displayed percent rounds to 0.00. Capped at >+9999%; the
 * below-market side is bounded by -100% since the limit must be positive.
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
  const isCapped = percent.gt(MAX_DISPLAY_PERCENT);
  const displayPercent = isCapped
    ? String(MAX_DISPLAY_PERCENT)
    : percent.abs().toFixed(2);
  if (!percent.isFinite() || displayPercent === '0.00') {
    return undefined;
  }

  const isNegative = percent.isNegative();

  let labelKey = 'bridge.limit.from_market_above';
  if (isNegative) {
    labelKey = 'bridge.limit.from_market';
  } else if (isCapped) {
    labelKey = 'bridge.limit.from_market_above_capped';
  }

  return {
    label: strings(labelKey, { percent: displayPercent }),
    isNegative,
  };
};
