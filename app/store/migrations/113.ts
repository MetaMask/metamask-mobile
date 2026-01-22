import { cloneDeep } from 'lodash';
import { ensureValidState, ValidState } from './util';
import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';
import Device from '../../util/device';

export const migrationVersion = 113;

/**
 * This migration does:
 * - Remove the sourceCode property from each snap in the SnapController state.
 * - Store the sourceCode in the file system storage in order to allow the StorageService to fetch the snap source code.
 *
 * @param versionedState - The versioned state to migrate.
 * @returns The migrated state.
 */
export default async function migrate(versionedState: unknown) {
  const state = cloneDeep(versionedState);

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    return await transformState(state);
  } catch (error) {
    console.error(error);
    const newError = new Error(
      `Migration #${migrationVersion}: ${getErrorMessage(error)}`,
    );
    captureException(newError);

    // Return the original state if migration fails to avoid breaking the app
    return versionedState;
  }
}

/**
 * Transforms the state to remove the sourceCode property from each snap in the SnapController state and store the sourceCode in the file system storage.
 * @param state - The state to transform.
 * @returns The transformed state.
 */
async function transformState(state: ValidState) {
  if (!hasProperty(state.engine.backgroundState, 'SnapController')) {
    captureException(
      new Error(`Migration ${migrationVersion}: SnapController not found.`),
    );

    return state;
  }

  const snapControllerState = state.engine.backgroundState.SnapController;

  if (!isObject(snapControllerState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: SnapController is not an object: ${typeof snapControllerState}`,
      ),
    );

    return state;
  }

  if (!hasProperty(snapControllerState, 'snaps')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: SnapController missing property snaps.`,
      ),
    );

    return state;
  }

  if (!isObject(snapControllerState.snaps)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: SnapController.snaps is not an object: ${typeof snapControllerState.snaps}`,
      ),
    );

    return state;
  }

  Object.values(
    snapControllerState.snaps as Record<string, Record<string, unknown>>,
  ).forEach(async (snap) => {
    const sourceCode = snap.sourceCode as string;

    const fullKey = `${STORAGE_KEY_PREFIX}SnapController:${snap.id}`;

    await FilesystemStorage.setItem(fullKey, sourceCode, Device.isIos());

    delete snap.sourceCode;
  });

  return state;
}
