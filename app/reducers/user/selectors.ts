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

/**
 * Selects the passwordSet state
 */
export const selectPasswordSet = (state: RootState) => state.user.passwordSet;

/**
 * Selects the seedphraseBackedUp state
 */
export const selectSeedphraseBackedUp = (state: RootState) =>
  state.user.seedphraseBackedUp;

/**
 * Selects the existingUser state
 */
export const selectExistingUser = (state: RootState) => state.user.existingUser;

/**
 * Selects the isConnectionRemoved state
 */
export const selectIsConnectionRemoved = (state: RootState) =>
  state.user.isConnectionRemoved;

/**
 * Selects the multichainAccountsIntroModalSeen state
 */
export const selectMultichainAccountsIntroModalSeen = (state: RootState) =>
  state.user?.multichainAccountsIntroModalSeen ?? false;

/**
 * Selects the musdConversionEducationSeen state
 */
export const selectMusdConversionEducationSeen = (state: RootState) =>
  state.user.musdConversionEducationSeen;
