/**
 * Determines whether the current user is geo-eligible for mUSD conversion.
 *
 * Defaults to BLOCKING when geolocation is unknown to ensure regulatory
 * compliance. Users in blocked regions cannot bypass restrictions by having
 * geolocation fail to load.
 */

import { createSelector } from 'reselect';
import { selectMusdConversionBlockedCountries } from './featureFlags';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';

export const selectIsMusdConversionGeoEligible = createSelector(
  selectMusdConversionBlockedCountries,
  getDetectedGeolocation,
  (blockedCountries, geolocation): boolean => {
    const userCountry = geolocation?.toUpperCase().split('-')[0] ?? null;

    if (!userCountry) return false;
    if (blockedCountries.length === 0) return true;

    return blockedCountries.every(
      (blocked) => !userCountry.startsWith(blocked.toUpperCase()),
    );
  },
);
