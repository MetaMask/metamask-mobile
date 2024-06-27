import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export const hasMigratedFromAsyncStorage = storage.getString(
  'hasMigratedFromAsyncStorage',
);

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
      console.error(
        `Failed to migrate key "${key}" from AsyncStorage to MMKV!`,
        error,
      );
      throw error;
    }
  }

  storage.set('hasMigratedFromAsyncStorage', 'true');

  return state;
}
