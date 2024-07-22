import migrate from './050';
import FilesystemStorage from 'redux-persist-filesystem-storage';

const fileSystemStorageItems: { [key: string]: string } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
};

jest.mock('redux-persist-filesystem-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(true)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(),
}));

describe('Migration #50', () => {
  it('expect to clean filesystem storage', async () => {
    // set FilesystemStorage to mmkv
    for (const key in fileSystemStorageItems) {
      await FilesystemStorage.setItem(key, fileSystemStorageItems[key], false);
    }

    await migrate({});

    // make sure all FilesystemStorage items are removed
    const keys = await FilesystemStorage.getAllKeys();

    expect(keys?.length).toBe(0);
  });
});
