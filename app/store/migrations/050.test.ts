import migrate, { storage as mmkvStorage } from './050';
import FilesystemStorage from 'redux-persist-filesystem-storage';

const fileSystemStorageItems: { [key: string]: string } = {
  valueA: 'a',
  valueB: 'true',
  valueC: 'myValue',
};

describe('Migration #50', () => {
  it('migrates filesystem storage values to mmkv ', async () => {
    // set FilesystemStorage to mmkv
    for (const key in fileSystemStorageItems) {
      await FilesystemStorage.setItem(key, fileSystemStorageItems[key]);
    }

    await migrate({});

    // make sure all FilesystemStorage items are removed
    const keys = await FilesystemStorage.getAllKeys();
    // loop through all FilesystemStorage keys and make sure empty
    for (const key of keys) {
      expect(await FilesystemStorage.getItem(key)).toBeNull();
    }

    // now check that all MMKV values match original FilesystemStorage values
    for (const key in asyncStorageItems) {
      expect(mmkvStorage.getString(key)).toEqual(fileSystemStorageItems[key]);
    }
  });
});
