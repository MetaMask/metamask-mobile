import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import { getDetectedGeolocation } from '../../reducers/fiatOrders';
import { isAsiaGeolocationLocation } from '../../util/region/isAsiaGeolocationLocation';

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
