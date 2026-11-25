import ReduxService from '../../../../core/redux';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { SocialLeaderboardTabParams } from '../../../Nav/Main/types/navigation';
import { selectHasSocialV1Access } from '../../../../selectors/featureFlagController/socialV1';
import type { SocialShellTab } from '../shell/types';
import {
  ensureSocialTermsAccepted,
  hasAcceptedSocialTerms,
  recordSocialTermsAcceptanceForExistingProfile,
} from '../terms/socialTermsAcceptance';

/**
 * Params forwarded to Follow Trading home.
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

/** Social V1 access: the TSA-1122 treatment bucket or early access. */
export const isSocialV1Treatment = (): boolean =>
  selectHasSocialV1Access(ReduxService.store.getState());

export const getFollowTradingHomeRoute = ():
  | typeof Routes.SOCIAL.V1
  | typeof Routes.SOCIAL.V0 =>
  isSocialV1Treatment() ? Routes.SOCIAL.V1 : Routes.SOCIAL.V0;

/**
 * Whether ProfileController already has a created Social profile.
 *
 * Reads persisted state synchronously, the same way the terms gate does. An
 * empty `profileId` is the saved "not created" state, not a profile that is
 * still loading.
 */
const hasCreatedSocialProfile = (): boolean => {
  try {
    const profileId =
      ReduxService.store.getState().engine.backgroundState.ProfileController
        ?.profile?.profileId;
    return Boolean(profileId?.trim());
  } catch {
    return false;
  }
};

/**
 * Social V1 entry gate. Accepted terms do not open Social when no profile has
 * been created. Opens the normal profile onboarding route, without
 * `termsOnly`, so a user who already accepted the terms is not asked again.
 *
 * @param navigate - The caller's navigate function.
 * @returns `true` when the caller may continue into Social.
 */
const ensureSocialProfileCreated = (
  navigate: SocialLeaderboardNavigate,
): boolean => {
  if (!isSocialV1Treatment() || hasCreatedSocialProfile()) {
    return true;
  }
  navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  return false;
};

/**
 * Whether `navigateToSocialTab` would open the tab itself rather than
 * redirecting to terms or profile setup.
 */
export const canOpenSocialTabDirectly = (): boolean => {
  recordSocialTermsAcceptanceForExistingProfile();
  return (
    !isSocialV1Treatment() ||
    (hasAcceptedSocialTerms() && hasCreatedSocialProfile())
  );
};

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
 * the current flow, after the terms and profile gates. The control arm of
 * `navigateToSocialLeaderboard` uses this.
 *
 * @param navigate - The caller's navigate function.
 * @param params - Params forwarded to the home route.
 */
export const pushSocialLeaderboard = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (
    isSocialV1Treatment() &&
    !ensureSocialTermsAccepted(navigate, () =>
      pushSocialLeaderboard(navigate, params),
    )
  ) {
    return;
  }
  if (!ensureSocialProfileCreated(navigate)) {
    return;
  }
  navigate(getFollowTradingHomeRoute(), toHomeRouteParams(params));
};

/**
 * Entry point into the Social Leaderboard feature. Opens Follow Trading home
 * with the caller's `source`, after the terms and profile gates. Social V1
 * treatment selects the Social tab so the bottom tab bar stays visible; control
 * pushes the legacy home.
 *
 * @param navigate - The caller's navigate function (React or deeplink).
 * @param params - Params forwarded to the home route.
 */
export const navigateToSocialLeaderboard = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (!isSocialV1Treatment()) {
    pushSocialLeaderboard(navigate, params);
    return;
  }
  if (
    !ensureSocialTermsAccepted(navigate, () =>
      navigateToSocialLeaderboard(navigate, params),
    )
  ) {
    return;
  }
  if (!ensureSocialProfileCreated(navigate)) {
    return;
  }
  navigate(
    Routes.HOME_TABS,
    { screen: Routes.SOCIAL.TAB, params: toHomeRouteParams(params) },
    { pop: true },
  );
};

/**
 * Navbar Social tab entry. Same terms and profile gates as
 * `navigateToSocialLeaderboard`, but always lands on `SOCIAL.TAB` (control
 * too) so the floating bar selects the tab. TSA-1122 chooses V1 vs V0 as that
 * tab's mounted component, not as a root-stack push.
 */
export const navigateToSocialTab = (
  navigate: SocialLeaderboardNavigate,
  params?: SocialLeaderboardViewParams,
): void => {
  if (
    isSocialV1Treatment() &&
    !ensureSocialTermsAccepted(navigate, () =>
      navigateToSocialTab(navigate, params),
    )
  ) {
    return;
  }
  if (!ensureSocialProfileCreated(navigate)) {
    return;
  }
  navigate(Routes.SOCIAL.TAB, toHomeRouteParams(params));
};

/**
 * Pops the root stack and selects the Social tab under Home (Social V1 only).
 * Unlike `navigateToSocialTab`, it skips the terms and profile gates, so call
 * it only after the user has passed them.
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
