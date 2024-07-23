import DefaultPreference from 'react-native-default-preference';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../async-storage-wrapper';

/**
 * The goal of this migration is set all the data that was on DefaultPreference to MMKV
 * and clean DefaultPreference data
 * @param state
 * @returns state
 */
export default async function migrate(state: unknown) {
  const keyValues = await DefaultPreference.getAll();
  if (keyValues) {
    for (const key of Object.keys(keyValues)) {
      try {
        if (keyValues[key] != null) {
          StorageWrapper.setItem(key, keyValues[key]);
        }
        await DefaultPreference.clear(key);
      } catch (error) {
        captureException(
          `Migration 50: Failed to migrate key "${key}" from DefaultPreference to MMKV! Error: ${error}`,
        );
      }
    }
    captureException('Migration 50: DefaultPreference do not have data');
  }
  return state;
}
