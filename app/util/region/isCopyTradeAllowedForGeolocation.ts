import {
  UNKNOWN_LOCATION,
  type GeolocationRequestStatus,
} from '@metamask/geolocation-controller';

/**
 * Whether Copy trade can be shown for a GeolocationController result.
 *
 * Hidden until a completed lookup names a location outside `blockedRegions`,
 * so the button does not appear and then disappear for a blocked user.
 *
 * A blocked entry matches the location and everything under it, so `US`
 * blocks `US-CA`, while `CA-ON` blocks only that region.
 */
export function isCopyTradeAllowedForGeolocation(
  location: string | null | undefined,
  status: GeolocationRequestStatus | null | undefined,
  blockedRegions: readonly string[],
): boolean {
  if (status !== 'complete') {
    return false;
  }

  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  const normalizedLocation = location.toUpperCase();

  return !blockedRegions.some((blocked) => {
    const normalizedBlocked = blocked.trim().toUpperCase();
    return (
      normalizedBlocked.length > 0 &&
      normalizedLocation.startsWith(normalizedBlocked)
    );
  });
}
