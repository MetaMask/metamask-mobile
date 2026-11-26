import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { SocialLeaderboardTabParams } from '../../../Nav/Main/types/navigation';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { selectHasSocialV1Access } from '../../../../selectors/featureFlagController/socialV1';
import type { SocialShellTab } from '../shell/types';

/**
 * Params forwarded to Follow Trading home when onboarding is not shown.
 * `landingTab` is only meaningful on the legacy `SocialV0View` (TSA-1042), and
 * `initialTab` only on `SocialV1View`.
 */
interface SocialLeaderboardViewParams {
  source?: string;
  landingTab?: 'leaderboard' | 'feed';
  landingFeedAudience?: 'all' | 'following';
  showNotificationsBanner?: boolean;
  initialTab?: SocialShellTab;
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

/** Social V1 access: the TSA-1122 treatment bucket or early access. */
export const isSocialV1Treatment = (): boolean =>
  selectHasSocialV1Access(ReduxService.store.getState());

export const getFollowTradingHomeRoute = ():
  | typeof Routes.SOCIAL.V1
  | typeof Routes.SOCIAL.V0 =>
  isSocialV1Treatment() ? Routes.SOCIAL.V1 : Routes.SOCIAL.V0;

/**
 * Whether `navigateToSocialTab` would open the tab itself rather than
 * redirecting to the first-time onboarding. Browsing Social needs no profile
 * or terms; those are asked for when the user takes an action.
 */
export const canOpenSocialTabDirectly = (): boolean =>
  !shouldShowSocialLeaderboardOnboarding();

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
      initialTab: params.initialTab,
    };
  }
  return params;
};

/**
 * Opens Follow Trading home (legacy or Social V1) as a pushed screen on top of
 * the current flow, after the first-time onboarding gate. The control arm of
 * `navigateToSocialLeaderboard` uses this.
 *
 * @param navigate - The caller's navigate function.
 * @param params - Params forwarded to the home route when onboarding is skipped.
 */
export const pushSocialLeaderboard = (
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
 * Entry point into the Social Leaderboard feature. Routes a first-time user
 * straight to the onboarding (so no leaderboard/loading frame is shown first),
 * otherwise opens Follow Trading home with the caller's `source`. Social V1
 * treatment selects the Social tab so the bottom tab bar stays visible; control
 * pushes the legacy home.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @param params - Params forwarded to the home route when onboarding is skipped.
 */
export const navigateToSocialLeaderboard = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (!isSocialV1Treatment()) {
    pushSocialLeaderboard(navigate, params);
    return;
  }
  if (shouldShowSocialLeaderboardOnboarding()) {
    navigate(Routes.SOCIAL.ONBOARDING, { returnToTab: true });
    return;
  }
  navigate(
    Routes.HOME_TABS,
    { screen: Routes.SOCIAL.TAB, params: toHomeRouteParams(params) },
    { pop: true },
  );
};

/**
 * Navbar Social tab entry. Same onboarding gate as
 * `navigateToSocialLeaderboard`, but always lands on `SOCIAL.TAB` (control
 * too) so the floating bar selects the tab. TSA-1122 chooses V1 vs V0 as that
 * tab's mounted component, not as a root-stack push.
 */
export const navigateToSocialTab = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (shouldShowSocialLeaderboardOnboarding()) {
    navigate(
      Routes.SOCIAL.ONBOARDING,
      isSocialV1Treatment() ? { returnToTab: true } : undefined,
    );
    return;
  }
  navigate(Routes.SOCIAL.TAB, toHomeRouteParams(params));
};

/**
 * Pops the root stack and selects the Social tab under Home (Social V1 only).
 * Unlike `navigateToSocialTab`, it skips the first-time onboarding gate, so
 * call it only after the user has passed it.
 *
 * @param navigation - The caller's navigation object.
 * @param params - Optional Social tab params, such as the V1 `initialTab`.
 */
export const popToSocialTab = (
  navigation: Pick<AppNavigationProp, 'navigate'>,
  params?: SocialLeaderboardTabParams,
): void => {
  navigation.navigate(
    Routes.HOME_TABS,
    params
      ? { screen: Routes.SOCIAL.TAB, params }
      : { screen: Routes.SOCIAL.TAB },
    { pop: true },
  );
};

/**
 * Leaves profile onboarding after **Let's go** on the manual path. Pops the
 * onboarding screen off the stack and selects the Social tab under Home, so the
 * bottom tab bar stays visible and Back returns to the previous screen.
 *
 * The pop uses the onboarding screen's animation. The ready step sets that to
 * `slide_from_left` before Let's go, so the ready screen leaves to the left.
 *
 * @param navigation - The onboarding screen's navigation object.
 */
export const finishProfileOnboardingToSocialTab = (
  navigation: Pick<AppNavigationProp, 'navigate'>,
): void => {
  popToSocialTab(navigation);
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
