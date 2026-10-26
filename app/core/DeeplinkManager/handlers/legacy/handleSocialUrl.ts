import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { resolveSocialDeeplinkTarget } from '../../util/deeplinks/socialDeeplinkPath';
import { handleSocialLeaderboardUrl } from './handleSocialLeaderboardUrl';
import { handleSocialTraderPositionUrl } from './handleSocialTraderPositionUrl';
import { handleSocialTraderUrl } from './handleSocialTraderUrl';

interface HandleSocialUrlParams {
  actionPath: string;
}

/**
 * Nested Social universal links.
 *
 * Supported URL formats:
 * - https://link.metamask.io/social
 * - https://link.metamask.io/social?tab=trending|following|leaderboard|live-trades
 * - https://link.metamask.io/social/profile?traderId=<traderId>
 * - https://link.metamask.io/social/profile/position?positionId=<positionId>&traderId=<traderId>
 *
 * Legacy Social v0 links stay on their own actions: `top-traders` and
 * `social-trader-position`. `social-trader` remains accepted as an alias.
 */
export const handleSocialUrl = ({ actionPath }: HandleSocialUrlParams) => {
  const target = resolveSocialDeeplinkTarget(actionPath);
  DevLogger.log('[handleSocialUrl] Resolved social deeplink target:', {
    actionPath,
    target,
  });

  switch (target) {
    case 'position':
      handleSocialTraderPositionUrl({ actionPath });
      return;
    case 'trader':
      handleSocialTraderUrl({ actionPath });
      return;
    default:
      handleSocialLeaderboardUrl({ actionPath });
  }
};
