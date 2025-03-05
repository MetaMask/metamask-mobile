import { RootState } from '..';

/**
 * Selects the user state
 */
export const selectUserState = (state: RootState) => state.user;

/**
 * Selects the userLoggedIn state
 */
export const selectUserLoggedIn = (state: RootState) => state.user.userLoggedIn;

/**
 * Selects the isControllersLoaded state
 */
export const selectIsControllersLoaded = (state: RootState) =>
  state.user.isControllersLoaded;
