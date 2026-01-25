import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { View, Animated } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { IconName as DSIconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsMarketTypeBottomSheet from '../../components/PerpsMarketTypeBottomSheet';
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
import type {
  PerpsMarketData,
  MarketTypeFilter,
} from '../../controllers/types';
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
import PerpsMarketListHeader from '../../components/PerpsMarketListHeader';

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
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);
  const [isMarketTypeSheetVisible, setIsMarketTypeSheetVisible] =
    useState(false);
  const [isStocksCommoditiesSheetVisible, setIsStocksCommoditiesSheetVisible] =
    useState(false);
  const [stocksCommoditiesFilter, setStocksCommoditiesFilter] = useState<
    'all' | 'equity' | 'commodity'
  >('all');

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

  // Apply stocks/commodities sub-filter when on Stocks filter
  const displayMarkets = useMemo(() => {
    // If on stocks_and_commodities filter and sub-filter is active, apply it
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

  // Check if we should show market type dropdown (only when there are multiple market types)
  const showMarketTypeDropdown = useMemo(() => {
    const hasCrypto = marketCounts.crypto > 0;
    const hasStocksOrCommodities =
      marketCounts.equity > 0 || marketCounts.commodity > 0;
    // Show dropdown if there's more than one type of market
    return hasCrypto && hasStocksOrCommodities;
  }, [marketCounts]);

  const { track } = usePerpsEventTracking();

  // Handle market type filter change
  const handleMarketTypeSelect = useCallback(
    (filter: MarketTypeFilter) => {
      // Track analytics for filter changes (only track crypto and stocks)
      const targetFilter =
        filter === 'crypto'
          ? PerpsEventValues.BUTTON_CLICKED.CRYPTO
          : filter === 'stocks_and_commodities'
            ? PerpsEventValues.BUTTON_CLICKED.STOCKS
            : null;

      if (targetFilter) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
          [PerpsEventProperties.BUTTON_CLICKED]: targetFilter,
          [PerpsEventProperties.BUTTON_LOCATION]:
            PerpsEventValues.BUTTON_LOCATION.MARKET_LIST,
        });
      }
      setMarketTypeFilter(filter);
    },
    [setMarketTypeFilter, track],
  );

  useEffect(() => {
    if (displayMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [displayMarkets.length, fadeAnimation]);

  // Reset stocks/commodities filter to 'all' when switching market type
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
        <PerpsMarketListHeader
          title={title}
          isSearchVisible
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          onBack={handleBackPressed}
          onSearchToggle={handleSearchToggle}
          testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
        />
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

      {/* Filter Bar - Show when not loading and no error */}
      {!isSearchVisible && !isLoadingMarkets && !error && (
        <PerpsMarketFiltersBar
          selectedOptionId={selectedOptionId}
          onSortPress={() => setIsSortFieldSheetVisible(true)}
          showMarketTypeDropdown={showMarketTypeDropdown}
          marketTypeFilter={marketTypeFilter}
          onMarketTypePress={() => setIsMarketTypeSheetVisible(true)}
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

      {/* Market List - Single list with JavaScript filtering */}
      <View style={styles.listContainerWithTabBar}>{renderMarketList()}</View>

      {/* Sort Field Bottom Sheet */}
      <PerpsMarketSortFieldBottomSheet
        isVisible={isSortFieldSheetVisible}
        onClose={() => setIsSortFieldSheetVisible(false)}
        selectedOptionId={selectedOptionId}
        sortDirection={direction}
        onOptionSelect={handleOptionChange}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-field-sheet`}
      />

      {/* Market Type Filter Bottom Sheet */}
      <PerpsMarketTypeBottomSheet
        isVisible={isMarketTypeSheetVisible}
        onClose={() => setIsMarketTypeSheetVisible(false)}
        selectedFilter={marketTypeFilter}
        onFilterSelect={handleMarketTypeSelect}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-market-type-sheet`}
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
