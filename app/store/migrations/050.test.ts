import migrate, { storage as mmkvStorage } from './050';
import DefaultPreference from 'react-native-default-preference';

const defaultPreferenceItems: { [key: string]: string } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
};

describe('Migration #50', () => {
  it('migrates asyncStorage values to mmkv ', async () => {
    // set defaultPreferenceItems to AsyncStorage
    for (const key in defaultPreferenceItems) {
      await DefaultPreference.set(key, defaultPreferenceItems[key]);
    }

    await migrate({});

    // make sure all AsyncStorage items are removed
    const keyValues = await DefaultPreference.getAll();
    // loop through all AsyncStorage keys and make sure empty
    for (const key of Object.keys(keyValues)) {
      expect(await DefaultPreference.get(key)).toBeNull();
    }

    // now check that all MMKV values match original AsyncStorage values
    for (const key in defaultPreferenceItems) {
      expect(mmkvStorage.getString(key)).toEqual(defaultPreferenceItems[key]);
    }
  });
});
