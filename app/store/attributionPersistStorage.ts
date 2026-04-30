import { MMKV } from 'react-native-mmkv';

const MMKV_ID = 'redux-persist-attribution';

const storage = new MMKV({ id: MMKV_ID });

/**
 * redux-persist storage adapter backed by MMKV, separate from root
 * FilesystemStorage persist.
 */
export const attributionPersistStorage = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(storage.getString(key) ?? null),
  setItem: (key: string, value: string): Promise<boolean> => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  removeItem: (key: string): Promise<void> => {
    storage.delete(key);
    return Promise.resolve();
  },
};
