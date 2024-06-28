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
      let value = this.storage.getString(key);
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
      const response = this.storage.set(key, value);
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
      const response = this.storage.delete(key);
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
    this.storage.clearAll();
  }
}

export default new AsyncStorageWrapper();
