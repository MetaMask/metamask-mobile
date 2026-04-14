import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import {
  setOnboardingReferralCode,
  setPendingDeeplink,
} from '../../../../reducers/rewards';

interface HandleRewardsUrlParams {
  rewardsPath: string;
}

/**
 * Extensible interface for parsed rewards navigation parameters
 */
interface RewardsNavigationParams {
  referral?: string;
  page?: 'campaigns' | 'musd' | 'benefits';
  campaign?: 'ondo' | 'season1';
}

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

  const pageParam = urlParams.get('page');
  const campaignParam = urlParams.get('campaign');

  return {
    referral:
      (urlParams.get('referral') as RewardsNavigationParams['referral']) ||
      undefined,
    page: (['campaigns', 'musd', 'benefits'].includes(pageParam ?? '')
      ? pageParam
      : undefined) as RewardsNavigationParams['page'],
    campaign: (['ondo', 'season1'].includes(campaignParam ?? '')
      ? campaignParam
      : undefined) as RewardsNavigationParams['campaign'],
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
 * - https://link.metamask.io/rewards?page=campaigns
 * - https://link.metamask.io/rewards?page=musd
 * - https://link.metamask.io/rewards?page=benefits
 * - https://link.metamask.io/rewards?campaign=ondo
 * - https://link.metamask.io/rewards?campaign=season1
 */
export const handleRewardsUrl = async ({
  rewardsPath,
}: HandleRewardsUrlParams) => {
  DevLogger.log(
    '[handleRewardsUrl] Starting rewards deeplink handling with path:',
    rewardsPath,
  );
  Logger.log(`[handleRewardsUrl] Raw rewardsPath received: "${rewardsPath}"`);

  try {
    // Parse navigation parameters from URL
    const urlParams = parseRewardsNavigationParams(rewardsPath);
    DevLogger.log('[handleRewardsUrl] Parsed URL parameters:', urlParams);

    if (urlParams.referral && urlParams.referral.length > 0) {
      ReduxService.store.dispatch(
        setOnboardingReferralCode(urlParams.referral),
      );
    } else {
      // Clear any existing referral code
      ReduxService.store.dispatch(setOnboardingReferralCode(null));
    }
    if (urlParams.page || urlParams.campaign) {
      // Store the deeplink intent in Redux rather than passing it as navigation
      // params. RewardsHome uses UnmountOnBlur, so the navigator is not mounted
      // when the user is on another tab — nested navigation params would be lost.
      // Redux state is always available regardless of mount status, so
      // RewardsNavigator can read and act on it once it mounts.
      ReduxService.store.dispatch(
        setPendingDeeplink({
          page: urlParams.page,
          campaign: urlParams.campaign,
        }),
      );
    }
    NavigationService.navigation.navigate(Routes.REWARDS_VIEW);
  } catch (error) {
    DevLogger.log('Failed to handle rewards deeplink:', error);
    // Fallback to wallet home on error
    NavigationService.navigation.navigate(Routes.WALLET_VIEW, {
      screen: Routes.WALLET_VIEW,
    });
  }
};
