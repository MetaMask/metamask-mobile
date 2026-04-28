import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

interface HandleSocialTraderPositionUrlParams {
  actionPath: string;
}

interface SocialTraderPositionNavigationParams {
  positionId?: string;
  traderId?: string;
}

const parseSocialTraderPositionNavigationParams = (
  actionPath: string,
): SocialTraderPositionNavigationParams => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return {
    positionId: urlParams.get('positionId')?.trim() || undefined,
    traderId: urlParams.get('traderId')?.trim() || undefined,
  };
};

const navigateToFallback = () => {
  NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
};

/**
 * Handles notification-approved TraderPosition deeplinks.
 *
 * Supported URL format:
 * - https://link.metamask.io/social-trader-position?positionId=<positionId>&traderId=<traderId>
 */
export const handleSocialTraderPositionUrl = ({
  actionPath,
}: HandleSocialTraderPositionUrlParams) => {
  DevLogger.log(
    '[handleSocialTraderPositionUrl] Starting deeplink handling with path:',
    actionPath,
  );

  try {
    const { positionId, traderId } =
      parseSocialTraderPositionNavigationParams(actionPath);
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Parsed navigation parameters:',
      { positionId, traderId },
    );

    if (!positionId) {
      DevLogger.log(
        '[handleSocialTraderPositionUrl] Missing positionId, falling back to social leaderboard',
      );
      navigateToFallback();
      return;
    }

    NavigationService.navigation.navigate(Routes.SOCIAL_LEADERBOARD.POSITION, {
      positionId,
      traderId: traderId ?? '',
      traderName: 'Trader',
      tokenSymbol: 'Token',
    });
  } catch (error) {
    DevLogger.log(
      '[handleSocialTraderPositionUrl] Failed to handle deeplink:',
      error,
    );
    navigateToFallback();
  }
};
