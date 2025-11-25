import { ControllerInitFunction } from '../types';
import {
  StorageService,
  StorageServiceMessenger,
  StorageAdapter,
  STORAGE_KEY_PREFIX,
} from '@metamask/storage-service';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

/**
 * Mobile-specific storage adapter using FilesystemStorage.
 * This provides persistent storage for large controller data.
 *
 * Extension will provide its own adapter using IndexedDB.
 * Tests use InMemoryStorageAdapter (default when no storage provided).
 */
const mobileStorageAdapter: StorageAdapter = {
  /**
   * Get an item from filesystem storage.
   *
   * @param namespace - The controller namespace.
   * @param key - The data key.
   * @returns The value as a string, or null if not found.
   */
  async getItem(namespace: string, key: string): Promise<string | null> {
    try {
      // Build full key: storageService:namespace:key
      const fullKey = `${STORAGE_KEY_PREFIX}${namespace}:${key}`;
      const value = await FilesystemStorage.getItem(fullKey);
      return value ?? null;
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to get item: ${namespace}:${key}`,
      });
      return null;
    }
  },

  /**
   * Set an item in filesystem storage.
   *
   * @param namespace - The controller namespace.
   * @param key - The data key.
   * @param value - The string value to store.
   */
  async setItem(namespace: string, key: string, value: string): Promise<void> {
    try {
      // Build full key: storageService:namespace:key
      const fullKey = `${STORAGE_KEY_PREFIX}${namespace}:${key}`;
      await FilesystemStorage.setItem(fullKey, value, Device.isIos());
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to set item: ${namespace}:${key}`,
      });
      throw error;
    }
  },

  /**
   * Remove an item from filesystem storage.
   *
   * @param namespace - The controller namespace.
   * @param key - The data key.
   */
  async removeItem(namespace: string, key: string): Promise<void> {
    try {
      // Build full key: storageService:namespace:key
      const fullKey = `${STORAGE_KEY_PREFIX}${namespace}:${key}`;
      await FilesystemStorage.removeItem(fullKey);
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to remove item: ${namespace}:${key}`,
      });
      throw error;
    }
  },

  /**
   * Get all keys for a specific namespace.
   * Filters keys by namespace prefix and returns without prefix.
   *
   * @param namespace - The namespace to get keys for.
   * @returns Array of keys (without prefix) for this namespace.
   */
  async getAllKeys(namespace: string): Promise<string[]> {
    try {
      const allKeys = await FilesystemStorage.getAllKeys();

      if (!allKeys) {
        return [];
      }

      const prefix = `${STORAGE_KEY_PREFIX}${namespace}:`;

      return allKeys
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length));
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to get keys for ${namespace}`,
      });
      return [];
    }
  },

  /**
   * Clear all items for a specific namespace.
   *
   * @param namespace - The namespace to clear.
   */
  async clear(namespace: string): Promise<void> {
    try {
      const allKeys = await FilesystemStorage.getAllKeys();

      if (!allKeys) {
        return;
      }

      const prefix = `${STORAGE_KEY_PREFIX}${namespace}:`;
      const keysToDelete = allKeys.filter((key) => key.startsWith(prefix));

      await Promise.all(
        keysToDelete.map((key) => FilesystemStorage.removeItem(key)),
      );

      Logger.log(
        `StorageService: Cleared ${keysToDelete.length} keys for ${namespace}`,
      );
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to clear namespace ${namespace}`,
      });
      throw error;
    }
  },
};

/**
 * Initialize the storage service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const storageServiceInit: ControllerInitFunction<
  StorageService,
  StorageServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new StorageService({
    messenger: controllerMessenger,
    storage: mobileStorageAdapter,
  });

  return {
    controller,
  };
};
