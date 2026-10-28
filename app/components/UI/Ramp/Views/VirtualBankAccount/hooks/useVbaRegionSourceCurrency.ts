import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../../reducers';
import { selectGeolocationLocation } from '../../../../../../selectors/geolocationController';
import { selectMoneyMovementNeobank } from '../../../../../../selectors/featureFlagController/moneyAccount';
import {
  getVbaSourceCurrencyForCountry,
  type VbaSourceCurrency,
} from '../../../../../../util/region/getVbaSourceCurrency';

/**
 * Fiat a new virtual bank account is created in, from the effective location
 * (`moneyMovementNeobank.regionOverride` when set, otherwise the IP country).
 * Undefined with `chooseCurrency` on, where only the picked currency may
 * create an account, or when the region has no VBA currency.
 *
 * @param state - Redux root state.
 * @returns The region's VBA currency, or undefined.
 */
export const selectVbaRegionSourceCurrency = (
  state: RootState,
): VbaSourceCurrency | undefined => {
  const {
    chooseCurrency,
    regionCurrencies,
    regions,
    defaultCurrency,
    regionOverride,
  } = selectMoneyMovementNeobank(state);
  if (chooseCurrency) {
    return undefined;
  }
  return getVbaSourceCurrencyForCountry(
    regionOverride ?? selectGeolocationLocation(state),
    regionCurrencies,
    regions,
    defaultCurrency,
  );
};

/** Hook form of {@link selectVbaRegionSourceCurrency}. */
export const useVbaRegionSourceCurrency = (): VbaSourceCurrency | undefined =>
  useSelector(selectVbaRegionSourceCurrency);
