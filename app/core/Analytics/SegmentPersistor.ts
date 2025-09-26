import type { Persistor } from '@segment/sovran-react-native';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';

const SEGMENT_PREFIX = 'segment_';

/**
 * Helper function to prefix Segment keys to avoid conflicts with app data
 */
const getSegmentKey = (key: string): string => `${SEGMENT_PREFIX}${key}`;

/**
 * Persistor that bridges Segment SDK with the app's storage system.
 *
 * @see https://github.com/MetaMask/metamask-mobile/issues/19834
 */
export const segmentPersistor: Persistor = {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const prefixedKey = getSegmentKey(key);
      const value = await StorageWrapper.getItem(prefixedKey);

      if (value === null || value === undefined) {
        return undefined;
      }

      // Handle the special case where we stored 'undefined' as a string
      if (value === 'undefined') {
        return undefined;
      }

      const parsed = JSON.parse(value);

      if (key.endsWith('-pendingEvents')) {
        // Handle data format migration for pending events
        // Fixes: https://github.com/segmentio/analytics-react-native/issues/1085
        // Issue: Pending events stored as object {"events": [...]} instead of array [...]
        // This causes "TypeError: iterator method is not callable" in Segment client initialization
        // TODO: Remove this once the issue is fixed in the Segment SDK
        if (parsed && typeof parsed === 'object' && parsed.events) {
          // Old format: {"events": [...]} - extract the events array
          console.debug('SegmentPersistor: Migrating from object format to array format');
          return (Array.isArray(parsed.events) ? parsed.events : []) as T;
        } else if (Array.isArray(parsed)) {
          // New format: [...] - return as is
          return parsed as T;
        } else {
          // Fallback: return empty array
          console.debug('SegmentPersistor: Using fallback empty array');
          return [] as T;
        }
      }

      return parsed as T;
    } catch (error) {
      Logger.error(
        error as Error,
        `[Segment Storage] Failed to get key: ${key}`,
      );
      return undefined;
    }
  },

  async set<T>(key: string, state: T): Promise<void> {
    try {
      const prefixedKey = getSegmentKey(key);

      // Handle undefined values explicitly to avoid storage issues
      if (state === undefined) {
        await StorageWrapper.setItem(prefixedKey, 'undefined');
        return;
      }

      const serialized = JSON.stringify(state);
      await StorageWrapper.setItem(prefixedKey, serialized);
    } catch (error) {
      Logger.error(
        error as Error,
        `[Segment Storage] Failed to set key: ${key}`,
      );
    }
  },
};
