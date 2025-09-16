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

      if (value === null) {
        return undefined;
      }

      const parsed = JSON.parse(value);
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
