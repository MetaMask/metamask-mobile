import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

/**
 * Returns the RampsController state from the engine.
 */
export const selectRampsControllerState = createSelector(
  (state: RootState) => state.engine.backgroundState.RampsController,
  (rampsControllerState) => rampsControllerState,
);

/**
 * Returns the user's geolocation from the RampsController state.
 */
export const selectGeolocation = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.geolocation ?? null,
);
