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
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
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

  // Compute available categories based on market counts (hide empty categories)
  const availableCategories = useMemo(() => {
    const categories: Exclude<MarketTypeFilter, 'all'>[] = [];
    if (marketCounts.crypto > 0) categories.push('crypto');
    if (marketCounts.equity > 0) categories.push('stocks');
    if (marketCounts.commodity > 0) categories.push('commodities');
    if (marketCounts.forex > 0) categories.push('forex');
    if (marketCounts.new > 0) categories.push('new');
    return categories;
  }, [marketCounts]);

  const { track } = usePerpsEventTracking();

  // Handle category badge selection
  const handleCategorySelect = useCallback(
    (category: MarketTypeFilter) => {
      // Track analytics for category changes
      const categoryMap: Record<string, string | null> = {
        crypto: PerpsEventValues.BUTTON_CLICKED.CRYPTO,
        stocks: PerpsEventValues.BUTTON_CLICKED.STOCKS,
        commodities: PerpsEventValues.BUTTON_CLICKED.COMMODITIES,
        forex: PerpsEventValues.BUTTON_CLICKED.FOREX,
        new: PerpsEventValues.BUTTON_CLICKED.NEW,
        all: null,
      };

      const targetCategory = categoryMap[category];
      if (targetCategory) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
          [PerpsEventProperties.BUTTON_CLICKED]: targetCategory,
          [PerpsEventProperties.BUTTON_LOCATION]:
            PerpsEventValues.BUTTON_LOCATION.MARKET_LIST,
        });
      }
      setMarketTypeFilter(category);
    },
    [setMarketTypeFilter, track],
  );

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filteredMarkets.length, fadeAnimation]);

  // Use navigation hook for back button
  const handleBackPressed = perpsNavigation.navigateBack;

  const handleSearchToggle = useCallback(() => {
    // Toggle search visibility
    toggleSearchVisibility();

    if (isSearchVisible) {
      // When disabling search, clear the query and reset category filter
      clearSearch();
      setMarketTypeFilter(defaultMarketTypeFilter);
    } else {
      // When enabling search, track the event
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.SEARCH_CLICKED,
      });
    }
  }, [
    isSearchVisible,
    toggleSearchVisibility,
    clearSearch,
    track,
    setMarketTypeFilter,
    defaultMarketTypeFilter,
  ]);

  // Performance tracking: Measure screen load time until market data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView,
    conditions: [filteredMarkets.length > 0],
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
    conditions: [filteredMarkets.length > 0],
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
          filterKey={`${marketTypeFilter}-${isSearchVisible ? 'search' : 'list'}`}
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
          backButtonProps={{
            testID: `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`,
          }}
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
          marketTypeFilter={marketTypeFilter}
          onCategorySelect={handleCategorySelect}
          availableCategories={availableCategories}
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
    </SafeAreaView>
  );
};

export default PerpsMarketListView;
