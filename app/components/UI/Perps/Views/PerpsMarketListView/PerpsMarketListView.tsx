import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Pressable,
  Keyboard,
} from 'react-native';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useStyles } from '../../../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import PerpsMarketSortDropdowns from '../../components/PerpsMarketSortDropdowns';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsMarketList from '../../components/PerpsMarketList';
import { usePerpsMarketListView } from '../../hooks/usePerpsMarketListView';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import type { PerpsMarketData } from '../../controllers/types';
import {
  PerpsMarketListViewSelectorsIDs,
  PerpsHomeViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  NavigationProp,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { usePerpsMeasurement } from '../../hooks';
import { TraceName } from '../../../../../util/trace';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { useSelector } from 'react-redux';
import { selectRewardsEnabledFlag } from '../../../../../selectors/featureFlagController/rewards';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TabBarItem from '../../../../../component-library/components/Navigation/TabBarItem';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { PerpsNavigationParamList } from '../../types/navigation';

const PerpsMarketRowItemSkeleton = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.skeletonContainer}
      testID={PerpsMarketListViewSelectorsIDs.SKELETON_ROW}
    >
      <View style={styles.skeletonLeftSection}>
        {/* Avatar skeleton */}
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View style={styles.skeletonTokenInfo}>
          <View style={styles.skeletonTokenHeader}>
            {/* Token symbol skeleton */}
            <Skeleton
              width={60}
              height={16}
              style={styles.skeletonTokenSymbol}
            />
            {/* Leverage skeleton */}
            <Skeleton width={30} height={14} style={styles.skeletonLeverage} />
          </View>
          {/* Volume skeleton */}
          <Skeleton width={80} height={12} style={styles.skeletonVolume} />
        </View>
      </View>
      <View style={styles.skeletonRightSection}>
        {/* Price skeleton */}
        <Skeleton width={90} height={16} style={styles.skeletonPrice} />
        {/* Change skeleton */}
        <Skeleton width={70} height={14} style={styles.skeletonChange} />
      </View>
    </View>
  );
};

