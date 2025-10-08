import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import Logger from '../../../util/Logger';
import {
  HandleRewardsUrlParams,
  RewardsNavigationParams,
} from '../types/deepLink.types';

/**
 * Parse URL parameters into typed navigation parameters
 * @param rewardsPath The rewards URL path with query parameters
 * @returns Typed navigation parameters
 */
const parseRewardsNavigationParams = (
  rewardsPath: string,
): RewardsNavigationParams => {
  const urlParams = new URLSearchParams(
    rewardsPath.includes('?') ? rewardsPath.split('?')[1] : '',
  );

  return {
    referral:
      (urlParams.get('referral') as RewardsNavigationParams['referral']) ||
      undefined,
  };
};

/**
 * Rewards deeplink handler with extensible parameter support
 *
 * @param params Object containing the rewards path
 *
 * Supported URL formats:
 * - https://link.metamask.io/rewards
 * - https://link.metamask.io/rewards?referral=code
 */
export const handleRewardsUrl = async ({
  rewardsPath,
}: HandleRewardsUrlParams) => {
  DevLogger.log(
    '[handleRewardsUrl] Starting rewards deeplink handling with path:',
    rewardsPath,
  );

  try {
    // Parse navigation parameters from URL
    const urlParams = parseRewardsNavigationParams(rewardsPath);
    DevLogger.log('[handleRewardsUrl] Parsed URL parameters:', urlParams);

    if (urlParams.referral && urlParams.referral.length > 0) {
      Logger.log(
        '[handleRewardsUrl] Navigating to rewards view with referral code',
      );
      NavigationService.navigation.navigate(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_VIEW,
        params: {
          isFromDeeplink: true,
          referral: urlParams.referral,
        },
      });
    } else {
      DevLogger.log(
        '[handleRewardsUrl] No referral code parameter, defaulting to rewards view without referral code',
      );
      NavigationService.navigation.navigate(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_VIEW,
        params: {
          isFromDeeplink: true,
        },
      });
    }
  } catch (error) {
    DevLogger.log('Failed to handle rewards deeplink:', error);
    // Fallback to wallet home on error
    NavigationService.navigation.navigate(Routes.WALLET_VIEW, {
      screen: Routes.WALLET_VIEW,
    });
  }
};
