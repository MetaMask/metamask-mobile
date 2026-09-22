import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import { selectPrimaryHDKeyring } from '../keyringController';

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
 * Selector that exposes the canonical profile ID of the session belonging to
 * the wallet's primary SRP.
 *
 * `srpSessionData` is persisted, keyed by keyring `metadata.id`, and is never
 * pruned when a keyring goes away, so its first entry can outlive the wallet
 * it was created for (e.g. after a wallet reset). Keying by the primary HD
 * keyring — the same key the AuthenticationController itself uses — instead of
 * the first map entry guarantees the resolved identity belongs to the live
 * wallet and not a reset-away one.
 *
 * Returns `undefined` when the identity is not knowable yet: signed out, no
 * session for the primary SRP, or the wallet is locked (`keyrings` is
 * `persist: false` and emptied by `setLocked()`).
 */
export const selectCanonicalProfileId = createSelector(
  selectAuthenticationControllerState,
  selectPrimaryHDKeyring,
  (
    authenticationControllerState: AuthenticationState,
    primaryHdKeyring,
  ): string | undefined => {
    const primaryEntropySourceId = primaryHdKeyring?.metadata?.id;
    if (!primaryEntropySourceId) {
      return undefined;
    }
    return (
      authenticationControllerState.srpSessionData?.[primaryEntropySourceId]
        ?.profile?.canonicalProfileId || undefined
    );
  },
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

/**
 * Selector that exposes the `needsSocialPairing` flag from the
 * `AuthenticationController` state.
 *
 * Used by `useAutoSignIn` to force a sign-in when a social-login wallet
 * still needs its social identifier paired to the SRP profile.
 *
 * Defaults to `true` when the field is absent from state — this mirrors the
 * controller's `defaultState` and matches `selectNeedsProfilePairing`.
 */
export const selectNeedsSocialPairing = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationState) =>
    authenticationControllerState.needsSocialPairing ?? true,
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
