import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import I18n from '../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import { getIntlNumberFormatter } from '../../../../util/intl';

type FiatFormatter = (fiatAmount: BigNumber) => string;

/**
 * Returns a function that formats a fiat amount as a localized string.
 *
 * Example usage:
 *
 * ```
 * const formatFiat = useFiatFormatter();
 * const formattedAmount = formatFiat(new BigNumber(1000));
 * ```
 *
 * @returns A function that takes a fiat amount as a number and returns a formatted string.
 */
const useFiatFormatter = (): FiatFormatter => {
  const fiatCurrency = useSelector(selectCurrentCurrency);

  return (fiatAmount: BigNumber) => {
    const hasDecimals = !fiatAmount.isInteger();

    const isSmall =
      fiatAmount.toFixed(2, BigNumber.ROUND_DOWN) === '0.00' &&
      !fiatAmount.isZero();

    const value = isSmall ? 0.01 : fiatAmount.toFixed();
    let result: string;

    try {
      result = getIntlNumberFormatter(I18n.locale, {
        style: 'currency',
        currency: fiatCurrency,
        minimumFractionDigits: hasDecimals ? 2 : 0,
        // string is valid parameter for format function
        // for some reason it gives TS issue
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format#number
      }).format(value as unknown as number);
    } catch (error) {
      // Fallback for unknown or unsupported currencies
      result = `${value} ${fiatCurrency}`;
    }

    result = result.replace('US$', '$');

    return isSmall ? `<${result}` : result;
  };
};

export default useFiatFormatter;
