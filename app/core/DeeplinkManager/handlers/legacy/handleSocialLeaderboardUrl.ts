import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { navigateToSocialLeaderboard } from '../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import type { SocialShellTab } from '../../../../components/Views/SocialLeaderboard/shell/types';

interface HandleSocialLeaderboardUrlParams {
  actionPath?: string;
}

/**
 * Public `tab` query values for Social V1. `live-trades` maps to the shell
 * tab id `live`. Unknown values are dropped so V1 stays on trending.
 */
const SOCIAL_TAB_QUERY_VALUES: Record<string, SocialShellTab> = {
  trending: 'trending',
  following: 'following',
  leaderboard: 'leaderboard',
  'live-trades': 'live',
};

const parseInitialTab = (actionPath: string): SocialShellTab | undefined => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );
  const tab = urlParams.get('tab')?.trim().toLowerCase();
  if (!tab) {
    return undefined;
  }
  return SOCIAL_TAB_QUERY_VALUES[tab];
};

/**
 * Social home deeplink.
 *
 * Supported URL formats:
 * - https://link.metamask.io/social
 * - https://link.metamask.io/social?tab=trending|following|leaderboard|live-trades
 * - https://link.metamask.io/top-traders
 * - https://link.metamask.io/top-traders?tab=trending|following|leaderboard|live-trades
 *
 * `tab` is forwarded as `initialTab` only. Social V0 drops it; Social V1
 * opens that shell tab. A missing or unknown tab leaves V1 on trending.
 */
export const handleSocialLeaderboardUrl = ({
  actionPath = '',
}: HandleSocialLeaderboardUrlParams = {}) => {
  DevLogger.log(
    '[handleSocialLeaderboardUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const initialTab = parseInitialTab(actionPath);
    DevLogger.log('[handleSocialLeaderboardUrl] Parsed parameters:', {
      initialTab,
    });

    navigateToSocialLeaderboard(
      NavigationService.navigation.navigate,
      initialTab ? { initialTab } : undefined,
    );
  } catch (error) {
    DevLogger.log(
      '[handleSocialLeaderboardUrl] Failed to handle deeplink:',
      error,
    );
    navigateToSocialLeaderboard(NavigationService.navigation.navigate);
  }
};
