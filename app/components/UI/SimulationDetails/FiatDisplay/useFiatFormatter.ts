import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import formatFiat from '../../../../util/formatFiat';

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
const useFiatFormatter = ({
  currency,
}: {
  currency?: string;
} = {}): FiatFormatter => {
  const currencyCurrency = useSelector(selectCurrentCurrency);
  const fiatCurrency = currency ?? currencyCurrency;

  return (fiatAmount: BigNumber) => formatFiat(fiatAmount, fiatCurrency);
};

export default useFiatFormatter;
