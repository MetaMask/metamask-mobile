import type {
  ProfileControllerState,
  Profile,
  XProfile,
} from '@metamask/profile-controller';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';

/** Gets the ProfileController state from engine.backgroundState. */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState | undefined =>
  state.engine.backgroundState.ProfileController;

export const selectProfileControllerProfile = createSelector(
  selectProfileControllerState,
  (state): Profile | undefined => {
    const profile = state?.profile;
    return profile?.profileId ? profile : undefined;
  },
);

/**
 * Gets the linked X (Twitter) profile, or undefined when none is connected.
 */
export const selectProfileControllerXProfile = createSelector(
  selectProfileControllerState,
  (state): XProfile | undefined => state?.xProfile,
);

/**
 * Whether the user's profile is connected to X: a linked X profile exists in
 * state, or the current profile reports a live connection.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfileControllerProfile, selectProfileControllerXProfile],
  (profile, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profile?.connectedToX),
);
