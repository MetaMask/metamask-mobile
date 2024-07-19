import FilesystemStorage from 'redux-persist-filesystem-storage';
import { captureException } from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export default async function migrate(state: unknown) {
  let keys;
  try {
    keys = await FilesystemStorage.getAllKeys();

    if (!keys) {
      captureException(
        'FATAL ERROR: Migration 50: Not able to get keys from filesystem storage',
      );
      return state;
    }
  } catch (error) {
    captureException(
      'FATAL ERROR: Migration 50: Error getting keys from filesystem storage',
    );
    return state;
  }
  for (const key of keys) {
    try {
      const value = await FilesystemStorage.getItem(key);

      if (value != null) {
        storage.set(key, value);
      }
      await FilesystemStorage.removeItem(key);
    } catch (error) {
      captureException(
        `Failed to migrate key "${key}" from filesystem storage to MMKV! Error: ${error}`,
      );
    }
  }

  return state;
}
