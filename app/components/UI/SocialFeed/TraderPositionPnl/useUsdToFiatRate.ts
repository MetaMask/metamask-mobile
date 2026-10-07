import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { UsdToFiatRate } from './fiat';

/**
 * Returns one USD-to-display-currency rate snapshot for the current render.
 */
export function useUsdToFiatRate(): UsdToFiatRate {
  const currency = useSelector(selectCurrentCurrency);
  const normalizedCurrency = currency.toUpperCase();
  const rate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  if (normalizedCurrency === 'USD') {
    return { currency: 'USD', rate: 1 };
  }

  return {
    currency: normalizedCurrency,
    rate: rate > 0 ? rate : undefined,
  };
}
