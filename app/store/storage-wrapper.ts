import ReadOnlyNetworkStore from '../util/test/network-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isE2E } from '../util/test/utils';
import { MMKV } from 'react-native-mmkv';
import { EventEmitter2 } from 'eventemitter2';

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
class StorageWrapper extends EventEmitter2 {
  private static instance: StorageWrapper | null = null;
  private storage: typeof ReadOnlyNetworkStore | MMKV;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the storage based on the environment (E2E test or production).
   */
  private constructor() {
    super();
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
  async setItem(key: string, value: string, opts = { emitEvent: true }) {
    try {
      if (typeof value !== 'string')
        throw new Error(
          `MMKV value must be a string, received value ${value} for key ${key}`,
        );

      const result = await this.storage.set(key, value);
      if (opts.emitEvent) {
        this.emit(`storage.changed.${key}`, { key, value, action: 'set' });
      }
      return result;
    } catch (error) {
      if (isE2E) {
        const result = await AsyncStorage.setItem(key, value);
        if (opts.emitEvent) {
          this.emit(`storage.changed.${key}`, { key, value, action: 'set' });
        }
        return result;
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
   * Subscribe to specific key changes
   * @param key - The storage key to watch
   * @param callback - Function to call when the key's value changes
   * @returns Unsubscribe function
   */
  onKeyChange(
    key: string,
    callback: (event: { key: string; value: string; action: 'set' }) => void,
  ) {
    this.on(`storage.changed.${key}`, callback);
    return () => this.off(`storage.changed.${key}`, callback);
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
}

export default StorageWrapper.getInstance();
