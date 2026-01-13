import { createSelector } from 'reselect';
import { createRequestSelector } from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

/**
 * Selects the RampsController state from Redux.
 */
export const selectRampsControllerState = createSelector(
  (state: RootState) => state.engine.backgroundState.RampsController,
  (rampsControllerState) => rampsControllerState,
);

/**
 * Selects the user's geolocation from state.
 */
export const selectGeolocation = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.geolocation ?? null,
);

/**
 * Selects the user's region from state.
 */
export const selectUserRegion = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.userRegion ?? null,
);

/**
 * Selects the geolocation request state
 */
export const selectGeolocationRequest = createRequestSelector<
  RootState,
  string
>(selectRampsControllerState, 'updateGeolocation', []);

/**
 * Selects the getCountries request state
 */
export const selectGetCountriesRequest = createRequestSelector<
  RootState,
  import('@metamask/ramps-controller').Country[]
>(selectRampsControllerState, 'getCountries', ['buy']);
