import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import { setOnboardingReferralCode } from '../../../../reducers/rewards';

interface HandleRewardsUrlParams {
  rewardsPath: string;
}

/**
 * Extensible interface for parsed rewards navigation parameters
 */
interface RewardsNavigationParams {
  referral?: string;
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
  Logger.log(`[handleRewardsUrl] Raw rewardsPath received: "${rewardsPath}"`);

  try {
    // Parse navigation parameters from URL
    const urlParams = parseRewardsNavigationParams(rewardsPath);
    DevLogger.log('[handleRewardsUrl] Parsed URL parameters:', urlParams);

    if (urlParams.referral && urlParams.referral.length > 0) {
      store.dispatch(setOnboardingReferralCode(urlParams.referral));
    } else {
      // Clear any existing referral code
      store.dispatch(setOnboardingReferralCode(null));
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
