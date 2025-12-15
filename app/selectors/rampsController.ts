import { createSelector } from 'reselect';
import { EngineState } from './types';

/**
 * Returns the RampsController state from the engine.
 */
export const selectRampsControllerState = createSelector(
  (state: EngineState) => state.engine.backgroundState.RampsController,
  (rampsControllerState) => rampsControllerState,
);

/**
 * Returns the user's geolocation from the RampsController state.
 */
export const selectGeolocation = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.geolocation ?? null,
);
