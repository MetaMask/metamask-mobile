import type {
  ProfileControllerState,
  Profile,
  XProfile,
} from '@metamask/profile-controller';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import { selectCanonicalProfileId } from './identity';

/** Gets the ProfileController state from engine.backgroundState. */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState | undefined =>
  state.engine.backgroundState.ProfileController;

/**
 * Gets the current MetaMask profile, or undefined when none exists. Hides a
 * persisted profile whose id does not match the current session's canonical
 * profile id (stale session guard).
 */
export const selectProfileControllerProfile = createSelector(
  [selectProfileControllerState, selectCanonicalProfileId],
  (state, canonicalProfileId): Profile | undefined => {
    const profile = state?.profile?.profileId ? state.profile : undefined;
    if (
      profile?.profileId &&
      canonicalProfileId &&
      profile.profileId !== canonicalProfileId
    ) {
      return undefined;
    }
    return profile;
  },
);

/**
 * Gets the linked X (Twitter) profile, or undefined when none is connected.
 * Not stale-session guarded: ProfileController clears the X fields itself.
 */
export const selectProfileControllerXProfile = createSelector(
  selectProfileControllerState,
  (state): XProfile | undefined => state?.xProfile,
);

/**
 * Whether the user's profile is connected to X: a linked X profile exists in
 * state, or the current (stale-session-guarded) profile reports a live
 * connection.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfileControllerProfile, selectProfileControllerXProfile],
  (profile, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profile?.connectedToX),
);
