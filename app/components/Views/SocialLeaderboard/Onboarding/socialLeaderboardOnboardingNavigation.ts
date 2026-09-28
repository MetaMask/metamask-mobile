import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  selectFeatureFlagThresholdGroups,
  selectRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController';
import { resolveABTestAssignment } from '../../../../util/abTest';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../SocialV1View/abTestConfig';

/**
 * Params forwarded to Follow Trading home when onboarding is not shown.
 * `landingTab` is only meaningful on the legacy `SocialV0View` (TSA-1042).
 */
interface SocialLeaderboardViewParams {
  source?: string;
  landingTab?: 'leaderboard' | 'feed';
  landingFeedAudience?: 'all' | 'following';
  showNotificationsBanner?: boolean;
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

export const isSocialV1Treatment = (): boolean => {
  const state = ReduxService.store.getState();
  const { variantName } = resolveABTestAssignment(
    selectRemoteFeatureFlags(state),
    SOCIAL_V1_AB_KEY,
    Object.values(SocialV1Variant),
    selectFeatureFlagThresholdGroups(state),
  );
  return variantName === SocialV1Variant.Treatment;
};

export const getFollowTradingHomeRoute = ():
  | typeof Routes.SOCIAL.V1
  | typeof Routes.SOCIAL.V0 =>
  isSocialV1Treatment() ? Routes.SOCIAL.V1 : Routes.SOCIAL.V0;

const toHomeRouteParams = (
  params: SocialLeaderboardViewParams | undefined,
): SocialLeaderboardViewParams | undefined => {
  if (!params) {
    return undefined;
  }
  if (isSocialV1Treatment()) {
    return {
      source: params.source,
      showNotificationsBanner: params.showNotificationsBanner,
    };
  }
  return params;
};

/**
 * Entry point into the Social Leaderboard feature. Routes a first-time user
 * straight to the onboarding (so no leaderboard/loading frame is shown first),
 * otherwise opens Follow Trading home (legacy or Social V1) with the
 * caller's `source`.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @param params - Params forwarded to the home route when onboarding is skipped.
 */
export const navigateToSocialLeaderboard = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (shouldShowSocialLeaderboardOnboarding()) {
    navigate(Routes.SOCIAL.ONBOARDING);
    return;
  }
  navigate(getFollowTradingHomeRoute(), toHomeRouteParams(params));
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
