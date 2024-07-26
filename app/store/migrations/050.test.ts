import migrate from './050';
import DefaultPreference from 'react-native-default-preference';

const defaultPreferenceItems: { [key: string]: string | null } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
  valueD: null,
};

jest.mock('../async-storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('react-native-default-preference', () => ({
  set: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn().mockReturnValue({}),
}));

describe('Migration #50', () => {
  it('migrates asyncStorage values to mmkv ', async () => {
    for (const key in defaultPreferenceItems) {
      //@ts-expect-error - The null value is for test purposes
      await DefaultPreference.set(key, defaultPreferenceItems[key]);
    }

    await migrate({});

    const keyValues = await DefaultPreference.getAll();

    expect(Object.keys(keyValues).length).toBe(0);
  });
});
