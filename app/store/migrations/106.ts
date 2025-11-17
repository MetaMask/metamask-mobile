import { captureException } from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';
import { ensureValidState } from './util';

const migrationVersion = 106;

/**
 * Migration 106: Clean up PPOM MMKV storage after removing PPOM local execution
 *
 * This migration removes any lingering PPOM data stored in MMKV storage
 * when the PPOM controller is removed from the codebase.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const ppomStorageId = 'PPOMDB';

    // Create MMKV instance with the same ID that was used by PPOM
    const ppomStorage = new MMKV({ id: ppomStorageId });

    // Get all keys from the PPOM storage
    const allKeys = ppomStorage.getAllKeys();

    if (allKeys.length > 0) {
      // Clear all data from PPOM storage
      ppomStorage.clearAll();
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to clean up PPOM storage: ${error}`,
      ),
    );
  }

  return state;
}
