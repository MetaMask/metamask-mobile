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

// Each gate call replaces it, so a later Accept never runs an older entry.
let pendingEntry: (() => void) | undefined;

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
 * Whether ProfileController already has a created Social profile.
 * An empty `profileId` is the saved "not created" state, not a profile that is
 * still loading.
 */
const hasLoadedSocialProfile = (): boolean => {
  try {
    const profileId =
      ReduxService.store.getState().engine.backgroundState.ProfileController
        ?.profile?.profileId;
    return typeof profileId === 'string' && profileId.trim().length > 0;
  } catch {
    return false;
  }
};

/**
 * A profile with no stored acceptance already accepted the current terms on
 * another install. Writes that version locally so later reads skip the sheet.
 * A stored older version is left unchanged so a terms change still re-prompts.
 *
 * @param options - Optional settings.
 * @param options.profileLoaded - The caller just read the profile from the
 * server. Redux receives ProfileController updates in batches, so it may not
 * show that profile yet and is not checked.
 */
export const recordSocialTermsAcceptanceForExistingProfile = ({
  profileLoaded = false,
}: { profileLoaded?: boolean } = {}): void => {
  if (hasAcceptedThisSession) {
    return;
  }
  const stored = StorageWrapper.getItemSync(SOCIAL_TERMS_ACCEPTED);
  if (stored != null && stored !== '') {
    return;
  }
  if (!profileLoaded && !hasLoadedSocialProfile()) {
    return;
  }
  acceptSocialTerms().catch(() => undefined);
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
 * Returns the Social entry the last gate call held back and forgets it. The
 * terms-only screen runs it after Accept so the user lands where they tapped.
 */
export const takePendingSocialEntry = (): (() => void) | undefined => {
  const entry = pendingEntry;
  pendingEntry = undefined;
  return entry;
};

/**
 * Gate for every Social entry point and interaction. When the terms are not
 * accepted it opens profile onboarding, where they are accepted, and returns
 * `false` so the caller skips the original action.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @param onAccepted - Reopens the caller's destination once the terms-only
 * screen is accepted.
 * @returns `true` when the caller may continue.
 */
export const ensureSocialTermsAccepted = (
  navigate: SocialTermsNavigate,
  onAccepted?: () => void,
): boolean => {
  recordSocialTermsAcceptanceForExistingProfile();
  if (hasAcceptedSocialTerms()) {
    return true;
  }
  pendingEntry = onAccepted;
  try {
    if (hasLoadedSocialProfile()) {
      navigate(Routes.SOCIAL.PROFILE_ONBOARDING, { termsOnly: true });
    } else {
      navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
    }
  } catch {
    navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }
  return false;
};
