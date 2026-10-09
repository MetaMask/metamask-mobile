import type {
  ProfileControllerState,
  Profile,
  XProfile,
} from '@metamask/profile-controller';
import { createSelector } from 'reselect';
import type { RootState } from '../reducers';

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

export const selectProfileControllerXProfile = createSelector(
  selectProfileControllerState,
  (state): XProfile | undefined => state?.xProfile,
);
