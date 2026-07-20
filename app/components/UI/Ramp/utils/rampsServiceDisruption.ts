import type { UserRegion } from '@metamask/ramps-controller';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/**
 * Determines whether the Buy flow is in a service disruption for the user's region.
 *
 * Matches the user's resolved `regionCode` (e.g. "in", "us-ca"), falling back
 * to IP geolocation, against the configured service disruption region list. Matching is
 * hierarchical: a country entry ("us") matches all of its states ("us-ca").
 *
 * Only blocks on a definitive region signal — if no region resolves, returns
 * false (mirrors `isRampRegionDefinitivelyUnsupported`).
 *
 * @param disruptionRegions - Lowercase regionCodes from the `rampsServiceDisruptionModal` flag.
 * @param userRegion - The resolved RampsController user region, or null.
 * @param geolocationLocation - ISO 3166-2 geolocation (e.g. "US-CA"), optional.
 * @returns `true` when Buy should be blocked for this user.
 */
export function isRampsServiceDisruptionActive(
  disruptionRegions: string[],
  userRegion: UserRegion | null,
  geolocationLocation?: string,
): boolean {
  if (disruptionRegions.length === 0) {
    return false;
  }

  const regionCode =
    userRegion?.regionCode?.toLowerCase() ??
    (geolocationLocation && geolocationLocation !== UNKNOWN_LOCATION
      ? geolocationLocation.toLowerCase()
      : undefined);

  if (!regionCode) {
    return false;
  }

  return disruptionRegions.some((region) => {
    const entry = region.trim().toLowerCase();
    if (!entry) {
      return false;
    }
    return regionCode === entry || regionCode.startsWith(`${entry}-`);
  });
}
