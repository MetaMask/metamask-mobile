import ReduxService from '../../core/redux';
import type { RootState } from '../../reducers';
import { selectGeolocationLocation } from '../../selectors/geolocationController';

/**
 * `region` value sent while the user's country has not been resolved.
 *
 * The VBA and KYC schemas mark `region` required, so the property is always
 * sent. Reports on country filter this value out rather than treating a
 * missing property as a country.
 */
export const ANALYTICS_REGION_UNKNOWN = 'unknown';

/**
 * Normalizes a geolocation controller `location` into the lowercase ISO
 * 3166-1 alpha-2 country the schemas expect (`BR-SP` becomes `br`).
 *
 * @param location - Geolocation controller `location`, when it has one.
 * @returns The region, or {@link ANALYTICS_REGION_UNKNOWN}.
 */
export const toAnalyticsRegion = (location: unknown): string => {
  const country =
    typeof location === 'string' ? location.split('-')[0] : undefined;
  return country && /^[a-zA-Z]{2}$/u.test(country) && country !== 'XX'
    ? country.toLowerCase()
    : ANALYTICS_REGION_UNKNOWN;
};

/**
 * Reads the region from the geolocation controller.
 *
 * @returns The region, or {@link ANALYTICS_REGION_UNKNOWN} when the location
 * is unresolved or the store cannot be read.
 */
export const readAnalyticsRegion = (): string => {
  try {
    return toAnalyticsRegion(
      selectGeolocationLocation(ReduxService.store.getState() as RootState),
    );
  } catch {
    return ANALYTICS_REGION_UNKNOWN;
  }
};
