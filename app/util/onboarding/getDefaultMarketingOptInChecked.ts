import { isUsaGeolocationLocation } from '../region/isUsaGeolocationLocation';
import { hasTestOverrides } from '../test/utils';

/**
 * Returns the default checked state for the marketing opt-in checkbox
 * on ChoosePassword for social login users during onboarding.
 */
export function getDefaultMarketingOptInChecked(
  isSocialLoginUser: boolean,
  geolocationLocation?: string,
): boolean {
  // E2E builds keep the checkbox unchecked so tests can opt in with a single tap.
  if (hasTestOverrides) {
    return false;
  }

  return isSocialLoginUser && isUsaGeolocationLocation(geolocationLocation);
}
