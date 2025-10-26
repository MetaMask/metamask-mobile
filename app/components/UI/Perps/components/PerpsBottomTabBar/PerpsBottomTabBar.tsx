import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import TabBarItem from '../../../../../component-library/components/Navigation/TabBarItem';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectRewardsEnabledFlag } from '../../../../../selectors/featureFlagController/rewards';
import { PerpsHomeViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import type { PerpsNavigationParamList } from '../../types/navigation';
import type { PerpsBottomTabBarProps } from './PerpsBottomTabBar.types';

/**
 * PerpsBottomTabBar Component
 *
 * Reusable bottom navigation tab bar for Perps standalone views
 * Shared by PerpsHomeView and PerpsMarketListView
 *
 * Features:
 * - Default navigation handlers for all tabs
 * - Optional custom handlers via props
 * - Rewards/Settings toggle based on feature flag
 * - Safe area inset handling for bottom padding
 * - Active tab highlighting
 *
 * @example
 * ```tsx
 * <PerpsBottomTabBar activeTab="trade" />
 * ```
 *
 * @example Custom handlers
 * ```tsx
 * <PerpsBottomTabBar
 *   activeTab="wallet"
 *   onWalletPress={customWalletHandler}
 * />
 * ```
 */
const PerpsBottomTabBar: React.FC<PerpsBottomTabBarProps> = ({
  activeTab,
  onWalletPress,
  onBrowserPress,
  onActionsPress,
  onActivityPress,
  onRewardsOrSettingsPress,
  testID,
}) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  // Default navigation handlers
  const defaultHandleWalletPress = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const defaultHandleBrowserPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });
  }, [navigation]);

  const defaultHandleActionsPress = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WALLET_ACTIONS,
    });
  }, [navigation]);

  const defaultHandleActivityPress = useCallback(() => {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation]);

  const defaultHandleRewardsOrSettingsPress = useCallback(() => {
    if (isRewardsEnabled) {
      navigation.navigate(Routes.REWARDS_VIEW);
    } else {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: 'Settings',
      });
    }
  }, [navigation, isRewardsEnabled]);

  // Use custom handlers if provided, otherwise use defaults
  const handleWalletPress = onWalletPress || defaultHandleWalletPress;
  const handleBrowserPress = onBrowserPress || defaultHandleBrowserPress;
  const handleActionsPress = onActionsPress || defaultHandleActionsPress;
  const handleActivityPress = onActivityPress || defaultHandleActivityPress;
  const handleRewardsOrSettingsPress =
    onRewardsOrSettingsPress || defaultHandleRewardsOrSettingsPress;

  return (
    <View testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.End}
        twClassName="w-full pt-3 mb-1 px-2 bg-default border-t border-muted"
        style={[tw.style(`pb-[${insets.bottom}px]`)]}
      >
        <View style={tw.style('flex-1 w-full')}>
          <TabBarItem
            label={strings('bottom_nav.home')}
            iconName={IconName.Home}
            onPress={handleWalletPress}
            isActive={activeTab === 'wallet'}
            testID={PerpsHomeViewSelectorsIDs.TAB_BAR_WALLET}
          />
        </View>
        <View style={tw.style('flex-1 w-full')}>
          <TabBarItem
            label={strings('bottom_nav.browser')}
            iconName={IconName.Explore}
            onPress={handleBrowserPress}
            isActive={activeTab === 'browser'}
            testID={PerpsHomeViewSelectorsIDs.TAB_BAR_BROWSER}
          />
        </View>
        <View style={tw.style('flex-1 w-full')}>
          <TabBarItem
            label="Trade"
            iconName={IconName.SwapVertical}
            onPress={handleActionsPress}
            isActive={activeTab === 'trade'}
            isTradeButton
            testID={PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIONS}
          />
        </View>
        <View style={tw.style('flex-1 w-full')}>
          <TabBarItem
            label={strings('bottom_nav.activity')}
            iconName={IconName.Activity}
            onPress={handleActivityPress}
            isActive={activeTab === 'activity'}
            testID={PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIVITY}
          />
        </View>
        <View style={tw.style('flex-1 w-full')}>
          <TabBarItem
            label={
              isRewardsEnabled
                ? strings('bottom_nav.rewards')
                : strings('bottom_nav.settings')
            }
            iconName={
              isRewardsEnabled ? IconName.MetamaskFoxOutline : IconName.Setting
            }
            onPress={handleRewardsOrSettingsPress}
            isActive={
              activeTab === 'rewards' ||
              (activeTab === 'settings' && !isRewardsEnabled)
            }
            testID={
              isRewardsEnabled
                ? 'tab-bar-item-rewards'
                : 'tab-bar-item-settings'
            }
          />
        </View>
      </Box>
    </View>
  );
};

export default PerpsBottomTabBar;
