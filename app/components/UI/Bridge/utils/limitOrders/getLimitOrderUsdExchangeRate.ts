import { BigNumber } from 'bignumber.js';
import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';

const USD_CURRENCY = 'usd';
// A rate of at least one keeps two decimals, which is three or more
// significant digits.
const RATE_DECIMALS = 2;
// A rate below one keeps as many significant digits instead, since two decimals
// would round it by up to half its value (e.g. 0.0149 to 0.01) and down to zero
// for a display currency worth far more than a dollar.
const RATE_SIGNIFICANT_DIGITS = 3;

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
 * @returns The rate of one US dollar in the display currency, or `undefined`
 * when the display currency is USD or no rate can price it.
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

  const rate = usdToFiatRate.gte(1)
    ? usdToFiatRate.toFixed(RATE_DECIMALS, BigNumber.ROUND_HALF_UP)
    : usdToFiatRate
        .precision(RATE_SIGNIFICANT_DIGITS, BigNumber.ROUND_HALF_UP)
        .toFixed();

  return {
    rate: formatAmountWithLocaleSeparators(rate),
    currency: currentCurrency.toUpperCase(),
  };
};
