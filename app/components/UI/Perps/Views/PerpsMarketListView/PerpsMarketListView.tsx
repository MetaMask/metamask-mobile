import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { View, Animated, ScrollView, Dimensions } from 'react-native';
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
import TabsBar from '../../../../../component-library/components-temp/Tabs/TabsBar';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsStocksCommoditiesBottomSheet from '../../components/PerpsStocksCommoditiesBottomSheet';
import PerpsMarketFiltersBar from './components/PerpsMarketFiltersBar';
import PerpsMarketList from '../../components/PerpsMarketList';
import PerpsMarketListHeader from '../../components/PerpsMarketListHeader';
import {
  usePerpsMarketListView,
  usePerpsMeasurement,
  usePerpsNavigation,
} from '../../hooks';
import PerpsMarketRowSkeleton from './components/PerpsMarketRowSkeleton';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import type { PerpsMarketData } from '../../controllers/types';
import { PerpsMarketListViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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
  const { selectedOptionId, sortBy, handleOptionChange } = sortState;

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

  // Get filtered markets for specific tab (used within each tab)
  const getFilteredMarketsForTab = useCallback(
    (filter: 'all' | 'crypto' | 'stocks_and_commodities') => {
      if (searchQuery.trim()) {
        // When searching, show all search results (filtering handled by search)
        return filteredMarkets;
      }

      // Filter by tab when not searching
      if (filter === 'all') {
        // All = Crypto + Stocks + Commodities (excluding forex)
        return filteredMarkets.filter(
          (m) =>
            !m.marketType ||
            m.marketType === 'equity' ||
            m.marketType === 'commodity',
        );
      }
      if (filter === 'crypto') {
        // Crypto markets have no marketType set
        return filteredMarkets.filter((m) => !m.marketType);
      }
      if (filter === 'stocks_and_commodities') {
        // Combined stocks and commodities filter - apply sub-filter
        let stocksCommoditiesMarkets = filteredMarkets.filter(
          (m) => m.marketType === 'equity' || m.marketType === 'commodity',
        );

        // Apply stocks/commodities sub-filter if not 'all'
        if (stocksCommoditiesFilter !== 'all') {
          stocksCommoditiesMarkets = stocksCommoditiesMarkets.filter(
            (m) => m.marketType === stocksCommoditiesFilter,
          );
        }

        return stocksCommoditiesMarkets;
      }
      return filteredMarkets;
    },
    [filteredMarkets, searchQuery, stocksCommoditiesFilter],
  );

  // Market type tab content component (filters markets by tab type)
  // tabLabel is extracted by TabsList component for display, not used here
  const MarketTypeTabContent = useCallback(
    ({
      tabFilter,
      tabLabel: _tabLabel,
    }: {
      tabFilter: 'all' | 'crypto' | 'stocks_and_commodities';
      tabLabel: string;
    }) => {
      const tabMarkets = getFilteredMarketsForTab(tabFilter);
      return (
        <Animated.View
          style={[styles.animatedListContainer, { opacity: fadeAnimation }]}
        >
          <PerpsMarketList
            markets={tabMarkets}
            onMarketPress={handleMarketPress}
            sortBy={sortBy}
            showBadge={false}
            contentContainerStyle={styles.tabContentContainer}
            testID={`${PerpsMarketListViewSelectorsIDs.MARKET_LIST}-${tabFilter}`}
          />
        </Animated.View>
      );
    },
    [
      getFilteredMarketsForTab,
      handleMarketPress,
      sortBy,
      fadeAnimation,
      styles.animatedListContainer,
      styles.tabContentContainer,
    ],
  );

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

  // Build tab content components
  const tabsToRender = useMemo(
    () =>
      tabsData.map((tab) => (
        <MarketTypeTabContent
          key={tab.key}
          tabFilter={tab.filter}
          tabLabel={tab.label}
        />
      )),
    [tabsData, MarketTypeTabContent],
  );

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

  // Handle tab press
  const handleTabPress = useCallback(
    (index: number) => {
      const tab = tabsData[index];
      if (tab) {
        setMarketTypeFilter(tab.filter);
      }
    },
    [tabsData, setMarketTypeFilter],
  );

  // Handle scroll to sync active tab
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
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

  // Sync scroll position when active tab changes (e.g., from navigation param)
  useEffect(() => {
    if (
      tabScrollViewRef.current &&
      activeTabIndex >= 0 &&
      tabsData.length > 0
    ) {
      tabScrollViewRef.current.scrollTo({
        x: activeTabIndex * containerWidth,
        animated: true,
      });
    }
  }, [activeTabIndex, containerWidth, tabsData.length]);

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filteredMarkets.length, fadeAnimation]);

  // Reset stocks/commodities filter to 'all' when switching tabs
  // This ensures that when switching to the Stocks tab, it always shows both stocks and commodities
  // (user can then filter if needed), and when switching away, the filter is reset for next time
  useEffect(() => {
    setStocksCommoditiesFilter('all');
  }, [marketTypeFilter]);

  const { track } = usePerpsEventTracking();

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
    conditions: [filteredMarkets.length > 0],
  });

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
            <PerpsMarketRowSkeleton
              key={index}
              testID={PerpsMarketListViewSelectorsIDs.SKELETON_ROW}
            />
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
          showBadge={false}
          testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
        />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Using extracted component */}
      <PerpsMarketListHeader
        title={title}
        isSearchVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchClear={() => setSearchQuery('')}
        onBack={handleBackPressed}
        onSearchToggle={handleSearchToggle}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
      />

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
                content: null, // Content is rendered separately in ScrollView
                isDisabled: false,
              }))}
              activeIndex={activeTabIndex}
              onTabPress={handleTabPress}
              testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
            />

            {/* Filter Bar - Between tabs and content */}
            {(filteredMarkets.length > 0 || showFavoritesOnly) && (
              <PerpsMarketFiltersBar
                selectedOptionId={selectedOptionId}
                onSortPress={() => setIsSortFieldSheetVisible(true)}
                showStocksCommoditiesDropdown={
                  marketTypeFilter === 'stocks_and_commodities'
                }
                stocksCommoditiesFilter={stocksCommoditiesFilter}
                onStocksCommoditiesPress={() =>
                  setIsStocksCommoditiesSheetVisible(true)
                }
                testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
              />
            )}

            {/* Tab Content - Scrollable */}
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
              {tabsToRender.map((tabContent, index) => (
                <View
                  key={tabsData[index]?.key || index}
                  style={[
                    styles.tabContentContainer,
                    { width: containerWidth },
                  ]}
                >
                  {tabContent}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      {/* Market list hidden when tabs are shown (tabs contain the list) */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        tabsToRender.length === 0 && (
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
