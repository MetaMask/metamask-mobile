const USA_REGION_CODE = 'US';

const getRegionCodeFromLocale = (locale: string): string | undefined => {
  const normalizedLocale = locale.replace(/_/g, '-');
  const subtags = normalizedLocale.split('-');

  if (subtags.length < 2) {
    return undefined;
  }

  const regionSubtag = subtags[subtags.length - 1];

  if (/^[A-Za-z]{2}$/.test(regionSubtag)) {
    return regionSubtag.toUpperCase();
  }

  return undefined;
};

const getDeviceLocale = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
};

/**
 * Detects whether the device locale indicates a USA region.
 * Uses Intl locale resolution only — no network or geolocation APIs.
 */
export function isUsaDeviceRegion(): boolean {
  const locale = getDeviceLocale();

  if (!locale) {
    return false;
  }

  return getRegionCodeFromLocale(locale) === USA_REGION_CODE;
}
