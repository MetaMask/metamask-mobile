import {
  createRequestSelector,
  type RampsControllerState,
} from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

/**
 * Extracts RampsController state from Redux.
 * This is the single point of integration with the mobile state shape.
 */
const getRampsState = (state: RootState): RampsControllerState | undefined =>
  state.engine.backgroundState.RampsController;

/**
 * Selects the user's geolocation directly from state.
 */
export const selectGeolocation = (state: RootState): string | null =>
  getRampsState(state)?.geolocation ?? null;

/**
 * Selects the geolocation request state (from updateGeolocation method).
 */
export const selectGeolocationRequest = createRequestSelector<
  RootState,
  string
>(getRampsState, 'updateGeolocation', []);
