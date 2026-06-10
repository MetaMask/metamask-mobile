const USA_REGION_CODE = 'US';

const getRegionCodeFromLocale = (locale: string): string | undefined => {
  const normalizedLocale = locale.replace(/_/g, '-');
  const subtags = normalizedLocale.split('-');

  if (subtags.length < 2) {
    return undefined;
  }

  // BCP 47: region follows language and optional script, before variants/extensions.
  // e.g. en-US-u-nu-latn → US (not latn from the trailing unicode extension).
  for (const subtag of subtags.slice(1)) {
    if (subtag.length === 1) {
      break;
    }

    if (/^[A-Za-z]{4}$/.test(subtag)) {
      continue;
    }

    if (/^[A-Za-z]{2}$/.test(subtag)) {
      return subtag.toUpperCase();
    }

    if (/^[0-9]{3}$/.test(subtag)) {
      return subtag;
    }
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
