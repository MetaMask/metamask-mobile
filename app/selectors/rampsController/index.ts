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
 * Selects the user's region from state.
 */
export const selectUserRegion = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.userRegion ?? null,
);

/**
 * Selects the user region request state
 */
export const selectUserRegionRequest = createRequestSelector<RootState, string>(
  selectRampsControllerState,
  'updateUserRegion',
  [],
);

/**
 * Selects the user's geolocation (alias for userRegion).
 */
export const selectGeolocation = selectUserRegion;

/**
 * Selects the geolocation request state (alias for userRegionRequest).
 */
export const selectGeolocationRequest = selectUserRegionRequest;
