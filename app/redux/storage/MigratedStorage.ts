import FilesystemStorage from 'redux-persist-filesystem-storage';
import Logger from '../../util/Logger';
import { Platform } from 'react-native';

const createMigratedStorage = (reducerName: string) => ({
  async getItem(key: string) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using the new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get persisted ${key}: ${reducerName}`,
      });
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Platform.OS === 'ios');
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set persisted ${key}: ${reducerName}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove persisted ${key}: ${reducerName}`,
      });
    }
  },
});

export default createMigratedStorage;
