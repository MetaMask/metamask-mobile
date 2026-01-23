import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Animated,
  ScrollView,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  Platform,
} from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import {
  IconName as DSIconName,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsStocksCommoditiesBottomSheet from '../../components/PerpsStocksCommoditiesBottomSheet';
import PerpsMarketFiltersBar from './components/PerpsMarketFiltersBar';
import PerpsMarketList from '../../components/PerpsMarketList';
import {
  usePerpsMarketListView,
  usePerpsMeasurement,
  usePerpsNavigation,
} from '../../hooks';
import { usePerpsLivePositions, usePerpsLiveAccount } from '../../hooks/stream';
import PerpsMarketRowSkeleton from './components/PerpsMarketRowSkeleton';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import type { PerpsMarketData } from '../../controllers/types';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TraceName } from '../../../../../util/trace';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsNavigationParamList } from '../../types/navigation';

const PerpsMarketListView = ({
  onMarketSelect,
  protocolId: _protocolId,
  variant: propVariant,
  title: propTitle,
  showBalanceActions: propShowBalanceActions,
  defaultSearchVisible: propDefaultSearchVisible,
  showWatchlistOnly: propShowWatchlistOnly,
}: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();

  // Use centralized navigation hook
  const perpsNavigation = usePerpsNavigation();

  // Merge route params with props (route params take precedence)
  const variant = route.params?.variant ?? propVariant ?? 'full';
  const title = route.params?.title ?? propTitle;
  const showBalanceActions =
    route.params?.showBalanceActions ?? propShowBalanceActions ?? true;
  const defaultSearchVisible =
    route.params?.defaultSearchVisible ?? propDefaultSearchVisible ?? false;
  const showWatchlistOnly =
    route.params?.showWatchlistOnly ?? propShowWatchlistOnly ?? false;
  const defaultMarketTypeFilter =
    route.params?.defaultMarketTypeFilter ?? 'all';

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const tabScrollViewRef = useRef<ScrollView>(null);
  const isScrollingProgrammatically = useRef(false);
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);
  const [isStocksCommoditiesSheetVisible, setIsStocksCommoditiesSheetVisible] =
    useState(false);
  const [stocksCommoditiesFilter, setStocksCommoditiesFilter] = useState<
    'all' | 'equity' | 'commodity'
  >('all');
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get('window').width,
  );

  // Use the combined market list view hook for all business logic
  const {
    markets: filteredMarkets,
    searchState,
    sortState,
    favoritesState,
    marketTypeFilterState,
    marketCounts,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarketListView({
    defaultSearchVisible,
    enablePolling: false,
    showWatchlistOnly,
    defaultMarketTypeFilter,
    showZeroVolume: __DEV__, // Only show $0.00 volume markets in development
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
  const { selectedOptionId, sortBy, direction, handleOptionChange } = sortState;

  // Destructure favorites state for easier access
  const { showFavoritesOnly } = favoritesState;

  // Destructure market type filter state
  const { marketTypeFilter, setMarketTypeFilter } = marketTypeFilterState;

  // Handler for market press (defined early to avoid use-before-define)
  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      if (onMarketSelect) {
        onMarketSelect(market);
      } else {
        perpsNavigation.navigateToMarketDetails(market, route.params?.source);
      }
    },
    [onMarketSelect, perpsNavigation, route.params?.source],
  );

  // Apply stocks/commodities sub-filter when on Stocks tab
  const displayMarkets = useMemo(() => {
    // If on stocks_and_commodities tab and sub-filter is active, apply it
    if (
      marketTypeFilter === 'stocks_and_commodities' &&
      stocksCommoditiesFilter !== 'all'
    ) {
      return filteredMarkets.filter(
        (m) => m.marketType === stocksCommoditiesFilter,
      );
    }
    // Otherwise, use markets already filtered by the hook
    return filteredMarkets;
  }, [filteredMarkets, marketTypeFilter, stocksCommoditiesFilter]);

  // Build tabs data for TabsBar
  const tabsData = useMemo(() => {
    const tabs = [];
    const hasCryptoOrStocksCommodities =
      marketCounts.crypto > 0 ||
      marketCounts.equity > 0 ||
      marketCounts.commodity > 0;

    // Only show tabs if there are relevant markets
    if (hasCryptoOrStocksCommodities) {
      // Tab 1: All (Crypto + Stocks + Commodities)
      tabs.push({
        key: 'all-tab',
        label: strings('perps.home.tabs.all'),
        filter: 'all' as const,
      });

      // Tab 2: Crypto (only if crypto markets exist)
      if (marketCounts.crypto > 0) {
        tabs.push({
          key: 'crypto-tab',
          label: strings('perps.home.tabs.crypto'),
          filter: 'crypto' as const,
        });
      }

      // Tab 3: Stocks and Commodities (only if stocks or commodities exist)
      if (marketCounts.equity > 0 || marketCounts.commodity > 0) {
        tabs.push({
          key: 'stocks-and-commodities-tab',
          label: strings('perps.home.tabs.stocks_and_commodities'),
          filter: 'stocks_and_commodities' as const,
        });
      }
    }

    return tabs;
  }, [marketCounts]);

  // Calculate active tab index from current marketTypeFilter
  const activeTabIndex = useMemo(() => {
    if (tabsData.length === 0) {
      return 0;
    }

    // Map filter to tab key
    const filterToKeyMap: Record<string, string> = {
      all: 'all-tab',
      crypto: 'crypto-tab',
      stocks_and_commodities: 'stocks-and-commodities-tab',
      // Legacy mappings for backwards compatibility
      equity: 'stocks-and-commodities-tab',
      commodity: 'stocks-and-commodities-tab',
    };

    const targetKey = filterToKeyMap[marketTypeFilter] || 'all-tab';
    const index = tabsData.findIndex((tab) => tab.key === targetKey);
    return index >= 0 ? index : 0;
  }, [marketTypeFilter, tabsData]);

  const { track } = usePerpsEventTracking();

  // Handle tab press
  const handleTabPress = useCallback(
    (index: number) => {
      const tab = tabsData[index];
      if (tab) {
        // Map filter to button_clicked value (only track crypto and stocks tabs)
        const targetTab =
          tab.filter === 'crypto'
            ? PerpsEventValues.BUTTON_CLICKED.CRYPTO
            : tab.filter === 'stocks_and_commodities'
              ? PerpsEventValues.BUTTON_CLICKED.STOCKS
              : null;

        if (targetTab) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PerpsEventProperties.INTERACTION_TYPE]:
              PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
            [PerpsEventProperties.BUTTON_CLICKED]: targetTab,
            [PerpsEventProperties.BUTTON_LOCATION]:
              PerpsEventValues.BUTTON_LOCATION.MARKET_LIST,
          });
        }
        setMarketTypeFilter(tab.filter);
      }
    },
    [tabsData, setMarketTypeFilter, track],
  );

  // Handle scroll to sync active tab (for swipe gestures)
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      // Ignore programmatic scrolls to prevent feedback loop with useEffect
      if (isScrollingProgrammatically.current) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / containerWidth);
      if (index >= 0 && index < tabsData.length) {
        const tab = tabsData[index];
        if (tab && tab.filter !== marketTypeFilter) {
          setMarketTypeFilter(tab.filter);
        }
      }
    },
    [containerWidth, tabsData, marketTypeFilter, setMarketTypeFilter],
  );

  // Sync scroll position when active tab changes (e.g., from tab bar press or navigation param)
  useEffect(() => {
    if (
      tabScrollViewRef.current &&
      activeTabIndex >= 0 &&
      tabsData.length > 0
    ) {
      isScrollingProgrammatically.current = true;
      tabScrollViewRef.current.scrollTo({
        x: activeTabIndex * containerWidth,
        animated: true,
      });
      // Clear flag after animation completes (~300ms animation + 50ms buffer)
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 350);
    }
  }, [activeTabIndex, containerWidth, tabsData.length]);

  useEffect(() => {
    if (displayMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [displayMarkets.length, fadeAnimation]);

  // Reset stocks/commodities filter to 'all' when switching tabs
  // This ensures that when switching to the Stocks tab, it always shows both stocks and commodities
  // (user can then filter if needed), and when switching away, the filter is reset for next time
  useEffect(() => {
    setStocksCommoditiesFilter('all');
  }, [marketTypeFilter]);

  // Use navigation hook for back button
  const handleBackPressed = perpsNavigation.navigateBack;

  const handleSearchToggle = useCallback(() => {
    // Toggle search visibility
    toggleSearchVisibility();

    if (isSearchVisible) {
      // When disabling search, clear the query
      clearSearch();
    } else {
      // When enabling search, track the event
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.SEARCH_CLICKED,
      });
    }
  }, [isSearchVisible, toggleSearchVisibility, clearSearch, track]);

  // Performance tracking: Measure screen load time until market data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView,
    conditions: [displayMarkets.length > 0],
  });

  // Track markets screen viewed event
  const source =
    route.params?.source || PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON;

  // Get perp balance status and provider info for tracking
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 5000 });
  const livePositions = usePerpsLivePositions({ throttleMs: 5000 });
  const hasPerpBalance =
    livePositions.positions.length > 0 ||
    (!!perpsAccount?.totalBalance && parseFloat(perpsAccount.totalBalance) > 0);

  // Extract button_clicked and button_location from route params
  const buttonClicked = route.params?.button_clicked;
  const buttonLocation = route.params?.button_location;

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [displayMarkets.length > 0],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.MARKET_LIST,
      [PerpsEventProperties.SOURCE]: source,
      [PerpsEventProperties.HAS_PERP_BALANCE]: hasPerpBalance,
      ...(buttonClicked && {
        [PerpsEventProperties.BUTTON_CLICKED]: buttonClicked,
      }),
      ...(buttonLocation && {
        [PerpsEventProperties.BUTTON_LOCATION]: buttonLocation,
      }),
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
            <PerpsMarketRowSkeleton
              key={index}
              testID={PerpsMarketListViewSelectorsIDs.SKELETON_ROW}
            />
          ))}
        </View>
      );
    }

    // Error (Failed to load markets)
    if (error && displayMarkets.length === 0) {
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
    if (showFavoritesOnly && displayMarkets.length === 0) {
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
    if (isSearchVisible && displayMarkets.length === 0) {
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
          markets={displayMarkets}
          onMarketPress={handleMarketPress}
          sortBy={sortBy}
          showBadge={false}
          testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {isSearchVisible ? (
        <Pressable
          style={styles.header}
          onPress={() => Keyboard.dismiss()}
          testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        >
          <View style={styles.headerContainerWrapper}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName={`flex-1 bg-muted rounded-lg ${Platform.OS === 'ios' ? 'py-3' : 'py-1'} px-3 mr-2`}
            >
              <Icon
                name={IconName.Search}
                size={IconSize.Sm}
                color={IconColor.Alternative}
                style={tw.style('mr-2')}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={strings('perps.search_by_token_symbol')}
                placeholderTextColor={colors.text.muted}
                autoFocus
                style={tw.style('flex-1 text-base text-default')}
                testID={`${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-bar`}
              />
            </Box>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchToggle}
              testID={`${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-close`}
            >
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('perps.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      ) : (
        <HeaderCenter
          title={title || strings('perps.home.markets')}
          onBack={handleBackPressed}
          backButtonProps={{ testID: 'back-button' }}
          endButtonIconProps={[
            {
              iconName: DSIconName.Search,
              onPress: handleSearchToggle,
              testID: `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-search-toggle`,
            },
          ]}
          testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        />
      )}

      {/* Balance Actions Component - Only show in full variant when search not visible */}
      {!isSearchVisible && showBalanceActions && variant === 'full' && (
        <PerpsMarketBalanceActions />
      )}

      {/* Market Type Tabs - Only visible when search is NOT active and tabs exist */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        tabsData.length > 0 && (
          <View style={styles.tabsContainer}>
            {/* Tab Bar */}
            <TabsBar
              tabs={tabsData.map((tab) => ({
                key: tab.key,
                label: tab.label,
                content: null,
                isDisabled: false,
              }))}
              activeIndex={activeTabIndex}
              onTabPress={handleTabPress}
              testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
            />

            {/* Filter Bar - Between tabs and content */}
            {(displayMarkets.length > 0 || showFavoritesOnly) && (
              <PerpsMarketFiltersBar
                selectedOptionId={selectedOptionId}
                onSortPress={() => setIsSortFieldSheetVisible(true)}
                showStocksCommoditiesDropdown={false}
                stocksCommoditiesFilter={stocksCommoditiesFilter}
                onStocksCommoditiesPress={() =>
                  setIsStocksCommoditiesSheetVisible(true)
                }
                testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
              />
            )}

            {/* Tab Content - Swipeable */}
            <ScrollView
              ref={tabScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onLayout={(event) => {
                setContainerWidth(event.nativeEvent.layout.width);
              }}
              style={styles.tabScrollView}
            >
              {tabsData.map((tab) => (
                <View
                  key={tab.key}
                  style={[
                    styles.tabContentContainer,
                    { width: containerWidth },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.animatedListContainer,
                      { opacity: fadeAnimation },
                    ]}
                  >
                    <PerpsMarketList
                      markets={displayMarkets}
                      onMarketPress={handleMarketPress}
                      sortBy={sortBy}
                      showBadge={false}
                      contentContainerStyle={styles.tabContentContainer}
                      testID={`${PerpsMarketListViewSelectorsIDs.MARKET_LIST}-${tab.filter}`}
                    />
                  </Animated.View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      {/* Market list when no tabs shown (rare case) */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        tabsData.length === 0 && (
          <View style={styles.listContainerWithTabBar}>
            {renderMarketList()}
          </View>
        )}

      {/* Show regular list when searching or loading */}
      {(isSearchVisible || isLoadingMarkets || error) && (
        <View style={styles.listContainerWithTabBar}>{renderMarketList()}</View>
      )}

      {/* Sort Field Bottom Sheet */}
      <PerpsMarketSortFieldBottomSheet
        isVisible={isSortFieldSheetVisible}
        onClose={() => setIsSortFieldSheetVisible(false)}
        selectedOptionId={selectedOptionId}
        sortDirection={direction}
        onOptionSelect={handleOptionChange}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-field-sheet`}
      />

      {/* Stocks/Commodities Filter Bottom Sheet */}
      <PerpsStocksCommoditiesBottomSheet
        isVisible={isStocksCommoditiesSheetVisible}
        onClose={() => setIsStocksCommoditiesSheetVisible(false)}
        selectedFilter={stocksCommoditiesFilter}
        onFilterSelect={setStocksCommoditiesFilter}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-stocks-commodities-sheet`}
      />
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
