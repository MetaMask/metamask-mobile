import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../../reducers';

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
 * The stored early-access answer. `useSocialEarlyAccess` clears it when the
 * current profile changes, so it always belongs to the current profile.
 */
export const selectHasSocialEarlyAccess = (state: RootState): boolean =>
  selectSocialEarlyAccessState(state).hasAccess;

/** Profile the stored early-access answer belongs to. */
export const selectSocialEarlyAccessProfileId = (
  state: RootState,
): string | null => selectSocialEarlyAccessState(state).profileId;

export const { setSocialEarlyAccess, clearSocialEarlyAccess } = actions;
