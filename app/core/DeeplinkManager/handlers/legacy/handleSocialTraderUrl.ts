import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
} from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { navigateToSocialV1Profile } from '../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';

interface HandleSocialTraderUrlParams {
  actionPath: string;
}

const parseTraderId = (actionPath: string): string | undefined => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );
  return urlParams.get('traderId')?.trim() || undefined;
};

const navigateToFallback = () => {
  NavigationService.navigation.navigate(
    getFollowTradingHomeRoute(),
    undefined,
    { pop: true },
  );
};

/**
 * Trader profile deeplink. The same URL opens Social V0 or Social V1 from
 * `socialAiTSA1122AbtestSocialBundleV1`.
 *
 * Supported URL formats:
 * - https://link.metamask.io/social/profile?traderId=<traderId>
 * - https://link.metamask.io/social-trader?traderId=<traderId>
 */
export const handleSocialTraderUrl = ({
  actionPath,
}: HandleSocialTraderUrlParams) => {
  DevLogger.log(
    '[handleSocialTraderUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const traderId = parseTraderId(actionPath);
    DevLogger.log('[handleSocialTraderUrl] Parsed navigation parameters:', {
      traderId,
    });

    if (!traderId) {
      DevLogger.log(
        '[handleSocialTraderUrl] Missing traderId, falling back to social home',
      );
      navigateToFallback();
      return;
    }

    if (isSocialV1Treatment()) {
      navigateToSocialV1Profile(NavigationService.navigation, {
        traderId,
        source: 'deep_link',
      });
      return;
    }

    NavigationService.navigation.navigate(Routes.SOCIAL.PROFILE, {
      traderId,
      traderName: '',
      source: 'deep_link',
    });
  } catch (error) {
    DevLogger.log('[handleSocialTraderUrl] Failed to handle deeplink:', error);
    navigateToFallback();
  }
};
