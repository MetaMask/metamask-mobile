import { RootState } from '..';

/**
 * Selects the user state
 */
export const selectUserState = (state: RootState) => state.user;

/**
 * Selects the servicesReady state
 */
export const selectServicesReady = (state: RootState) =>
  state.user.servicesReady;
