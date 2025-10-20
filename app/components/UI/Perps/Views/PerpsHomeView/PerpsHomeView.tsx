import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import TabBarItem from '../../../../../component-library/components/Navigation/TabBarItem';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectRewardsEnabledFlag } from '../../../../../selectors/featureFlagController/rewards';
import { usePerpsHomeData } from '../../hooks/usePerpsHomeData';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsSearchBar from '../../components/PerpsSearchBar';
import PerpsCard from '../../components/PerpsCard';
import PerpsTrendingCarousel from '../../components/PerpsTrendingCarousel/PerpsTrendingCarousel';
import PerpsRecentActivityList from '../../components/PerpsRecentActivityList/PerpsRecentActivityList';
import { LEARN_MORE_CONFIG, SUPPORT_CONFIG } from '../../constants/perpsConfig';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import styleSheet from './PerpsHomeView.styles';
import { TraceName } from '../../../../../util/trace';
import { usePerpsMeasurement } from '../../hooks';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';

const PerpsHomeView = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);
  const { trackEvent, createEventBuilder } = useMetrics();

  // Track refreshing state
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Fetch all home screen data with search filtering
  const {
    positions,
    orders,
    trendingMarkets,
    recentActivity,
    isLoading,
    refresh,
  } = usePerpsHomeData({
    searchQuery: isSearchVisible ? searchQuery : '',
  });

  // Determine if any data is loading for initial load tracking
  // Orders and activity load via WebSocket instantly, only track positions and markets
  const isAnyLoading = isLoading.positions || isLoading.markets;

  // Performance tracking: Measure screen load time until data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView, // Keep same trace name for consistency
    conditions: [!isAnyLoading],
  });

  // Track home screen viewed event
  const source =
    route.params?.source || PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON;
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isAnyLoading],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]: PerpsEventValues.SCREEN_TYPE.MARKETS,
      [PerpsEventProperties.SOURCE]: source,
    },
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('Failed to refresh home data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      // Clear search when hiding search bar
      setSearchQuery('');
    }
  }, [isSearchVisible]);

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
    });
  }, [navigation]);

  const handleContactSupportPress = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.URL,
        title: strings(SUPPORT_CONFIG.TITLE_KEY),
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);

  // Modal handlers - now using navigation to modal stack
  const handleCloseAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    });
  }, [navigation]);

  const handleCancelAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
    });
  }, [navigation]);

  // Back button handler
  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Bottom tab bar navigation handlers
  const handleWalletPress = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const handleBrowserPress = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });
  }, [navigation]);

  const handleActionsPress = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WALLET_ACTIONS,
    });
  }, [navigation]);

  const handleActivityPress = useCallback(() => {
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [navigation]);

  const handleRewardsOrSettingsPress = useCallback(() => {
    if (isRewardsEnabled) {
      navigation.navigate(Routes.REWARDS_VIEW);
    } else {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: 'Settings',
      });
    }
  }, [navigation, isRewardsEnabled]);

  const renderBottomTabBar = () => (
    <View>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full pt-3 px-2 bg-default border-t border-muted gap-x-2"
        style={[tw.style(`pb-[${insets.bottom}px]`)]}
      >
        <View style={tw.style('flex-1')}>
          <TabBarItem
            label={strings('bottom_nav.home')}
            iconName={IconName.Home}
            onPress={handleWalletPress}
            isActive={false}
            testID="tab-bar-item-wallet"
          />
        </View>
        <View style={tw.style('flex-1')}>
          <TabBarItem
            label={strings('bottom_nav.browser')}
            iconName={IconName.Explore}
            onPress={handleBrowserPress}
            isActive={false}
            testID="tab-bar-item-browser"
          />
        </View>
        <View style={tw.style('flex-1')}>
          <TabBarItem
            label="Trade"
            iconName={IconName.SwapVertical}
            onPress={handleActionsPress}
            isActive
            isTradeButton
            testID="tab-bar-item-actions"
          />
        </View>
        <View style={tw.style('flex-1')}>
          <TabBarItem
            label={strings('bottom_nav.activity')}
            iconName={IconName.Activity}
            onPress={handleActivityPress}
            isActive={false}
            testID="tab-bar-item-activity"
          />
        </View>
        <View style={tw.style('flex-1')}>
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
            isActive={false}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={handleBackPress}
          size={ButtonIconSizes.Md}
          iconColor={IconColor.Default}
          testID="back-button"
        />
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.headerTitle}
        >
          {strings('perps.title')}
        </Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchToggle}
          testID="perps-home-search-toggle"
        >
          <Icon
            name={isSearchVisible ? IconName.Close : IconName.Search}
            size={IconSize.Lg}
            color={IconColor.Default}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar - Use reusable component */}
      {isSearchVisible && (
        <View style={styles.searchContainer}>
          <PerpsSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            testID="perps-home-search"
          />
        </View>
      )}

      {/* Main Content - ScrollView with all carousels */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary.default}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Actions Component */}
        <PerpsMarketBalanceActions />

        {/* Positions Section - Only show when there are positions */}
        {positions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
                {strings('perps.home.positions')}
              </Text>
              <TouchableOpacity onPress={handleCloseAllPress}>
                <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                  {strings('perps.home.close_all')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              {positions.map((position, index) => (
                <PerpsCard
                  key={`${position.coin}-${index}`}
                  position={position}
                  source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
                />
              ))}
            </View>
          </View>
        )}

        {/* Orders Section - Only show when there are orders */}
        {orders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
                {strings('perps.home.orders')}
              </Text>
              <TouchableOpacity onPress={handleCancelAllPress}>
                <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
                  {strings('perps.home.cancel_all')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              {orders.map((order) => (
                <PerpsCard
                  key={order.orderId}
                  order={order}
                  source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
                />
              ))}
            </View>
          </View>
        )}

        {/* Trending Markets Carousel */}
        <PerpsTrendingCarousel
          markets={trendingMarkets}
          isLoading={isLoading.markets}
        />

        {/* Recent Activity List */}
        <PerpsRecentActivityList fills={recentActivity} />

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Learn about perps */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLearnMorePress}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonTextContainer}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings(LEARN_MORE_CONFIG.TITLE_KEY)}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings(LEARN_MORE_CONFIG.DESCRIPTION_KEY)}
                </Text>
              </View>
              <Icon
                name={IconName.Arrow2Right}
                size={IconSize.Md}
                color={theme.colors.icon.default}
              />
            </View>
          </TouchableOpacity>

          {/* Contact support */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleContactSupportPress}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonTextContainer}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings(SUPPORT_CONFIG.TITLE_KEY)}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings(SUPPORT_CONFIG.DESCRIPTION_KEY)}
                </Text>
              </View>
              <Icon
                name={IconName.Arrow2Right}
                size={IconSize.Md}
                color={theme.colors.icon.default}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBarContainer}>{renderBottomTabBar()}</View>
    </SafeAreaView>
  );
};

export default PerpsHomeView;
