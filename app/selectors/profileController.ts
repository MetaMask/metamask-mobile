import { createSelector } from 'reselect';
import {
  getDefaultProfileControllerState,
  type ProfileControllerState,
  type Profile,
  type XProfile,
} from '@metamask/profile-controller';
import { RootState } from '../reducers';

const DEFAULT_PROFILE_CONTROLLER_STATE = getDefaultProfileControllerState();

/**
 * Gets the ProfileController state from engine.backgroundState.
 *
 * @param state - The Redux state.
 * @returns The ProfileController state, or the package default when absent.
 */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState =>
  state.engine?.backgroundState?.ProfileController ??
  DEFAULT_PROFILE_CONTROLLER_STATE;

/**
 * Gets the current MetaMask profile, or undefined when no profile exists yet.
 *
 * @param state - The Redux state.
 * @returns The profile, or undefined.
 */
export const selectProfile = createSelector(
  selectProfileControllerState,
  (profileControllerState): Profile | undefined =>
    profileControllerState.profile?.profileId
      ? profileControllerState.profile
      : undefined,
);

/**
 * Gets the linked X (Twitter) profile, or undefined when none is connected.
 *
 * @param state - The Redux state.
 * @returns The linked X profile, or undefined.
 */
export const selectXProfile = createSelector(
  selectProfileControllerState,
  (profileControllerState): XProfile | undefined =>
    profileControllerState?.xProfile,
);

/**
 * Whether the user's profile is connected to X. True when a linked X profile
 * exists in state, or when the profile reports a live X connection (the
 * connection can also be established from another client).
 *
 * @param state - The Redux state.
 * @returns True if connected to X, false otherwise.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfileControllerState, selectXProfile],
  (profileControllerState, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profileControllerState?.profile?.connectedToX),
);
