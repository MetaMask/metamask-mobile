import { useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../Money/utils/moneyActivityFiat';
import { UsdToFiatRate } from './fiat';

/**
 * Returns one USD-to-display-currency rate snapshot for the current render.
 */
export function useUsdToFiatRate(): UsdToFiatRate {
  const currency = useSelector(selectCurrentCurrency);
  const normalizedCurrency = currency.toUpperCase();
  const currencyRates = useSelector(selectCurrencyRates);

  if (normalizedCurrency === 'USD') {
    return { currency: 'USD', rate: 1 };
  }

  return {
    currency: normalizedCurrency,
    rate: getUsdToFiatConversionRate(currencyRates),
  };
}
