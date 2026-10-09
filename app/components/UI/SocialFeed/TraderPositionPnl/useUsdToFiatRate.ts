import { useSelector } from 'react-redux';
import {
  selectCurrentCurrency,
  selectUsdToFiatRate,
} from '../../../../selectors/currencyRateController';

export interface UsdToFiatRate {
  currency: string;
  /** Null when the selected currency is not USD and no positive rate is available. */
  rate: number | null;
}

/**
 * One USD→fiat snapshot for the current render.
 * USD is always rate 1. A 0 from the rate map is treated as missing.
 */
export const useUsdToFiatRate = (): UsdToFiatRate => {
  const currency = (useSelector(selectCurrentCurrency) || 'usd').toLowerCase();
  const rate = useSelector(selectUsdToFiatRate);

  if (currency === 'usd') {
    return { currency: 'usd', rate: 1 };
  }

  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    return { currency, rate: null };
  }

  return { currency, rate };
};
