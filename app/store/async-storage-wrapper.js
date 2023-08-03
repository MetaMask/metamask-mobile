import ReadOnlyNetworkStore from '../util/test/network-store';
import { AsyncStorage } from '@react-native-async-storage/async-storage';

const isTest = process.env.IS_TEST === 'true';

class AsyncStorageWrapper {
  constructor() {
    this.storage = isTest ? ReadOnlyNetworkStore : AsyncStorage;
  }

  async getItem(key) {
    return this.storage.getItem(key);
  }

  async setItem(key, value) {
    if (!isTest) {
      return this.storage.setItem(key, value);
    }
    // Do nothing in test mode
  }

  async removeItem(key) {
    if (!isTest) {
      return this.storage.removeItem(key);
    }
    // Do nothing in test mode
  }
}

export default new AsyncStorageWrapper();
