/**
 * Builds a residency region code from authenticated card KYC data.
 * US cardholders with a known state use the `US-{STATE}` pattern (e.g. US-CA)
 * so blocked-region lists can target specific states via
 * `selectMoneyAccountGeoBlockedCountries`.
 */
export const buildCardResidencyRegion = (
  countryOfResidence: string | null,
  usState: string | null,
): string | null => {
  if (!countryOfResidence) {
    return null;
  }

  const country = countryOfResidence.toUpperCase();

  if (country === 'US' && usState) {
    return `US-${usState.toUpperCase()}`;
  }

  return country;
};

/**
 * Returns true when the residency region matches any blocked region entry.
 * Fail-open when residency is unknown (null).
 */
export const isCardResidencyInBlockedRegions = (
  residencyRegion: string | null,
  blockedRegions: string[],
): boolean => {
  if (!residencyRegion || blockedRegions.length === 0) {
    return false;
  }

  const normalized = residencyRegion.toUpperCase();

  return blockedRegions.some((region) =>
    normalized.startsWith(region.toUpperCase()),
  );
};
