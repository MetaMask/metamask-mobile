import migrate, { storage as mmkvStorage } from './049';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStorageItems: { [key: string]: string } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
};

describe('Migration #49', () => {
  it('migrates asyncStorage values to mmkv ', async () => {
    // set asyncStorageItems to AsyncStorage
    for (const key in asyncStorageItems) {
      await AsyncStorage.setItem(key, asyncStorageItems[key]);
    }

    await migrate({});

    // make sure all AsyncStorage items are removed
    const keys = await AsyncStorage.getAllKeys();
    // loop through all AsyncStorage keys and make sure empty
    for (const key of keys) {
      expect(await AsyncStorage.getItem(key)).toBeNull();
    }

    // now check that all MMKV values match original AsyncStorage values
    for (const key in asyncStorageItems) {
      expect(mmkvStorage.getString(key)).toEqual(asyncStorageItems[key]);
    }
  });
});
