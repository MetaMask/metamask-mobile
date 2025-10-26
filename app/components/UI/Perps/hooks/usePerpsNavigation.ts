import { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import type { PerpsNavigationParamList } from '../types/navigation';
import type { PerpsMarketData } from '../controllers/types';

/**
 * Navigation handler result interface
 */
export interface PerpsNavigationHandlers {
  // Main app navigation
  navigateToWallet: () => void;
  navigateToBrowser: () => void;
  navigateToActions: () => void;
  navigateToActivity: () => void;
  navigateToRewardsOrSettings: () => void;

  // Perps-specific navigation
  navigateToMarketDetails: (market: PerpsMarketData, source?: string) => void;
  navigateToHome: (source?: string) => void;
  navigateToMarketList: (
    params?: PerpsNavigationParamList['PerpsMarketListView'],
  ) => void;

  // Utility navigation
  navigateBack: () => void;
  canGoBack: boolean;
}

/**
 * usePerpsNavigation Hook
 *
 * Centralized navigation handlers for Perps views
 * Provides consistent navigation patterns across all Perps components
 *
 * Features:
 * - Main app navigation (wallet, browser, activity, etc.)
 * - Perps-specific navigation (market details, home, list)
 * - Back navigation with canGoBack check
 * - Rewards/Settings toggle based on feature flag
 *
 * @example
 * ```tsx
 * const {
 *   navigateToMarketDetails,
 *   navigateBack,
 *   canGoBack
 * } = usePerpsNavigation();
 *
 * const handleMarketPress = (market: PerpsMarketData) => {
 *   navigateToMarketDetails(market, 'home_screen');
 * };
 * ```
 *
 * @returns Object containing all navigation handler functions
 */
export const usePerpsNavigation = (): PerpsNavigationHandlers => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  // Main app navigation handlers
  const navigateToWallet = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const navigateToBrowser = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });
  }, [navigation]);

  const navigateToActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WALLET_ACTIONS,
    });
  }, [navigation]);

  const navigateToActivity = useCallback(() => {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation]);

  const navigateToRewardsOrSettings = useCallback(() => {
    if (isRewardsEnabled) {
      navigation.navigate(Routes.REWARDS_VIEW);
    } else {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: 'Settings',
      });
    }
  }, [navigation, isRewardsEnabled]);

  // Perps-specific navigation handlers
  const navigateToMarketDetails = useCallback(
    (market: PerpsMarketData, source?: string) => {
      navigation.navigate(Routes.PERPS.MARKET_DETAILS, {
        market,
        source,
      });
    },
    [navigation],
  );

  const navigateToHome = useCallback(
    (source?: string) => {
      navigation.navigate(Routes.PERPS.PERPS_HOME, {
        source,
      });
    },
    [navigation],
  );

  const navigateToMarketList = useCallback(
    (params?: PerpsNavigationParamList['PerpsMarketListView']) => {
      navigation.navigate(Routes.PERPS.MARKET_LIST, params);
    },
    [navigation],
  );

  // Utility navigation handlers
  const navigateBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const canGoBack = navigation.canGoBack();

  return {
    // Main app navigation
    navigateToWallet,
    navigateToBrowser,
    navigateToActions,
    navigateToActivity,
    navigateToRewardsOrSettings,

    // Perps-specific navigation
    navigateToMarketDetails,
    navigateToHome,
    navigateToMarketList,

    // Utility navigation
    navigateBack,
    canGoBack,
  };
};
