import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { View, Animated } from 'react-native';
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
import {
  TabsList,
  type TabsListRef,
} from '../../../../../component-library/components-temp/Tabs';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
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
  const tabsListRef = useRef<TabsListRef>(null);
  const noPaddingContentStyle = useMemo(() => ({ paddingHorizontal: 0 }), []);
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);

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
    showZeroVolume: true, // Show $0.00 volume markets in list view
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

  // Market type tab content component (reusable for all types)
  const MarketTypeTabContent = useCallback(
    ({ tabLabel }: { tabLabel: string }) => (
      <Animated.View
        style={[styles.animatedListContainer, { opacity: fadeAnimation }]}
      >
        <PerpsMarketList
          markets={filteredMarkets}
          onMarketPress={handleMarketPress}
          sortBy={sortBy}
          showBadge={false}
          contentContainerStyle={noPaddingContentStyle}
          testID={`${PerpsMarketListViewSelectorsIDs.MARKET_LIST}-${tabLabel}`}
        />
      </Animated.View>
    ),
    [
      filteredMarkets,
      handleMarketPress,
      sortBy,
      fadeAnimation,
      styles.animatedListContainer,
      noPaddingContentStyle,
    ],
  );

  // Build tabs array dynamically based on available markets (hide empty tabs)
  const tabsToRender = useMemo(() => {
    const tabs = [];

    if (marketCounts.crypto > 0) {
      tabs.push(
        <MarketTypeTabContent
          key="crypto-tab"
          tabLabel={strings('perps.home.crypto')}
        />,
      );
    }

    if (marketCounts.equity > 0) {
      tabs.push(
        <MarketTypeTabContent
          key="equity-tab"
          tabLabel={strings('perps.home.stocks')}
        />,
      );
    }

    if (marketCounts.commodity > 0) {
      tabs.push(
        <MarketTypeTabContent
          key="commodity-tab"
          tabLabel={strings('perps.home.commodities')}
        />,
      );
    }

    if (marketCounts.forex > 0) {
      tabs.push(
        <MarketTypeTabContent
          key="forex-tab"
          tabLabel={strings('perps.home.forex')}
        />,
      );
    }

    return tabs;
  }, [marketCounts, MarketTypeTabContent]);

  // Calculate active tab index from current marketTypeFilter
  const activeTabIndex = useMemo(() => {
    if (marketTypeFilter === 'all' || tabsToRender.length === 0) {
      return 0; // Default to first tab
    }

    // Map filter to index based on available tabs
    const filterToKeyMap = {
      crypto: 'crypto-tab',
      equity: 'equity-tab',
      commodity: 'commodity-tab',
      forex: 'forex-tab',
    };

    const targetKey =
      filterToKeyMap[marketTypeFilter as keyof typeof filterToKeyMap];
    const index = tabsToRender.findIndex((tab) => tab.key === targetKey);
    return index >= 0 ? index : 0;
  }, [marketTypeFilter, tabsToRender]);

  // Handle tab change (when user swipes)
  const handleTabChange = useCallback(
    ({ i }: { i: number }) => {
      // Map index back to market type filter
      const keyToFilterMap: Record<
        string,
        'crypto' | 'equity' | 'commodity' | 'forex'
      > = {
        'crypto-tab': 'crypto',
        'equity-tab': 'equity',
        'commodity-tab': 'commodity',
        'forex-tab': 'forex',
      };

      const tabKey = tabsToRender[i]?.key;
      const filter = tabKey ? keyToFilterMap[tabKey as string] : undefined;

      if (filter) {
        setMarketTypeFilter(filter);
      }
    },
    [tabsToRender, setMarketTypeFilter],
  );

  // Sync TabsList when active tab changes (e.g., from navigation param)
  useEffect(() => {
    if (tabsListRef.current && activeTabIndex >= 0 && tabsToRender.length > 0) {
      tabsListRef.current.goToTabIndex(activeTabIndex);
    }
  }, [activeTabIndex, tabsToRender.length]);

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

  // Use navigation hook for back button
  const handleBackPressed = perpsNavigation.navigateBack;

  const handleSearchToggle = () => {
    toggleSearchVisibility();

    if (isSearchVisible) {
      clearSearch();
    } else {
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
        onBack={handleBackPressed}
        onSearchToggle={handleSearchToggle}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
      />

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

      {/* Filter Bar - Only visible when search is NOT active */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        (filteredMarkets.length > 0 || showFavoritesOnly) && (
          <PerpsMarketFiltersBar
            selectedOptionId={selectedOptionId}
            onSortPress={() => setIsSortFieldSheetVisible(true)}
            showWatchlistOnly={showFavoritesOnly}
            onWatchlistToggle={handleFavoritesToggle}
            testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
          />
        )}

      {/* Market Type Tabs - Only visible when search is NOT active and tabs exist */}
      {!isSearchVisible &&
        !isLoadingMarkets &&
        !error &&
        tabsToRender.length > 0 && (
          <View style={styles.tabsContainer}>
            <TabsList
              ref={tabsListRef}
              onChangeTab={handleTabChange}
              key={`market-tabs-${tabsToRender.length}`}
            >
              {tabsToRender}
            </TabsList>
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
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
