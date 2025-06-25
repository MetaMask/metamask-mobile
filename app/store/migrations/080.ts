import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 80: Update profile sync state properties to backup and sync ones
 * Copy `isProfileSyncingEnabled` to `isBackupAndSyncEnabled`
 * Copy `isProfileSyncingUpdateLoading` to `isBackupAndSyncUpdateLoading`
 * Delete `isProfileSyncingEnabled` from `UserStorageController`
 * Delete `isProfileSyncingUpdateLoading` from `UserStorageController`
 * from the app storage
 */

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, 80)) {
    return state;
  }

  const userStorageControllerState =
    state.engine.backgroundState.UserStorageController;

  if (!isObject(userStorageControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 80: Invalid UserStorageController state error: '${typeof userStorageControllerState}'`,
      ),
    );
    return state;
  }

  if ('isProfileSyncingEnabled' in userStorageControllerState) {
    userStorageControllerState.isBackupAndSyncEnabled =
      userStorageControllerState.isProfileSyncingEnabled;
    delete userStorageControllerState.isProfileSyncingEnabled;
  }

  if ('isProfileSyncingUpdateLoading' in userStorageControllerState) {
    userStorageControllerState.isBackupAndSyncUpdateLoading =
      userStorageControllerState.isProfileSyncingUpdateLoading;
    delete userStorageControllerState.isProfileSyncingUpdateLoading;
  }

  return state;
};

export default migration;
