import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 100: Remove old and unused UserStorageController properties
 * Delete `hasAccountSyncingSyncedAtLeastOnce` from `UserStorageController`
 * Delete `isAccountSyncingReadyToBeDispatched` from `UserStorageController`
 * Delete `isAccountSyncingInProgress` from `UserStorageController`
 * from the app storage
 */

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, 100)) {
    return state;
  }

  const userStorageControllerState =
    state.engine.backgroundState.UserStorageController;

  if (!isObject(userStorageControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 100: Invalid UserStorageController state error: '${typeof userStorageControllerState}'`,
      ),
    );
    return state;
  }

  if ('hasAccountSyncingSyncedAtLeastOnce' in userStorageControllerState) {
    delete userStorageControllerState.hasAccountSyncingSyncedAtLeastOnce;
  }

  if ('isAccountSyncingReadyToBeDispatched' in userStorageControllerState) {
    delete userStorageControllerState.isAccountSyncingReadyToBeDispatched;
  }

  if ('isAccountSyncingInProgress' in userStorageControllerState) {
    delete userStorageControllerState.isAccountSyncingInProgress;
  }
  if ('isAccountSyncingInProgress' in userStorageControllerState) {
    delete userStorageControllerState.isAccountSyncingInProgress;
  }

  return state;
};

export default migration;
