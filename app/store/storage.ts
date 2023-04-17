import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Logger from '../util/Logger';
import Device from '../util/device';

/**
 * Storage adapter for Redux Persist.
 * Responsible for getting, setting, and removing data from storage.
 * Currently uses FileSystemStorage.
 */
const storageAdapter = {
  async getItem(key: string) {
    try {
      const res = (await FilesystemStorage.getItem(key)) as string;
      if (res) {
        // Using new storage system
        return res;
      }
    } catch {
      storageAdapter;
      //Fail silently
    }
    // Using old storage system, should only happen once
    try {
      const res = await AsyncStorage.getItem(key);
      if (res) {
        // Using old storage system
        return res;
      }
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(error, { message: 'Failed to run migration' });
      }
      throw new Error('Failed async storage storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(error, { message: 'Failed to set item' });
      }
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(error, { message: 'Failed to remove item' });
      }
    }
  },
};

export default storageAdapter;
