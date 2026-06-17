/**
 * Determines whether the current user is geo-eligible for the Money account.
 *
 * Defaults to BLOCKING when geolocation is unknown to ensure regulatory
 * compliance. Users in blocked regions cannot bypass restrictions by having
 * geolocation fail to load.
 */

import { createSelector } from 'reselect';
import { selectMoneyAccountGeoBlockedCountries } from './featureFlags';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import {
  selectIsCardAuthenticated,
  selectHasCardholderAccounts,
} from '../../../../selectors/cardController';

const US_COUNTRY_CODE = 'US';

export const selectIsMoneyAccountGeoEligible = createSelector(
  selectMoneyAccountGeoBlockedCountries,
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

/**
 * Whether the user's detected geolocation resolves to the United States.
 *
 * The Ramps geolocation API returns codes like "US" or "US-CA"
 * (country-region), so only the leading country segment is compared.
 * Defaults to `false` when geolocation is unknown or still loading.
 */
export const selectIsUserInUS = createSelector(
  getDetectedGeolocation,
  (geolocation): boolean =>
    (geolocation?.toUpperCase().split('-')[0] ?? null) === US_COUNTRY_CODE,
);

/**
 * Gate for the Money account education / warning screen.
 *
 * Shown when a US user has neither authenticated with the card service nor
 * become a cardholder, so they see the explainer before proceeding.
 *
 * Cardholder status is evaluated wallet-wide (any account) rather than for the
 * currently selected account, so an existing card customer never sees the
 * first-time education screen after switching accounts.
 */
export const selectShouldShowMoneyEducation = createSelector(
  selectIsUserInUS,
  selectIsCardAuthenticated,
  selectHasCardholderAccounts,
  (isInUS, isCardAuthenticated, hasCardholderAccounts): boolean =>
    isInUS && !isCardAuthenticated && !hasCardholderAccounts,
);
