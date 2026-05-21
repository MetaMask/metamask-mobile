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
 * Selector that exposes the `needsProfilePairing` flag from the
 * `AuthenticationController` state.
 *
 * Used by `useAutoSignIn` to drive the auto-sign-in / pairing cycle: when
 * `needsProfilePairing` is `true`, the gate fires and `useAutoSignIn`
 * dispatches `signIn(true)` so `performSignIn` re-runs and pairing executes
 * (or retries on the next eligible trigger if it fails).
 *
 * Defaults to `true` when the field is absent from state — this mirrors the
 * controller's `defaultState`, ensures the upgrade path works even before a
 * `:stateChange` event has populated the field, and matches the controller's
 * own JSDoc guidance for handling `undefined`.
 */
export const selectNeedsProfilePairing = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationState) =>
    authenticationControllerState.needsProfilePairing ?? true,
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
