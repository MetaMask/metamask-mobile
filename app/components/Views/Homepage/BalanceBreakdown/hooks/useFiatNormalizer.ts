import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';

/** Converts USD-denominated primitive balances to the user's display currency. */
export function useFiatNormalizer() {
  const userCurrency = useSelector(selectCurrentCurrency);

  // USD rate in user currency
  const usdRate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  const toUserCurrency = useCallback(
    (amount: number): number | undefined => {
      if (!Number.isFinite(amount)) return 0;
      if (userCurrency.toLowerCase() === 'usd') return amount;
      if (!Number.isFinite(usdRate) || usdRate <= 0) {
        return undefined;
      }
      return amount * usdRate;
    },
    [usdRate, userCurrency],
  );

  return { toUserCurrency, userCurrency };
}
