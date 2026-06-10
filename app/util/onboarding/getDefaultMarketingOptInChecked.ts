import { isUsaDeviceRegion } from '../region/isUsaDeviceRegion';

/**
 * Returns the default checked state for the marketing opt-in checkbox
 * on ChoosePassword for social login users during onboarding.
 */
export function getDefaultMarketingOptInChecked(
  isSocialLoginUser: boolean,
): boolean {
  return isSocialLoginUser && isUsaDeviceRegion();
}
