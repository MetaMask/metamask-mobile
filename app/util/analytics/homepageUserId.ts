import storageWrapper from '../../store/storage-wrapper';
import { HOMEPAGE_USER_ID } from '../../constants/storage';
import { v4 } from 'uuid';

/**
 * Get the homepage user ID from storage, or generate a new one if it doesn't exist.
 *
 * This is a non-PII, persistent identifier used to distinguish new users from
 * returning users in homepage analytics events. Unlike wallet addresses, this ID
 * carries no personal information — it is a random UUID tied to the app install.
 *
 * It persists across app restarts and homepage visits, allowing analytics to
 * correlate HOME_VIEWED events to the same install without using any user data.
 *
 * @returns Promise resolving to the homepage user ID (UUIDv4)
 */
export async function getHomepageUserId(): Promise<string> {
  let homepageUserId = await storageWrapper.getItem(HOMEPAGE_USER_ID);

  if (!homepageUserId) {
    homepageUserId = v4();
    await storageWrapper.setItem(HOMEPAGE_USER_ID, homepageUserId);
  }

  return homepageUserId;
}
