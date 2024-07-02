import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isE2E } from '../util/test/utils';
import { MMKV } from 'react-native-mmkv';

/**
 * Wrapper class for AsyncStorage.
 * (Will want to eventuall re-name since no longer async once migratted to mmkv)
 */
class AsyncStorageWrapper {
  constructor() {
    /**
     * The underlying storage implementation.
     * Use `ReadOnlyNetworkStore` in test mode otherwise use `AsyncStorage`.
     */
    this.storage = isE2E ? ReadOnlyNetworkStore : new MMKV();
  }

  async getItem(key) {
    try {
      // asyncStorage returns null for no value
      // mmkv returns undefined for no value
      // therefore must return null if no value is found
      // to keep app behavior consistent
      let value = (await this.storage.getString(key)) ?? null;
      if (!value) {
        const asyncStorageValue = await AsyncStorage.getItem(key);
        if (asyncStorageValue) {
          value = asyncStorageValue;
          this.storage.set(key, value);
        }
      }
      return value;
    } catch (error) {
      if (isE2E) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.getItem(key);
      }
      throw error;
    }
  }

  async setItem(key, value) {
    try {
      const response = await this.storage.set(key, value);
      return response;
    } catch (error) {
      if (isE2E) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.setItem(key, value);
      }
      throw error;
    }
  }

  async removeItem(key) {
    try {
      const response = await this.storage.delete(key);
      return response;
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
}

export default new AsyncStorageWrapper();
