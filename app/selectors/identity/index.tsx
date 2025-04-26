import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import { createDeepEqualSelector } from '../util';

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

// User Storage
export const selectIsProfileSyncingEnabled = createDeepEqualSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState?.isProfileSyncingEnabled,
);
export const selectIsProfileSyncingUpdateLoading = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState.isProfileSyncingUpdateLoading,
);

export const selectIsAccountSyncingReadyToBeDispatched = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageState) =>
    userStorageControllerState.isAccountSyncingReadyToBeDispatched,
);
