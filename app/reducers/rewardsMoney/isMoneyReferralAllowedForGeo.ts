/**
 * Country prefix from a geolocation string (`US-CA` → `US`).
 * Returns null for unknown / empty locations so callers can fail open.
 */
export function countryCodeFromGeoLocation(
  geoLocation: string | null | undefined,
): string | null {
  if (!geoLocation) {
    return null;
  }
  const trimmed = geoLocation.trim().toUpperCase();
  if (!trimmed || trimmed === 'UNKNOWN') {
    return null;
  }
  const [country] = trimmed.split('-');
  return country || null;
}

/**
 * Whether the device country may accept a Money referral invite.
 *
 * Fail-open when geo is unknown (null / empty / UNKNOWN) or the exclusion
 * list is empty — matching Rewards opt-in and the money API's missing
 * `cf-ipcountry` behaviour. A confirmed country on the list is refused.
 */
export function isMoneyReferralAllowedForGeo(
  geoLocation: string | null | undefined,
  excludedRegions: string[] | null | undefined,
): boolean {
  const country = countryCodeFromGeoLocation(geoLocation);
  if (!country) {
    return true;
  }
  const list = excludedRegions ?? [];
  if (list.length === 0) {
    return true;
  }
  const excluded = new Set(list.map((code) => code.trim().toUpperCase()));
  return !excluded.has(country);
}
