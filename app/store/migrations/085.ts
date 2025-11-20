import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

/**
 * Migration 85:
 *
 * This migration sets `isBackupAndSyncEnabled` and `isAccountSyncingEnabled` to true for all users.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 85;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      hasProperty(state.engine.backgroundState, 'UserStorageController') &&
      isObject(state.engine.backgroundState.UserStorageController)
    ) {
      state.engine.backgroundState.UserStorageController.isBackupAndSyncEnabled = true;
      state.engine.backgroundState.UserStorageController.isAccountSyncingEnabled = true;
    } else {
      captureException(
        new Error(
          `Migration ${migrationVersion}: UserStorageController not found in state`,
        ),
      );
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: set isBackupAndSyncEnabled and isAccountSyncingEnabled to true for all users failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
