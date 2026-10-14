import { BigNumber } from 'bignumber.js';
import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';

const USD_CURRENCY = 'usd';
// Like every other fiat value on the limit order screens, the rate keeps two
// decimals at most.
const RATE_DECIMALS = 2;

/**
 * Exchange rate of one US dollar in the user's display currency, e.g.
 * `{ rate: '85.05', currency: 'RUB' }` for "1 USD = 85.05 RUB".
 */
export interface LimitOrderUsdExchangeRate {
  /**
   * Amount of the display currency one US dollar is worth, locale formatted.
   */
  rate: string;
  /**
   * ISO 4217 code of the display currency, e.g. "RUB".
   */
  currency: string;
}

/**
 * Resolves the rate shown next to a fiat limit price whenever the display
 * currency is not USD, since the order itself is placed at a USD price.
 *
 * @param currentCurrency - The user's display currency.
 * @param fiatToUsdRate - USD value of one unit of the display currency.
 * @returns The rate of one US dollar in the display currency, to two decimal
 * places, or `undefined` when the display currency is USD, no rate can price
 * it, or two decimals cannot show it.
 */
export const getLimitOrderUsdExchangeRate = (
  currentCurrency: string | undefined,
  fiatToUsdRate: number | undefined,
): LimitOrderUsdExchangeRate | undefined => {
  if (
    !currentCurrency ||
    currentCurrency.toLowerCase() === USD_CURRENCY ||
    !fiatToUsdRate
  ) {
    return undefined;
  }

  const usdToFiatRate = new BigNumber(1).dividedBy(fiatToUsdRate);
  if (!usdToFiatRate.isFinite() || usdToFiatRate.lte(0)) {
    return undefined;
  }

  const rate = usdToFiatRate.decimalPlaces(
    RATE_DECIMALS,
    BigNumber.ROUND_HALF_UP,
  );
  // A rate that two decimals round to zero, e.g. for a display currency worth
  // far more than a dollar, would read as "1 USD = 0.00", so it is left out.
  if (rate.lte(0)) {
    return undefined;
  }

  return {
    rate: formatAmountWithLocaleSeparators(rate.toFixed(RATE_DECIMALS)),
    currency: currentCurrency.toUpperCase(),
  };
};
