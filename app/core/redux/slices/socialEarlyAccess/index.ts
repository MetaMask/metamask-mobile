import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
  selectSessionProfileId,
} from '../../../../selectors/identity';

export interface SocialEarlyAccessSliceState {
  /** Profile the early-access answer belongs to. */
  profileId: string | null;
  /** `hasAccess` from the profile API's `GET /v1/early-access`. */
  hasAccess: boolean;
}

export const initialState: SocialEarlyAccessSliceState = {
  profileId: null,
  hasAccess: false,
};

const name = 'socialEarlyAccess';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    setSocialEarlyAccess: (
      state,
      action: PayloadAction<{ profileId: string; hasAccess: boolean }>,
    ) => {
      state.profileId = action.payload.profileId;
      state.hasAccess = action.payload.hasAccess;
    },
    clearSocialEarlyAccess: () => initialState,
  },
});

const { actions, reducer } = slice;

export default reducer;

const selectSocialEarlyAccessState = (state: RootState) =>
  state[name] ?? initialState;

/**
 * Whether the currently signed-in profile has Social early access.
 * Validates sign-in state and matches the stored profile against the current
 * canonical or session profile at read time so a persisted grant never leaks
 * when signed out, while identity is pending, or after switching profiles.
 */
export const selectHasSocialEarlyAccess = (state: RootState): boolean => {
  const { hasAccess, profileId } = selectSocialEarlyAccessState(state);
  if (!hasAccess || !profileId || !selectIsSignedIn(state)) {
    return false;
  }
  const currentProfileId =
    selectCanonicalProfileId(state) || selectSessionProfileId(state);
  return Boolean(currentProfileId && profileId === currentProfileId);
};

/** Profile the stored early-access answer belongs to. */
export const selectSocialEarlyAccessProfileId = (
  state: RootState,
): string | null => selectSocialEarlyAccessState(state).profileId;

export const { setSocialEarlyAccess, clearSocialEarlyAccess } = actions;
