import { createSelector } from 'reselect';
import { selectMoneyMovementNeobank } from '../featureFlagController/moneyAccount';
import { selectGeolocationLocation } from '../geolocationController';
import { selectKycPinnedCountryAlpha2 } from '../kycController';

/**
 * Location that decides the Virtual Bank Account market, in order:
 * 1. `regionOverride` from `moneyMovementNeobank`.
 * 2. The country the stored KYC session was started under, so a later IP
 * change (for example a VPN) does not move the account to another market.
 * 3. The GeolocationController IP location, such as `BR` or `US-CA`.
 *
 * The Settings region picker (`RampsController.userRegion`) is not consulted.
 */
export const selectVbaEffectiveLocation = createSelector(
  selectMoneyMovementNeobank,
  selectKycPinnedCountryAlpha2,
  selectGeolocationLocation,
  (neobank, pinnedCountry, ipLocation): string | undefined =>
    neobank.regionOverride ?? pinnedCountry ?? ipLocation ?? undefined,
);
