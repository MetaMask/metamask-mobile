import FilesystemStorage from 'redux-persist-filesystem-storage';

import Logger from '../../util/Logger';
import { Platform } from 'react-native';

const MigratedStorage = {
  async getItem(key: string) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to run migration' });
      throw new Error('Failed Filesystem Storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Platform.OS === 'ios');
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to set item' });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to remove item' });
    }
  },
};

export default MigratedStorage;
