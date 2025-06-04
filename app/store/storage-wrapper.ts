import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isE2E } from '../util/test/utils';
import { MMKV } from 'react-native-mmkv';
import {
  EXISTING_USER,
  FRESH_INSTALL_CHECK_DONE,
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../constants/storage';
import Logger from '../util/Logger';
import { Platform } from 'react-native';
/**
 * Wrapper class for MMKV.
 * Provides a unified interface for storage operations, with fallback to AsyncStorage in E2E test mode.
 *
 * @example
 * // Import the StorageWrapper instance
 * import StorageWrapper from './StorageWrapper';
 *
 * // Set an item
 * await StorageWrapper.setItem('user_id', '12345');
 *
 * // Get an item
 * const userId = await StorageWrapper.getItem('user_id');
 * console.log(userId); // Outputs: '12345'
 *
 * // Remove an item
 * await StorageWrapper.removeItem('user_id');
 *
 * // Clear all items
 * await StorageWrapper.clearAll();
 */
class StorageWrapper {
  private static instance: StorageWrapper | null = null;
  private storage: typeof ReadOnlyNetworkStore | MMKV;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the storage based on the environment (E2E test or production).
   */
  private constructor() {
    /**
     * The underlying storage implementation.
     * Use `ReadOnlyNetworkStore` in test mode otherwise use `AsyncStorage`.
     */
    this.storage = isE2E ? ReadOnlyNetworkStore : new MMKV();
  }

  /**
   * Retrieves an item from storage.
   * @param key - The key of the item to retrieve.
   * @returns A promise that resolves with the value of the item, or null if not found.
   * @throws Will throw an error if retrieval fails (except in E2E mode, where it falls back to AsyncStorage).
   *
   * @example
   * const value = await StorageWrapper.getItem('my_key');
   * if (value !== null) {
   *   console.log('Retrieved value:', value);
   * } else {
   *   console.log('No value found for key: my_key');
   * }
   */
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

  /**
   * Sets an item in storage.
   * @param key - The key under which to store the value.
   * @param value - The value to store. Must be a string.
   * @throws Will throw an error if the value is not a string or if setting fails (except in E2E mode, where it falls back to AsyncStorage).
   *
   * @example
   * try {
   *   await StorageWrapper.setItem('user_preferences', JSON.stringify({ theme: 'dark' }));
   *   console.log('User preferences saved successfully');
   * } catch (error) {
   *   console.error('Failed to save user preferences:', error);
   * }
   */
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

  /**
   * Removes an item from storage.
   * @param key - The key of the item to remove.
   * @throws Will throw an error if removal fails (except in E2E mode, where it falls back to AsyncStorage).
   *
   * @example
   * try {
   *   await StorageWrapper.removeItem('temporary_data');
   *   console.log('Temporary data removed successfully');
   * } catch (error) {
   *   console.error('Failed to remove temporary data:', error);
   * }
   */
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

  /**
   * Removes an item from storage.
   * @param key - The key of the item to remove.
   * @throws Will throw an error if removal fails (except in E2E mode, where it falls back to AsyncStorage).
   *
   * @example
   * try {
   *   await StorageWrapper.clearAll();
   *   console.log('All storage data cleared successfully');
   * } catch (error) {
   *   console.error('Failed to clear storage data:', error);
   * }
   */
  async clearAll() {
    await this.storage.clearAll();
  }

  /**
   * Gets the singleton instance of StorageWrapper.
   * @returns The StorageWrapper instance.
   */
  static getInstance() {
    if (!StorageWrapper.instance) {
      StorageWrapper.instance = new StorageWrapper();
    }
    return StorageWrapper.instance;
  }

  /**
   * Checks if this is a fresh install with restored MMKV data from a backup on iOS devices.
   * If so, clears the MMKV storage to ensure a clean state.
   */
  static handleFreshInstallWithRestoredData = () => {
    (async () => {
      try {
        if (Platform.OS !== 'ios') return;

        const storage = StorageWrapper.getInstance();
        const alreadyChecked = await AsyncStorage.getItem(
          FRESH_INSTALL_CHECK_DONE,
        );

        Logger.log('StorageWrapper: Checking for restored data', {
          alreadyChecked,
          platform: Platform.OS,
        });

        if (!alreadyChecked) {
          // Check if MMKV has user data (persists through backup)
          const hasMMKVUserData = await storage.getItem(EXISTING_USER);
          Logger.log('StorageWrapper: MMKV user data check', {
            hasMMKVUserData,
          });

          // Check if AsyncStorage has any app-specific marker (gets cleared on restore)
          const hasAsyncStorageMarker = await AsyncStorage.getItem(
            'APP_LAUNCHED_BEFORE',
          );
          Logger.log('StorageWrapper: AsyncStorage marker check', {
            hasAsyncStorageMarker,
          });

          // Get current app version
          const currentVersion = await storage.getItem(CURRENT_APP_VERSION);
          const lastVersion = await storage.getItem(LAST_APP_VERSION);
          Logger.log('StorageWrapper: Version check', {
            currentVersion,
            lastVersion,
          });

          // If this is an app update (currentVersion !== lastVersion) or a restore (hasMMKVUserData && hasAsyncStorageMarker === null)
          if (
            currentVersion !== lastVersion ||
            (hasMMKVUserData && hasAsyncStorageMarker === null)
          ) {
            Logger.log('StorageWrapper: Clearing MMKV storage', {
              reason: currentVersion !== lastVersion ? 'version_change' : 'restore',
            });
            // Clear MMKV storage to ensure a clean state
            await storage.clearAll();
          }

          // Set markers for future checks
          await AsyncStorage.setItem('APP_LAUNCHED_BEFORE', 'true');
          await AsyncStorage.setItem(FRESH_INSTALL_CHECK_DONE, 'true');
          Logger.log('StorageWrapper: Set markers for future checks');
        }
      } catch (error) {
        Logger.error(error as Error, 'Error checking for restored data');
      }
    })();
  };
}

// Get the singleton instance
const storageWrapperInstance = StorageWrapper.getInstance();

// Create an enhanced instance that maintains the singleton pattern
const enhancedInstance = Object.assign(storageWrapperInstance, {
  handleFreshInstallWithRestoredData:
    StorageWrapper.handleFreshInstallWithRestoredData,
});

export default enhancedInstance;
