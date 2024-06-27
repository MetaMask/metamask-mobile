import { ensureValidState } from './util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV();

export const hasMigratedFromAsyncStorage = storage.getBoolean(
  'hasMigratedFromAsyncStorage',
);

export default async function migrate(state: unknown) {
  console.log('Migrating from AsyncStorage -> MMKV...');
  const start = global.performance.now();

  if (!ensureValidState(state, 49)) {
    return state;
  }

  const keys = await AsyncStorage.getAllKeys();
  console.log('***kylan*** allKeys: ', keys);
  for (const key of keys) {
    try {
      const value = await AsyncStorage.getItem(key);

      if (value != null) {
        if (['true', 'false'].includes(value)) {
          storage.set(key, value === 'true');
        } else {
          storage.set(key, value);
        }

        AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(
        `Failed to migrate key "${key}" from AsyncStorage to MMKV!`,
        error,
      );
      throw error;
    }
  }

  storage.set('hasMigratedFromAsyncStorage', true);

  const end = global.performance.now();
  console.log(`Migrated from AsyncStorage -> MMKV in ${end - start}ms!`);

  return state;
}
