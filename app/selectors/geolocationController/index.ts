import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import { isAsiaGeolocationLocation } from '../../util/region/isAsiaGeolocationLocation';
import { selectSocialCopyTradeGeoBlockedRegions } from '../featureFlagController/socialCopyTrade';
import { isCopyTradeAllowedForGeolocation } from '../../util/region/isCopyTradeAllowedForGeolocation';

export const selectGeolocationControllerState = (state: RootState) =>
  state.engine?.backgroundState?.GeolocationController;

export const selectGeolocationLocation = (state: RootState) =>
  state.engine?.backgroundState?.GeolocationController?.location;

export const selectGeolocationStatus = (state: RootState) =>
  state.engine?.backgroundState?.GeolocationController?.status;

/**
 * Whether the user's detected geolocation resolves to one of the targeted
 * Asian markets (JP, KR, VN, TW, CN).
 *
 * Defaults to `false` when geolocation is unknown or still loading.
 */
export const selectIsUserInAsia = createSelector(
  selectGeolocationLocation,
  (location): boolean => isAsiaGeolocationLocation(location),
);

/**
 * Whether Social Copy trade may be shown.
 *
 * False until GeolocationController has a completed location, and false when
 * that location matches `socialCopyTradeGeoBlockedCountries` (UK by default).
 */
export const selectIsCopyTradeAllowed = createSelector(
  selectGeolocationLocation,
  selectGeolocationStatus,
  selectSocialCopyTradeGeoBlockedRegions,
  (location, status, blockedRegions): boolean =>
    isCopyTradeAllowedForGeolocation(location, status, blockedRegions),
);
