import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { getUsdToFiatConversionRate } from '../../../../UI/Money/utils/moneyActivityFiat';

/** Converts USD-denominated primitive balances to the user's display currency. */
export function useFiatNormalizer() {
  const userCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const usdToFiatRate = getUsdToFiatConversionRate(currencyRates);

  const toUserCurrency = useCallback(
    (amount: number): number | undefined => {
      if (!Number.isFinite(amount)) return 0;
      if (userCurrency.toLowerCase() === 'usd') return amount;
      if (usdToFiatRate === undefined) {
        return undefined;
      }
      return amount * usdToFiatRate;
    },
    [usdToFiatRate, userCurrency],
  );

  return { toUserCurrency, userCurrency };
}
