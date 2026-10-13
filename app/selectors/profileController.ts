import type {
  ProfileControllerState,
  Profile,
  XProfile,
} from '@metamask/profile-controller';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import { selectCanonicalProfileId } from './identity';

/**
 * Gets the ProfileController state from engine.backgroundState.
 *
 * @param state - The Redux state.
 * @returns The ProfileController state, or undefined when absent.
 */
export const selectProfileControllerState = (
  state: RootState,
): ProfileControllerState | undefined =>
  state.engine.backgroundState.ProfileController;

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
 *
 * Note: the X profile is not guarded against a stale persisted session the
 * way the profile selector is; ProfileController clears the X fields itself
 * when the stored profile id matches the current session's profile id.
 *
 * @param state - The Redux state.
 * @returns The linked X profile, or undefined.
 */
export const selectProfileControllerXProfile = createSelector(
  selectProfileControllerState,
  (state): XProfile | undefined => state?.xProfile,
);

/**
 * Whether the user's profile is connected to X. True when a linked X profile
 * exists in state, or when the current profile reports a live X connection
 * (the connection can also be established from another client).
 *
 * The connectedToX flag is only read through the guarded
 * `selectProfileControllerProfile`, so a persisted profile left over from a
 * different session/backend (ProfileController only clears X fields for
 * matching profile ids) cannot keep the connection reported as live.
 *
 * @param state - The Redux state.
 * @returns True if connected to X, false otherwise.
 */
export const selectIsConnectedToX = createSelector(
  [selectProfileControllerProfile, selectProfileControllerXProfile],
  (profile, xProfile): boolean =>
    Boolean(xProfile) || Boolean(profile?.connectedToX),
);
