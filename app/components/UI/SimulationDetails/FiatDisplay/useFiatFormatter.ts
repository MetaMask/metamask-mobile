import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import I18n from '../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';

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

    try {
      return new Intl.NumberFormat(I18n.locale, {
        style: 'currency',
        currency: fiatCurrency,
        minimumFractionDigits: hasDecimals ? 2 : 0,
        // string is valid parameter for format function
        // for some reason it gives TS issue
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format#number
      }).format(fiatAmount.toFixed() as unknown as number);
    } catch (error) {
      // Fallback for unknown or unsupported currencies
      return `${fiatAmount.toFixed()} ${fiatCurrency}`;
    }
  };
};

export default useFiatFormatter;
