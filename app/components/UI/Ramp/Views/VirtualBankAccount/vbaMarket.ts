import { createSelector } from 'reselect';
import {
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import {
  getVbaMarketForCountry,
  type VbaMarket,
} from '../../../../../util/region/getVbaSourceCurrency';

/**
 * Open market serving the effective location, for code that runs outside
 * React. Resolves the same market as `useVbaEligibility`.
 */
export const selectVbaMarket = createSelector(
  [selectMoneyMovementNeobank, selectNeobankMarkets, selectGeolocationLocation],
  ({ regionOverride }, markets, location): VbaMarket | undefined =>
    getVbaMarketForCountry(markets, regionOverride ?? location),
);
