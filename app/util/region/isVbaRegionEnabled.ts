import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/**
 * Whether a GeolocationController location is in a Virtual Bank Account region.
 *
 * The geolocation API returns codes like "BR" or "BR-SP" (country-region), so
 * only the leading country segment is compared. `regions` comes from a
 * per-currency neobank flag. Unknown, empty, and failed lookups return
 * false, and an empty list allows no country.
 *
 * @param location - Raw GeolocationController location, when one has been stored.
 * @param regions - ISO 3166-1 alpha-2 country codes the flag currently allows.
 * @returns True when the leading country segment is in `regions`.
 */
export function isVbaRegionEnabled(
  location: string | undefined | null,
  regions: readonly string[],
): boolean {
  if (!location || location === UNKNOWN_LOCATION || regions.length === 0) {
    return false;
  }

  const country = location.toUpperCase().split('-')[0];
  return regions.some((region) => region.trim().toUpperCase() === country);
}
