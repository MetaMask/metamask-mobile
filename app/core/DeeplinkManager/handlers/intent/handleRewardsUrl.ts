import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import { setPendingDeeplink } from '../../../../reducers/rewards';
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';
import { executeDeeplinkIntent } from '../../utils/executeDeeplinkIntent';

interface NavigationStateLike {
  routes?: { name?: string; state?: NavigationStateLike }[];
}

interface HandleRewardsUrlParams {
  rewardsPath: string;
}

/**
 * Extensible interface for parsed rewards navigation parameters
 */
interface RewardsNavigationParams {
  page?: 'campaigns' | 'musd' | 'benefits';
  campaign?: 'ondo' | 'season1' | 'perps-comp' | 'predict-the-pitch' | 'money';
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
  const campaignParam = urlParams.get('campaign') ?? urlParams.get('~campaign');

  return {
    page: (['campaigns', 'musd', 'benefits'].includes(pageParam ?? '')
      ? pageParam
      : undefined) as RewardsNavigationParams['page'],
    campaign: ([
      'ondo',
      'season1',
      'perps-comp',
      'predict-the-pitch',
      'money',
    ].includes(campaignParam ?? '')
      ? campaignParam
      : undefined) as RewardsNavigationParams['campaign'],
  };
};

/**
 * True when a route is already registered somewhere in the navigation tree.
 * Either Rewards home stays mounted after the Rewards tab is opened, including
 * while the user is on another tab.
 */
const navigationStateContainsRoute = (
  state: NavigationStateLike | undefined,
  routeName: string,
): boolean =>
  state?.routes?.some(
    (route) =>
      route.name === routeName ||
      navigationStateContainsRoute(route.state, routeName),
  ) ?? false;

const REWARDS_HOME_ROUTES = [
  Routes.REWARDS_DASHBOARD,
  Routes.REWARDS_MONEY_DASHBOARD,
] as const;

const isRewardsHomeMounted = (): boolean => {
  try {
    const state = NavigationService.navigation.getRootState();
    return REWARDS_HOME_ROUTES.some((routeName) =>
      navigationStateContainsRoute(state, routeName),
    );
  } catch {
    return false;
  }
};

/**
 * RewardsHome reads the pending deeplink and pushes the sub-page itself.
 * Also navigating to RewardsView from the root container pushes the fallback
 * RewardsHome, and that navigate is deferred to the next frame — so it lands
 * on top of the sub-page that was just opened.
 */
const shouldLeaveMountedDashboardInPlace = (rewardsPath: string): boolean => {
  const { page, campaign } = parseRewardsNavigationParams(rewardsPath);
  if (!page && !campaign) {
    return false;
  }
  return isRewardsHomeMounted();
};
/**
 * Rewards deeplink handler with extensible parameter support
 *
 * @param rewardsPath - Rewards URL path with query parameters
 *
 * Supported URL formats:
 * - https://link.metamask.io/rewards
 * - https://link.metamask.io/rewards?page=campaigns
 * - https://link.metamask.io/rewards?page=musd
 * - https://link.metamask.io/rewards?page=benefits
 * - https://link.metamask.io/rewards?campaign=ondo
 * - https://link.metamask.io/rewards?campaign=season1
 * - https://link.metamask.io/rewards?campaign=perps-comp
 * - https://link.metamask.io/rewards?campaign=predict-the-pitch
 * - https://link.metamask.io/rewards?campaign=money
 */
const prepareRewardsDeeplink = (rewardsPath: string) => {
  // Parse navigation parameters from URL
  const urlParams = parseRewardsNavigationParams(rewardsPath);
  DevLogger.log('[handleRewardsUrl] Parsed URL parameters:', urlParams);

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
  } else {
    ReduxService.store.dispatch(setPendingDeeplink(null));
  }
};

export const createRewardsDeeplinkIntent = ({
  rewardsPath,
}: HandleRewardsUrlParams): DeeplinkIntent => ({
  target: {
    type: 'home-tab',
    routeName: Routes.REWARDS_VIEW,
  },
  prepare: () => prepareRewardsDeeplink(rewardsPath),
});

export const handleRewardsUrl = async ({
  rewardsPath,
}: HandleRewardsUrlParams) => {
  DevLogger.log(
    '[handleRewardsUrl] Starting rewards deeplink handling with path:',
    rewardsPath,
  );
  Logger.log(`[handleRewardsUrl] Raw rewardsPath received: "${rewardsPath}"`);

  try {
    const intent = createRewardsDeeplinkIntent({ rewardsPath });
    if (shouldLeaveMountedDashboardInPlace(rewardsPath)) {
      await intent.prepare?.();
      return;
    }
    await executeDeeplinkIntent(intent);
  } catch (error) {
    DevLogger.log('Failed to handle rewards deeplink:', error);
    // Fallback to wallet home on error
    NavigationService.navigation.navigate(Routes.WALLET_VIEW, {
      screen: Routes.WALLET_VIEW,
    });
  }
};
