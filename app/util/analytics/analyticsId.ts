import storageWrapper from '../../store/storage-wrapper';
import { ANALYTICS_ID } from '../../constants/storage';
import { v4, validate as uuidValidate, version as uuidVersion } from 'uuid';
import Logger from '../Logger';

const isValidUuidV4 = (id: unknown): id is string =>
  typeof id === 'string' && uuidValidate(id) && uuidVersion(id) === 4;

/**
 * Get analytics ID from storage, recovering or generating one if it is missing.
 *
 * The analytics ID is the Segment `userId`, so minting a new one orphans every
 * event the device has previously sent and makes the device look like a
 * first-time user. It is kept in MMKV rather than controller state so that
 * controller-state corruption cannot lose it, but MMKV has its own failure
 * modes, and migration 110 — which seeds this key from the legacy
 * `METAMETRICS_ID` — only runs when `persist:root` loads successfully. Both are
 * ways for the key to be absent on a device that already has an identity.
 *
 * So when the key is missing, prefer the copy the AnalyticsController persisted
 * to `persist:AnalyticsController` before falling back to a new UUID.
 *
 * @param persistedAnalyticsId - `analyticsId` from the persisted
 * AnalyticsController state, used to recover the identity after MMKV loss.
 * @returns Promise resolving to the analytics ID (UUIDv4)
 */
export async function getAnalyticsId(
  persistedAnalyticsId?: unknown,
): Promise<string> {
  const storedId = await storageWrapper.getItem(ANALYTICS_ID);

  if (storedId) {
    return storedId;
  }

  let analyticsId: string;

  if (isValidUuidV4(persistedAnalyticsId)) {
    Logger.log(
      'getAnalyticsId: ANALYTICS_ID missing from storage, recovered identity from persisted AnalyticsController state',
    );
    analyticsId = persistedAnalyticsId;
  } else {
    analyticsId = v4();
  }

  await storageWrapper.setItem(ANALYTICS_ID, analyticsId);

  return analyticsId;
}
