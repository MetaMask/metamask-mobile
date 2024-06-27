import migrate from './049';

const asyncStorageItems: { [key: string]: string } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
};

const mmkvStorageItems: { [key: string]: string } = {};

// mock AsyncStorageLibrary
// jest.mock('@react-native-async-storage/async-storage', () => ({
//   getAllKeys: jest.fn(() => Object.keys(asyncStorageItems)),
//   getItem: jest.fn((key) => asyncStorageItems[key]),
//   setItem: jest.fn((key, value) => {
//     console.log('AsyncStorage setting', key, value)
//     asyncStorageItems[key] = value;
//   }),
//   removeItem: jest.fn((key) => {
//     console.log('AsyncStorage deleting', key)
//     delete asyncStorageItems[key];
//   }),
// }));

// create mock of AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    getAllKeys: jest.fn(() => Object.keys(asyncStorageItems)),
    getItem: jest.fn((key) => asyncStorageItems[key]),
    setItem: jest.fn((key, value) => {
      console.log('AsyncStorage setting', key, value)
      asyncStorageItems[key] = value;
    }),
    removeItem: jest.fn((key) => {
      console.log('AsyncStorage deleting', key)
      delete asyncStorageItems[key];
    }),
  };
});

// mock MMKVLibrary
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn((key) => mmkvStorageItems[key]),
    getBoolean: jest.fn((key) => mmkvStorageItems[key]),
    set: jest.fn((key, value) => {
      console.log('mmkv setting', key, value)
      mmkvStorageItems[key] = value;
    }),
  })),
}));

describe('Migration #49', () => {
  it('migrates asyncStorage values to mmkv ', async () => {
    const initialAsyncItems = { ...asyncStorageItems };
    migrate({});

    console.log('asyncStorageItems: ', asyncStorageItems);
    expect(asyncStorageItems).toEqual({});
    for (const key in initialAsyncItems) {
      expect(mmkvStorageItems[key]).toEqual(initialAsyncItems[key]);
    }
  });
});
