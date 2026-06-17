import { getCountry } from 'react-native-localize';

const USA_REGION_CODE = 'US';

/**
 * Detects whether the device region setting indicates USA.
 * Uses the OS country/region from react-native-localize — not the
 * Intl formatting locale, which can diverge from the device region.
 */
export function isUsaDeviceRegion(): boolean {
  try {
    return getCountry().toUpperCase() === USA_REGION_CODE;
  } catch {
    return false;
  }
}
