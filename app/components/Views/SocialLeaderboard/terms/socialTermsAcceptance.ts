import Routes from '../../../../constants/navigation/Routes';
import { SOCIAL_TERMS_ACCEPTED } from '../../../../constants/storage';
import ReduxService from '../../../../core/redux/ReduxService';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import StorageWrapper from '../../../../store/storage-wrapper';

/**
 * Version of the Social Supplemental Terms the user must accept. Bump it when
 * legal publishes a material change so every user is asked to accept again.
 */
export const SOCIAL_TERMS_VERSION = 'v1';

// `getItemSync` always returns null under E2E test overrides, so an acceptance
// made this session must not depend on reading it back from storage.
let hasAcceptedThisSession = false;

/**
 * Whether the user accepted the current Social terms version on this device.
 * Synchronous (MMKV) so navigation helpers can branch before navigating.
 */
export const hasAcceptedSocialTerms = (): boolean =>
  hasAcceptedThisSession ||
  StorageWrapper.getItemSync(SOCIAL_TERMS_ACCEPTED) === SOCIAL_TERMS_VERSION;

/**
 * Loads a stored acceptance through the async storage path, which also reads
 * E2E fixture state that `getItemSync` cannot. Called once on app start.
 */
export const hydrateSocialTermsAcceptance = async (): Promise<void> => {
  try {
    if (
      (await StorageWrapper.getItem(SOCIAL_TERMS_ACCEPTED)) ===
      SOCIAL_TERMS_VERSION
    ) {
      hasAcceptedThisSession = true;
    }
  } catch {
    // The gate falls back to the synchronous read.
  }
};

export const acceptSocialTerms = (): Promise<void> => {
  hasAcceptedThisSession = true;
  return StorageWrapper.setItem(SOCIAL_TERMS_ACCEPTED, SOCIAL_TERMS_VERSION);
};

/**
 * Clears the in-process acceptance and the MMKV key.
 *
 * Wallet reset calls this so the next identity is asked again. Developer
 * options uses the same helper.
 */
export const resetSocialTermsAcceptance = (): Promise<void> => {
  hasAcceptedThisSession = false;
  return StorageWrapper.removeItem(SOCIAL_TERMS_ACCEPTED);
};

type SocialTermsNavigate = Pick<AppNavigationProp, 'navigate'>['navigate'];

/**
 * Gate for every Social entry point and interaction. When the terms are not
 * accepted it opens profile onboarding, where they are accepted, and returns
 * `false` so the caller skips the original action.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @returns `true` when the caller may continue.
 */
export const ensureSocialTermsAccepted = (
  navigate: SocialTermsNavigate,
): boolean => {
  if (hasAcceptedSocialTerms()) {
    return true;
  }
  try {
    const hasExistingProfile = Boolean(
      ReduxService.store.getState().engine.backgroundState.ProfileController
        ?.profile?.profileId,
    );
    if (hasExistingProfile) {
      navigate(Routes.SOCIAL.PROFILE_ONBOARDING, { termsOnly: true });
    } else {
      navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
    }
  } catch {
    navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }
  return false;
};
