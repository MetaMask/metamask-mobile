import { BigNumber } from 'bignumber.js';
import I18n from '../../locales/i18n';
import { getIntlNumberFormatter } from './intl';

/**
 * Resolves the fraction-digit options passed to Intl.
 *
 * By default the decimals follow the value: integers render bare ("$1") and
 * everything else gets two decimals ("$1.23"). When `fractionDigits` is given
 * the amount always renders with exactly that many decimals, which callers use
 * to keep a screen consistent regardless of the values it happens to receive.
 * Both bounds are pinned because currencies whose Intl default is zero decimals
 * (e.g. JPY) reject a minimum above their maximum.
 */
const getFractionDigitOptions = (
  hasDecimals: boolean,
  fractionDigits?: number,
) => {
  if (fractionDigits === undefined) {
    return { minimumFractionDigits: hasDecimals ? 2 : 0 };
  }

  return {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
};

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
const formatFiat = (
  fiatAmount: BigNumber,
  currency?: string,
  fractionDigits?: number,
) => {
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
      ...getFractionDigitOptions(hasDecimals, fractionDigits),
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
