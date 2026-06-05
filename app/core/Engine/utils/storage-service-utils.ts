import FilesystemStorage from 'redux-persist-filesystem-storage';
import {
  StorageAdapter,
  StorageGetResult,
  STORAGE_KEY_PREFIX,
} from '@metamask/storage-service';
import { Json } from '@metamask/utils';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';

/**
 * Utility functions for StorageService key encoding/decoding.
 *
 * These functions handle the quirks of redux-persist-filesystem-storage:
 * 1. `/` in keys creates subdirectories, making keys unreachable via getAllKeys
 * 2. `-` gets converted to `:` by fromFileName, corrupting the key
 *
 * We encode `-` and `/` but not `:` because we already have keys with colons
 * in production (like `tokensChainsCache:0x1`), so encoding `:` would break
 * existing data.
 *
 * We use URI-style encoding (%XX) for these characters because it's a
 * well-understood, reversible format.
 */

/**
 * Encode a string to avoid issues with redux-persist-filesystem-storage.
 *
 * @param key - The string to encode (namespace or key).
 * @returns The encoded string safe for filesystem storage.
 */
export const encodeStorageKey = (key: string): string =>
  key
    .replace(/%/g, '%25') // Encode % first to avoid double-encoding
    .replace(/\//g, '%2F') // Encode slashes (would create subdirectories)
    .replace(/-/g, '%2D'); // Encode hyphens (would be converted to colons)

/**
 * Decode a key that was encoded with encodeStorageKey.
 *
 * @param encodedKey - The encoded key to decode.
 * @returns The original key.
 */
export const decodeStorageKey = (encodedKey: string): string =>
  encodedKey.replace(/%2D/gi, '-').replace(/%2F/gi, '/').replace(/%25/g, '%');

/**
 * Mobile-specific storage adapter using FilesystemStorage.
 * This provides persistent storage for large controller data.
 *
 * Extension will provide its own adapter using IndexedDB.
 * Tests use InMemoryStorageAdapter (default when no storage provided).
 */
export const mobileStorageAdapter: StorageAdapter = {
  /**
   * Get an item from filesystem storage.
   * Deserializes JSON data from storage.
   *
   * @param namespace - The controller namespace.
   * @param key - The data key.
   * @returns StorageGetResult: { result } if found, {} if not found, { error } on failure.
   */
  async getItem(namespace: string, key: string): Promise<StorageGetResult> {
    try {
      // Build full key: storageService:encodedNamespace:encodedKey
      const encodedNamespace = encodeStorageKey(namespace);
      const encodedKey = encodeStorageKey(key);
      const fullKey = `${STORAGE_KEY_PREFIX}${encodedNamespace}:${encodedKey}`;

      const serialized = await FilesystemStorage.getItem(fullKey);

      // Key not found - return empty object
      if (serialized === undefined || serialized === null) {
        return {};
      }

      const result = JSON.parse(serialized) as Json;
      return { result };
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to get item: ${namespace}:${key}`,
      });
      return { error: error as Error };
    }
  },

  /**
   * Set an item in filesystem storage.
   * Serializes JSON data to string.
   *
   * @param namespace - The controller namespace.
   * @param key - The data key.
   * @param value - The JSON value to store.
   */
  async setItem(namespace: string, key: string, value: Json): Promise<void> {
    try {
      // Build full key: storageService:encodedNamespace:encodedKey
      const encodedNamespace = encodeStorageKey(namespace);
      const encodedKey = encodeStorageKey(key);
      const fullKey = `${STORAGE_KEY_PREFIX}${encodedNamespace}:${encodedKey}`;

      await FilesystemStorage.setItem(
        fullKey,
        JSON.stringify(value),
        Device.isIos(),
      );
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
      // Build full key: storageService:encodedNamespace:encodedKey
      const encodedNamespace = encodeStorageKey(namespace);
      const encodedKey = encodeStorageKey(key);
      const fullKey = `${STORAGE_KEY_PREFIX}${encodedNamespace}:${encodedKey}`;

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

      // Encode namespace to match how keys were stored
      const encodedNamespace = encodeStorageKey(namespace);
      const prefix = `${STORAGE_KEY_PREFIX}${encodedNamespace}:`;

      const filteredKeys = allKeys
        .filter((rawKey) => rawKey.startsWith(prefix))
        .map((rawKey) => {
          // Extract the encoded key part and decode it
          const encodedKeyPart = rawKey.slice(prefix.length);
          return decodeStorageKey(encodedKeyPart);
        });

      return filteredKeys;
    } catch (error) {
      Logger.error(error as Error, {
        message: `StorageService: Failed to get keys for ${namespace}`,
      });
      throw error;
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

      // Encode namespace to match how keys were stored
      const encodedNamespace = encodeStorageKey(namespace);
      const prefix = `${STORAGE_KEY_PREFIX}${encodedNamespace}:`;

      const keysToDelete = allKeys.filter((rawKey) =>
        rawKey.startsWith(prefix),
      );

      // For deletion, we pass the raw key as returned by getAllKeys.
      // FilesystemStorage.removeItem will apply toFileName to find the file.
      await Promise.all(
        keysToDelete.map((rawKey) => FilesystemStorage.removeItem(rawKey)),
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
