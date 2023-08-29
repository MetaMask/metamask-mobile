import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTest } from '../util/test/utils';

/**
 * Wrapper class for AsyncStorage.
 */
class AsyncStorageWrapper {
  constructor() {
    /**
     * The underlying storage implementation.
     * Use `ReadOnlyNetworkStore` in test mode otherwise use `AsyncStorage`.
     */
    this.storage = isTest ? ReadOnlyNetworkStore : AsyncStorage;
  }

  async getItem(key) {
    try {
      return await this.storage.getItem(key);
    } catch (error) {
      if (isTest) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return AsyncStorage.getItem(key);
      }
      throw error;
    }
  }

  async setItem(key, value) {
    try {
      return await this.storage.setItem(key, value);
    } catch (error) {
      if (isTest) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.setItem(key, value);
      }
      throw error;
    }
  }

  async removeItem(key) {
    try {
      return await this.storage.removeItem(key);
    } catch (error) {
      if (isTest) {
        // Fall back to AsyncStorage in test mode if ReadOnlyNetworkStore fails
        return await AsyncStorage.removeItem(key);
      }
      throw error;
    }
  }
}

export default new AsyncStorageWrapper();
