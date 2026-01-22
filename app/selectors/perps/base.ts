import { RootState } from '../../reducers';

/**
 * Selects the PerpsController state from the root state.
 * @param state - The root Redux state
 * @returns The PerpsController state or undefined
 */
export const selectPerpsControllerState = (state: RootState) =>
  state.engine?.backgroundState?.PerpsController;
