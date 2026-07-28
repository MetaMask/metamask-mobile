import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

/**
 * Params forwarded to the leaderboard when onboarding is not shown. Mirrors the
 * `TopTradersView` route params (only `source` is set by the entry points).
 */
interface SocialLeaderboardViewParams {
  source?: string;
}

/**
 * The app's typed `navigate`, shared by React (`useNavigation<AppNavigationProp>()`)
 * and the deeplink layer (`NavigationService.navigation`, whose base
 * `ParamListBase` navigate is assignable here).
 */
type SocialLeaderboardNavigate = AppNavigationProp['navigate'];

/**
 * Synchronously decides whether the Social Leaderboard onboarding should be
 * shown before entering the feature. Kept synchronous (Redux + MMKV
 * `getItemSync`) so entry points can branch BEFORE navigating — the leaderboard
 * screen never mounts for a first-time user, so onboarding is the first thing
 * shown (mirrors the Perps first-time-user tutorial pattern). Works in both
 * React and non-React (deeplink) contexts since it reads the store directly.
 */
export const shouldShowSocialLeaderboardOnboarding = (): boolean => {
  const isOnboardingEnabled = selectAiSocialLeaderboardOnboardingEnabled(
    ReduxService.store.getState(),
  );
  if (!isOnboardingEnabled) {
    return false;
  }

  return (
    StorageWrapper.getItemSync(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN) !== 'true'
  );
};

/**
 * Entry point into the Social Leaderboard feature. Routes a first-time user
 * straight to the onboarding (so no leaderboard/loading frame is shown first),
 * otherwise opens the leaderboard with the caller's `source`.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @param params - Params forwarded to the leaderboard when onboarding is skipped.
 */
export const navigateToSocialLeaderboard = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (shouldShowSocialLeaderboardOnboarding()) {
    navigate(Routes.SOCIAL_LEADERBOARD.ONBOARDING);
    return;
  }
  navigate(Routes.SOCIAL_LEADERBOARD.VIEW, params);
};

/**
 * Whether the onboarding has been persisted as "seen". Reads MMKV synchronously.
 * Exposed for the dev-options status readout (the navigation gate above owns the
 * real decision, which also factors in the flag and the skip-seen env var).
 */
export const hasSeenSocialLeaderboardOnboarding = (): boolean =>
  StorageWrapper.getItemSync(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN) === 'true';

/**
 * Clears the persisted "seen" flag so the onboarding shows again on the next
 * feature open. Dev/QA only (wired to the Developer options reset button).
 */
export const resetSocialLeaderboardOnboardingSeen = (): Promise<void> =>
  StorageWrapper.removeItem(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN);
