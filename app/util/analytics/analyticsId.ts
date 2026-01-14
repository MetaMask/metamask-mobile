import storageWrapper from '../../store/storage-wrapper';
import { ANALYTICS_ID } from '../../constants/storage';
import { v4 } from 'uuid';

/**
 * Get analytics ID from storage, or generate a new one if it doesn't exist.
 *
 * The analytics ID is not persisted in state to prevent losing it in case of corruption.
 * It's also used as a random source for other controllers like RemoteFeatureFlagController.
 *
 * Legacy storage keys (METAMETRICS_ID, MIXPANEL_METAMETRICS_ID) are migrated to ANALYTICS_ID
 * by migration 109. This function only reads from and writes to the ANALYTICS_ID key.
 *
 * @returns Promise resolving to the analytics ID (UUIDv4)
 */
export async function getAnalyticsId(): Promise<string> {
  let analyticsId = await storageWrapper.getItem(ANALYTICS_ID);

  if (!analyticsId) {
    analyticsId = v4();
    await storageWrapper.setItem(ANALYTICS_ID, analyticsId);
  }

  return analyticsId;
}
