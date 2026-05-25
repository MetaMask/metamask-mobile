import type { UseRampsUserRegionResult } from '../hooks/useRampsUserRegion';

/** US region codes for `RampsController.setUserRegion` (dev only). */
export const DEBUG_US_REGION_CA = 'us-ca';
export const DEBUG_US_REGION_COUNTRY = 'us';

/**
 * Applies a debug region override and waits for the controller to finish.
 */
export async function ensureDebugUserRegion(
  setUserRegion: UseRampsUserRegionResult['setUserRegion'],
  regionCode: string,
): Promise<void> {
  await setUserRegion(regionCode, { forceRefresh: true });
}