const PerpsMarketListView = ({
  onMarketSelect,
  protocolId: _protocolId,
  variant: propVariant,
  title: propTitle,
  showBalanceActions: propShowBalanceActions,
  showBottomNav: propShowBottomNav,
  defaultSearchVisible: propDefaultSearchVisible,
  showWatchlistOnly: propShowWatchlistOnly,
}: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();

  // Merge route params with props (route params take precedence)
  const variant = route.params?.variant ?? propVariant ?? 'full';
  const title = route.params?.title ?? propTitle;
  const showBalanceActions =
    route.params?.showBalanceActions ?? propShowBalanceActions ?? true;
  const showBottomNav =
    route.params?.showBottomNav ?? propShowBottomNav ?? true;
  const defaultSearchVisible =
    route.params?.defaultSearchVisible ?? propDefaultSearchVisible ?? false;
  const showWatchlistOnly =
    route.params?.showWatchlistOnly ?? propShowWatchlistOnly ?? false;

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const hiddenButtonStyle = {
    position: 'absolute' as const,
    opacity: 0,
    pointerEvents: 'box-none' as const,
  };
  const [shouldShowNavbar, setShouldShowNavbar] = useState(true);
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  // Use the combined market list view hook for all business logic
  const {
    markets: filteredMarkets,
    searchState,
    sortState,
    favoritesState,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarketListView({
    defaultSearchVisible,
    enablePolling: false,
    showWatchlistOnly,
  });

  // Destructure search state for easier access
  const {
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    toggleSearchVisibility,
    clearSearch,
  } = searchState;

  // Destructure sort state for easier access
  const { selectedOptionId, sortBy, handleOptionChange } = sortState;

  // Destructure favorites state for easier access
  const { showFavoritesOnly, setShowFavoritesOnly } = favoritesState;

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filteredMarkets.length, fadeAnimation]);

  const { track } = usePerpsEventTracking();

  const handleMarketPress = (market: PerpsMarketData) => {
    if (onMarketSelect) {
      onMarketSelect(market);
    } else {
      navigation.navigate(Routes.PERPS.MARKET_DETAILS, {
        market,
        source: route.params?.source,
      });
    }
  };

  const handleBackPressed = () => {
    // Navigate back to the main Perps tab
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSearchToggle = () => {
    toggleSearchVisibility();

    if (isSearchVisible) {
      clearSearch();
      setShouldShowNavbar(true);
    } else {
      setShouldShowNavbar(false);
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.SEARCH_CLICKED,
      });
    }
  };

  const handleFavoritesToggle = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
  };

  // Performance tracking: Measure screen load time until market data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView,
    conditions: [filteredMarkets.length > 0],
  });

  // Render navbar when keyboard is dismissed. We hide the navbar to give extra room when the OS keyboard is visible.
  useEffect(() => {
    if (!isSearchVisible) return;

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setShouldShowNavbar(true);
    });

    return () => {
      hideSubscription?.remove();
    };
  }, [isSearchVisible]);

  // Track markets screen viewed event
  const source =
    route.params?.source || PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON;
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [filteredMarkets.length > 0],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]: PerpsEventValues.SCREEN_TYPE.MARKETS,
      [PerpsEventProperties.SOURCE]: source,
    },
  });

  const renderMarketList = () => {
    // Skeleton List - show immediately while loading
    if (isLoadingMarkets) {
      return (
        <View>
          {Array.from({ length: 8 }).map((_, index) => (
            //Using index as key is fine here because the list is static
            // eslint-disable-next-line react/no-array-index-key
            <View key={index}>
              <PerpsMarketRowItemSkeleton />
            </View>
          ))}
        </View>
      );
    }

    // Error (Failed to load markets)
    if (error && filteredMarkets.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Error}
            style={styles.errorText}
          >
            {strings('perps.failed_to_load_market_data')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.data_updates_automatically')}
          </Text>
        </View>
      );
    }

    // Empty favorites results - show when favorites filter is active but no favorites found
    if (showFavoritesOnly && filteredMarkets.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Icon
            name={IconName.Star}
            size={IconSize.Xl}
            color={theme.colors.icon.muted}
            style={styles.emptyStateIcon}
          />
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.emptyStateTitle}
          >
            {strings('perps.no_favorites_found')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.emptyStateDescription}
          >
            {strings('perps.no_favorites_description')}
          </Text>
        </View>
      );
    }

    // Empty search results - show when search is visible and no markets match
    if (isSearchVisible && filteredMarkets.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Icon
            name={IconName.Search}
            size={IconSize.Xl}
            color={theme.colors.icon.muted}
            style={styles.emptyStateIcon}
          />
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.emptyStateTitle}
          >
            {strings('perps.no_tokens_found')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.emptyStateDescription}
          >
            {searchQuery.trim()
              ? strings('perps.no_tokens_found_description', { searchQuery })
              : strings('perps.search_by_token_symbol')}
          </Text>
        </View>
      );
    }

    // Use reusable PerpsMarketList component
    return (
      <Animated.View
        style={[styles.animatedListContainer, { opacity: fadeAnimation }]}
      >
        <PerpsMarketList
          markets={filteredMarkets}
          onMarketPress={handleMarketPress}
          sortBy={sortBy}
          testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
        />
      </Animated.View>
    );
  };

  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  const renderBottomTabBar = () => {
    const handleWalletPress = () => {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    };

    const handleBrowserPress = () => {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
      });
    };

    const handleActionsPress = () => {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.WALLET_ACTIONS,
      });
    };

    const handleActivityPress = () => {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    };

    const handleRewardsOrSettingsPress = () => {
      if (isRewardsEnabled) {
        navigation.navigate(Routes.REWARDS_VIEW);
      } else {
        navigation.navigate(Routes.SETTINGS_VIEW, {
          screen: 'Settings',
        });
      }
    };

    return (
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
              testID={PerpsHomeViewSelectorsIDs.TAB_BAR_WALLET}
            />
          </View>
          <View style={tw.style('flex-1')}>
            <TabBarItem
              label={strings('bottom_nav.browser')}
              iconName={IconName.Explore}
              onPress={handleBrowserPress}
              isActive={false}
              testID={PerpsHomeViewSelectorsIDs.TAB_BAR_BROWSER}
            />
          </View>
          <View style={tw.style('flex-1')}>
            <TabBarItem
              label="Trade"
              iconName={IconName.SwapVertical}
              onPress={handleActionsPress}
              isActive
              isTradeButton
              testID={PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIONS}
            />
          </View>
          <View style={tw.style('flex-1')}>
            <TabBarItem
              label={strings('bottom_nav.activity')}
              iconName={IconName.Activity}
              onPress={handleActivityPress}
              isActive={false}
              testID={PerpsHomeViewSelectorsIDs.TAB_BAR_ACTIVITY}
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
                isRewardsEnabled
                  ? IconName.MetamaskFoxOutline
                  : IconName.Setting
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden close button for navigation tests */}
      <TouchableOpacity
        onPress={handleBackPressed}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        style={hiddenButtonStyle}
      />
      {/* Header */}
      <Pressable style={styles.header} onPress={() => Keyboard.dismiss()}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPressed}
          testID={PerpsMarketListViewSelectorsIDs.BACK_BUTTON}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            variant={TextVariant.HeadingLG}
            color={TextColor.Default}
            style={styles.headerTitle}
          >
            {title || strings('perps.title')}
          </Text>
        </View>
        <View style={styles.titleButtonsRightContainer}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchToggle}
            testID={PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON}
          >
            <Icon
              name={isSearchVisible ? IconName.Close : IconName.Search}
              size={IconSize.Lg}
            />
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Search Bar - Use design system component */}
      {isSearchVisible && (
        <View style={styles.searchContainer}>
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            showClearButton={searchQuery.length > 0}
            onPressClearButton={() => setSearchQuery('')}
            placeholder={strings('perps.search_by_token_symbol')}
            testID={PerpsMarketListViewSelectorsIDs.SEARCH_BAR}
          />
        </View>
      )}

      {/* Balance Actions Component - Only show in full variant when search not visible */}
      {!isSearchVisible && showBalanceActions && variant === 'full' && (
        <PerpsMarketBalanceActions />
      )}

      {/* Sort Dropdowns - Only visible when search is NOT active */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        (filteredMarkets.length > 0 || showFavoritesOnly) && (
          <PerpsMarketSortDropdowns
            selectedOptionId={selectedOptionId}
            onSortPress={() => setIsSortFieldSheetVisible(true)}
            testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
          />
        )}

      <View style={styles.listContainerWithTabBar}>{renderMarketList()}</View>

      {/* Bottom navbar - only show in full variant, hidden when search visible */}
      {showBottomNav && variant === 'full' && shouldShowNavbar && (
        <View style={styles.tabBarContainer}>{renderBottomTabBar()}</View>
      )}

      {/* Sort Field Bottom Sheet */}
      <PerpsMarketSortFieldBottomSheet
        isVisible={isSortFieldSheetVisible}
        onClose={() => setIsSortFieldSheetVisible(false)}
        selectedOptionId={selectedOptionId}
        onOptionSelect={handleOptionChange}
        showFavoritesOnly={showFavoritesOnly}
        onFavoritesToggle={handleFavoritesToggle}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-field-sheet`}
      />
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
