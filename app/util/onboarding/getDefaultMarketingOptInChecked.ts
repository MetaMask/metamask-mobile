import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isEuGeolocationLocation } from '../region/isEuGeolocationLocation';
import { hasTestOverrides } from '../test/utils';

/**
 * Default marketing opt-in for the dedicated onboarding marketing screen.
 *
 * Non-EU users default on. EU users and unknown geolocation default off
 * (explicit opt-in). E2E builds stay off so tests can opt in with one tap.
 */
export function getDefaultMarketingOptInChecked(
  geolocationLocation?: string,
): boolean {
  if (hasTestOverrides) {
    return false;
  }

  if (!geolocationLocation || geolocationLocation === UNKNOWN_LOCATION) {
    return false;
  }

  return !isEuGeolocationLocation(geolocationLocation);
}
