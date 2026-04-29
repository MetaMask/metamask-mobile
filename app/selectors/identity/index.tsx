import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';

type AuthenticationState =
  AuthenticationController.AuthenticationControllerState;
type UserStorageState = UserStorageController.UserStorageControllerState;

const selectAuthenticationControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.AuthenticationController ??
  AuthenticationController.defaultState;

const selectUserStorageControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.UserStorageController ??
  UserStorageController.defaultState;

// Authentication
export const selectIsSignedIn = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationState) =>
    authenticationControllerState.isSignedIn,
);

/**
 * Selector to determine if profile pairing has completed at least once on this device.
 *
 * Monotonic flag — only ever transitions false → true, never reset.
 * Used by `useAutoProfilePairing` to decide whether the initial pairing call
 * is still needed after install/upgrade.
 */
export const selectHasPairedAtLeastOnce = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationState) =>
    authenticationControllerState.hasPairedAtLeastOnce ?? false,
);

// User Storage
export const selectIsBackupAndSyncEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState?.isBackupAndSyncEnabled,
);

export const selectIsBackupAndSyncUpdateLoading = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState.isBackupAndSyncUpdateLoading,
);

export const selectIsAccountSyncingEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState?.isAccountSyncingEnabled,
);

export const selectIsContactSyncingEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState?.isContactSyncingEnabled,
);
