import { createSelector } from 'reselect';
import {
  getDefaultProfileControllerState,
  type ProfileControllerState,
  type Profile,
  type XProfile,
} from '@metamask/profile-controller';
import { RootState } from '../reducers';
import { selectCanonicalProfileId } from './identity';

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
 * The persisted profile may belong to a different session/backend (e.g. after
 * a wallet reset or account switch), and ProfileController only clears its X
 * fields when the profile ids match. When the current session exposes a
 * canonical profile id that differs from the stored profile's id, the stale
 * profile is hidden.
 *
 * @param state - The Redux state.
 * @returns The profile, or undefined.
 */
export const selectProfile = createSelector(
  [selectProfileControllerState, selectCanonicalProfileId],
  (profileControllerState, canonicalProfileId): Profile | undefined => {
    const profile = profileControllerState.profile?.profileId
      ? profileControllerState.profile
      : undefined;
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
 * exists in state, or when the current profile reports a live X connection
 * (the connection can also be established from another client).
 *
 * The connectedToX flag is only read through the guarded `selectProfile`, so
 * a persisted profile left over from a different session/backend
 * (ProfileController only clears X fields for matching profile ids) cannot
 * keep the connection reported as live.
 *
 * @param state - The Redux state.
 * @returns True if connected to X, false otherwise.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfile, selectXProfile],
  (profile, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profile?.connectedToX),
);
