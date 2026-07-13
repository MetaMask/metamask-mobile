import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

/**
 * Returns a stable `toUserCurrency(amount, fromSymbol)` function that converts
 * an amount denominated in `fromSymbol` (e.g. 'usd', 'eth') to the user's
 * selected display currency using CurrencyRateController rates.
 *
 * Special cases:
 * - `fromSymbol === 'usdc'` is treated as 1:1 with USD (v1 depeg-ignored assumption).
 * - `fromSymbol` that is already the user currency → passthrough (rate 1).
 */
export function useFiatNormalizer() {
  const userCurrency = useSelector(selectCurrentCurrency);

  // USD rate in user currency
  const usdRate = useSelector((state: RootState) =>
    selectConversionRateBySymbol(state, 'usd'),
  );

  /**
   * Convert `amount` from `fromSymbol` denomination to the user's display currency.
   * Returns `amount` unchanged when rate is unavailable (safe default).
   */
  const toUserCurrency = useCallback(
    (amount: number, fromSymbol: 'usd' | 'usdc' | string): number => {
      if (!amount || !Number.isFinite(amount)) return 0;

      const sym = fromSymbol.toLowerCase();

      // Already user currency
      if (sym === userCurrency.toLowerCase()) return amount;

      // USDC treated as 1:1 USD (v1 simplification; see plan decision 5)
      if (sym === 'usdc' || sym === 'usd') {
        const rate = usdRate || 1;
        return amount * rate;
      }

      // Unknown symbol — return as-is rather than silently zero
      return amount;
    },
    [usdRate, userCurrency],
  );

  return { toUserCurrency, userCurrency };
}
