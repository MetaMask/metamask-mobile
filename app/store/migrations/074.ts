import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 74: set isAccountSyncingEnabled to true
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 74;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      hasProperty(state, 'engine') &&
      hasProperty(state.engine, 'backgroundState') &&
      hasProperty(state.engine.backgroundState, 'UserStorageController') &&
      isObject(state.engine.backgroundState.UserStorageController)
    ) {
      state.engine.backgroundState.UserStorageController.isAccountSyncingEnabled =
        true;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 074: setting isAccountSyncingEnabled to true failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
