import DefaultPreference from 'react-native-default-preference';
import { captureException } from '@sentry/react-native';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export default async function migrate(state: unknown) {
  const keyValues = await DefaultPreference.getAll();
  for (const key of Object.keys(keyValues)) {
    try {
      if (keyValues[key] != null) {
        storage.set(key, keyValues[key]);
      }
      await DefaultPreference.clear(key);
    } catch (error) {
      captureException(
        `Failed to migrate key "${key}" from DefaultPreference to MMKV! Error: ${error}`,
      );
    }
  }

  return state;
}
