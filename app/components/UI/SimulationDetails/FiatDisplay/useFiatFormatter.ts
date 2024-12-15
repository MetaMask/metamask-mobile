import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import I18n from '../../../../../locales/i18n';

type FiatFormatter = (fiatAmount: number) => string;

/**
 * Returns a function that formats a fiat amount as a localized string.
 *
 * Example usage:
 *
 * ```
 * const formatFiat = useFiatFormatter();
 * const formattedAmount = formatFiat(1000);
 * ```
 *
 * @returns A function that takes a fiat amount as a number and returns a formatted string.
 */
const useFiatFormatter = (): FiatFormatter => {
  const fiatCurrency = useSelector(selectCurrentCurrency);

  return (fiatAmount: number) => {
    try {
      return new Intl.NumberFormat(I18n.locale, {
        style: 'currency',
        currency: fiatCurrency,
      }).format(fiatAmount);
    } catch (error) {
      // Fallback for unknown or unsupported currencies
      return `${fiatAmount} ${fiatCurrency}`;
    }
  };
};

export default useFiatFormatter;
