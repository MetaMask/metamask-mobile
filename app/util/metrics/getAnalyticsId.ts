import StorageWrapper from '../../store/storage-wrapper';
import { ANALYTICS_ID } from '../../constants/storage';
import { selectAnalyticsId } from '../../selectors/analyticsController';
import ReduxService from '../../core/redux/ReduxService';
import Logger from '../Logger';

/**
 * Gets the analytics ID from Redux store (via selector) or falls back to StorageWrapper.
 * This provides a reliable way to get the analytics ID that works even before Engine initialization.
 *
 * @returns Promise resolving to the analytics ID string, or empty string if not available
 */
export const getAnalyticsId = async (): Promise<string> => {
  try {
    // Try Redux selector first (preferred source when Engine is initialized)
    try {
      const analyticsIdFromSelector = selectAnalyticsId(
        ReduxService.store.getState(),
      );

      if (analyticsIdFromSelector) {
        return analyticsIdFromSelector;
      }
    } catch (reduxError) {
      // Redux store might not be initialized yet - fall through to StorageWrapper
      // This is expected during app startup, so we don't log it as an error
    }

    // Fallback to StorageWrapper (works even before Engine initialization)
    const analyticsIdFromStorage = await StorageWrapper.getItem(ANALYTICS_ID);

    if (
      analyticsIdFromStorage &&
      typeof analyticsIdFromStorage === 'string' &&
      analyticsIdFromStorage.length > 0
    ) {
      return analyticsIdFromStorage;
    }

    // No analytics ID found
    Logger.error(
      new Error(
        `Analytics ID not found in Redux state or storage: storage returned ${JSON.stringify(analyticsIdFromStorage)}`,
      ),
      'Analytics: Failed to get analytics ID - not found in state or storage',
    );
    return '';
  } catch (error) {
    Logger.error(
      new Error(String(error)),
      'Analytics: Failed to get analytics ID from state or storage',
    );
    return '';
  }
};
