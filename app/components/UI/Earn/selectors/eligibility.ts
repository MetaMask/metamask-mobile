/**
 * Determines whether the current user is geo-eligible for mUSD conversion.
 *
 * Defaults to BLOCKING when geolocation is unknown to ensure regulatory
 * compliance. Users in blocked regions cannot bypass restrictions by having
 * geolocation fail to load.
 */

import { createSelector } from 'reselect';
import {
  selectMusdConversionBlockedCountries,
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from './featureFlags';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';

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

export const selectIsEarnSectionEligible = createSelector(
  [
    pooledStakingSelectors.selectEligibility,
    selectIsMoneyAccountVisible,
    selectPooledStakingEnabledFlag,
    selectStablecoinLendingEnabledFlag,
    selectTrxStakingEnabled,
  ],
  (
    isEarnEligible,
    isMoneyAccountVisible,
    isPooledStakingEnabled,
    isStablecoinLendingEnabled,
    isTrxStakingEnabled,
  ) =>
    isMoneyAccountVisible ||
    (isEarnEligible &&
      (isPooledStakingEnabled ||
        isStablecoinLendingEnabled ||
        isTrxStakingEnabled)),
);
