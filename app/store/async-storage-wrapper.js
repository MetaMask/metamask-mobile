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
    return this.storage.getItem(key);
  }

  async setItem(key, value) {
    return this.storage.setItem(key, value);
  }

  async removeItem(key) {
    return this.storage.removeItem(key);
  }
}

export default new AsyncStorageWrapper();
