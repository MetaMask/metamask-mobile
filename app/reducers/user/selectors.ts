import { RootState } from '..';

/**
 * Selects the user state
 */
export const selectUserState = (state: RootState) => state.user;

/**
 * Selects the appServicesReady state
 */
export const selectAppServicesReady = (state: RootState) =>
  state.user.appServicesReady;

/**
 * Selects the userLoggedIn state
 */
export const selectUserLoggedIn = (state: RootState) => state.user.userLoggedIn;
