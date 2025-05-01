import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureErrorException } from '../../util/sentry';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export default async function migrate(state: unknown) {
  const keys = await AsyncStorage.getAllKeys();
  for (const key of keys) {
    try {
      const value = await AsyncStorage.getItem(key);

      if (value != null) {
        storage.set(key, value);
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      captureErrorException(
        new Error(
          `Failed to migrate key "${key}" from AsyncStorage to MMKV! Error: ${error}`,
        ),
      );
    }
  }

  return state;
}
