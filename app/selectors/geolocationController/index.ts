import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import { getDetectedGeolocation } from '../../reducers/fiatOrders';
import { isAsiaGeolocationLocation } from '../../util/region/isAsiaGeolocationLocation';
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
  getDetectedGeolocation,
  (geolocation): boolean => isAsiaGeolocationLocation(geolocation),
);

/**
 * Whether Social Copy trade may be shown.
 *
 * False for the UK and until GeolocationController has a completed location.
 */
export const selectIsCopyTradeAllowed = createSelector(
  selectGeolocationLocation,
  selectGeolocationStatus,
  (location, status): boolean =>
    isCopyTradeAllowedForGeolocation(location, status),
);
