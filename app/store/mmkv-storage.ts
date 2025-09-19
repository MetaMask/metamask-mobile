import { MMKV } from 'react-native-mmkv';

// Singleton MMKV instance for app persistence
let mmkvInstance: MMKV | null = null;

function getMMKV(): MMKV {
  if (!mmkvInstance) {
    mmkvInstance = new MMKV({ id: 'metamask-persist' });
  }
  return mmkvInstance;
}

export const MMKVStorage = {
  async getItem(key: string): Promise<string | null> {
    const mmkv = getMMKV();
    const value = mmkv.getString(key);
    return value ?? null;
  },

  async setItem(key: string, value: string): Promise<boolean | void> {
    const mmkv = getMMKV();
    mmkv.set(key, value);
    return true;
  },

  async removeItem(key: string): Promise<void> {
    const mmkv = getMMKV();
    mmkv.delete(key);
  },

  async getAllKeys(): Promise<string[]> {
    const mmkv = getMMKV();
    return mmkv.getAllKeys();
  },
};


