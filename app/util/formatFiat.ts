import { BigNumber } from 'bignumber.js';
import I18n from '../../locales/i18n';
import { getIntlNumberFormatter } from './intl';

/**
 * Formats a fiat amount as a localized string.
 *
 * Example usage:
 *
 * ```
 * const formattedAmount = formatFiat(new BigNumber(1000), 'usd');
 * ```
 *
 * @returns A formatted string.
 */
const formatFiat = (fiatAmount: BigNumber, currency?: string) => {
  const hasDecimals = !fiatAmount.isInteger();

  const isSmall =
    fiatAmount.toFixed(2, BigNumber.ROUND_DOWN) === '0.00' &&
    !fiatAmount.isZero();

  const value = isSmall ? 0.01 : fiatAmount.toFixed();
  let result: string;

  try {
    result = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      // string is valid parameter for format function
      // for some reason it gives TS issue
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format#number
    }).format(value as unknown as number);
  } catch (error) {
    // Fallback for unknown or unsupported currencies
    result = `${value} ${currency}`;
  }

  return isSmall ? `<${result}` : result;
};

export default formatFiat;
