import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isE2E } from '../util/test/utils';
import { MMKV } from 'react-native-mmkv';

/**
 * Wrapper class for MMKV.
 * (Will want to eventuall re-name since no longer async once migratted to mmkv)
 */
class StorageWrapper {
  private static instance: StorageWrapper | null = null;
  private storage: typeof ReadOnlyNetworkStore | MMKV;

  private constructor() {
    /**
     * The underlying storage implementation.
     * Use `ReadOnlyNetworkStore` in test mode otherwise use `AsyncStorage`.
     */
    this.storage = isE2E ? ReadOnlyNetworkStore : new MMKV();
  }

  async getItem(key: string) {
    try {
      // asyncStorage returns null for no value
      // mmkv returns undefined for no value
      // therefore must return null if no value is found
      // to keep app behavior consistent
      const value = (await this.storage.getString(key)) ?? null;
      return value;
    } catch (error) {
      if (isE2E) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.getItem(key);
      }
      throw error;
    }
  }

  async setItem(key: string, value: string) {
    try {
      if (typeof value !== 'string')
        throw new Error(
          `MMKV value must be a string, received value ${value} for key ${key}`,
        );
      return await this.storage.set(key, value);
    } catch (error) {
      if (isE2E) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.setItem(key, value);
      }
      throw error;
    }
  }

  async removeItem(key: string) {
    try {
      return await this.storage.delete(key);
    } catch (error) {
      if (isE2E) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.removeItem(key);
      }
      throw error;
    }
  }

  async clearAll() {
    await this.storage.clearAll();
  }

  static getInstance() {
    if (!StorageWrapper.instance) {
      StorageWrapper.instance = new StorageWrapper();
    }
    return StorageWrapper.instance;
  }
}

export default StorageWrapper.getInstance();
