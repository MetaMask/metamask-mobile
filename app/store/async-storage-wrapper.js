import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTest } from '../util/test/utils';

class AsyncStorageWrapper {
  constructor() {
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
