import {
  getDefaultProfileControllerState,
  type Profile,
  type ProfileControllerState,
  type XProfile,
} from '@metamask/profile-controller';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';

const EMPTY_PROFILE_CONTROLLER_STATE = getDefaultProfileControllerState();

/**
 * Leaf selector for ProfileController state.
 *
 * @param state - Redux state.
 * @returns The controller state, or the empty default before the controller hydrates.
 */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState =>
  state.engine.backgroundState.ProfileController ??
  EMPTY_PROFILE_CONTROLLER_STATE;

/**
 * The signed-in user's profile.
 *
 * Empty controller state (`profileId === ''`) means no profile has been created.
 *
 * @param controllerState - ProfileController state.
 * @returns The profile, or undefined.
 */
export const selectProfile = createSelector(
  selectProfileControllerState,
  (controllerState): Profile | undefined =>
    controllerState.profile.profileId === ''
      ? undefined
      : controllerState.profile,
);

/**
 * The X account linked to the signed-in user, when one has been stored.
 *
 * @param controllerState - ProfileController state.
 * @returns The X profile, or undefined.
 */
export const selectXProfile = createSelector(
  selectProfileControllerState,
  (controllerState): XProfile | undefined => controllerState.xProfile,
);
