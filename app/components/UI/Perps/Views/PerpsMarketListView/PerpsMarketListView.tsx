import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { View, Animated, ScrollView } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch/TextFieldSearch';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsMarketSortFieldBottomSheet from '../../components/PerpsMarketSortFieldBottomSheet';
import PerpsMarketFiltersBar from './components/PerpsMarketFiltersBar';
import PerpsMarketList from '../../components/PerpsMarketList';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import {
  usePerpsMarketListView,
  usePerpsMeasurement,
  usePerpsNavigation,
} from '../../hooks';
import { selectPerpsWatchlistEnabledFlag } from '../../selectors/featureFlags';
import { usePerpsLivePositions, usePerpsLiveAccount } from '../../hooks/stream';
import PerpsMarketRowSkeleton from './components/PerpsMarketRowSkeleton';
import styleSheet from './PerpsMarketListView.styles';
import { PerpsMarketListViewProps } from './PerpsMarketListView.types';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
import {
  useRoute,
  RouteProp,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsNavigationParamList } from '../../types/navigation';
import { normalizeFilterKey } from '../../utils/marketCategoryMapping';

const PerpsMarketListView = ({
  onMarketSelect,
  protocolId: _protocolId,
  variant: propVariant,
  title: propTitle,
  showBalanceActions: propShowBalanceActions,
  showWatchlistOnly: propShowWatchlistOnly,
}: PerpsMarketListViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const listContentContainerStyle = useMemo(
    () => ({ paddingBottom: insets.bottom }),
    [insets.bottom],
  );
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();

  const perpsNavigation = usePerpsNavigation();
  const navigation = useNavigation();

  const variant = route.params?.variant ?? propVariant ?? 'full';
  const title = route.params?.title ?? propTitle;
  const showBalanceActions =
    route.params?.showBalanceActions ?? propShowBalanceActions ?? true;
  const showWatchlistOnly =
    route.params?.showWatchlistOnly ?? propShowWatchlistOnly ?? false;
  const defaultMarketTypeFilter =
    route.params?.defaultMarketTypeFilter ?? 'all';
  const defaultSortOptionId = route.params?.defaultSortOptionId;
  const defaultSortDirection = route.params?.defaultSortDirection;
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;

  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);

  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [isSortFieldSheetVisible, setIsSortFieldSheetVisible] = useState(false);

  const {
    markets: filteredMarkets,
    searchState,
    sortState,
    favoritesState,
    marketTypeFilterState,
    isLoading: isLoadingMarkets,
    error,
  } = usePerpsMarketListView({
    enablePolling: false,
    showWatchlistOnly,
    defaultMarketTypeFilter,
    defaultSortOptionId,
    defaultSortDirection,
    showZeroVolume: __DEV__,
  });

  const { searchQuery, setSearchQuery } = searchState;

  // Destructure sort state for easier access
  const { selectedOptionId, sortBy, direction, handleOptionChange } = sortState;

  // Destructure favorites state for easier access
  const {
    showFavoritesOnly,
    setShowFavoritesOnly,
    hasWatchlistMarkets,
    watchlistMarketObjects,
    suggestedMarkets,
  } = favoritesState;

  // Destructure market type filter state
  const { marketTypeFilter, setMarketTypeFilter } = marketTypeFilterState;

  // Handler for market press (defined early to avoid use-before-define)
  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      if (onMarketSelect) {
        onMarketSelect(market);
      } else {
        // Compute source_section so asset_details can include it in PERPS_SCREEN_VIEWED
        let source_section: string;
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
          source_section = PERPS_EVENT_VALUE.SOURCE_SECTION.ACTIVE_SEARCH;
        } else if (showFavoritesOnly) {
          source_section = PERPS_EVENT_VALUE.SOURCE_SECTION.WATCHLIST;
        } else if (marketTypeFilter !== 'all') {
          source_section =
            PERPS_EVENT_VALUE.SOURCE_SECTION[
              marketTypeFilter.toUpperCase() as keyof typeof PERPS_EVENT_VALUE.SOURCE_SECTION
            ] ?? marketTypeFilter;
        } else {
          source_section = PERPS_EVENT_VALUE.SOURCE_SECTION.ALL_MARKETS;
        }

        // Use push instead of navigate so that MARKET_LIST is always beneath
        // MARKET_DETAILS in the stack. navigate() can jump to an existing
        // MARKET_DETAILS entry (e.g. one opened from PerpsHome via the watchlist
        // component's ROOT-based navigation), which would skip MARKET_LIST on
        // back and land the user on PERPS_HOME instead.
        navigation.dispatch(
          StackActions.push(Routes.PERPS.MARKET_DETAILS, {
            market,
            source: PERPS_EVENT_VALUE.SOURCE.PERP_MARKETS,
            source_section,
            ...(transactionActiveAbTests?.length
              ? { transactionActiveAbTests }
              : {}),
          }),
        );
      }
    },
    [
      onMarketSelect,
      navigation,
      transactionActiveAbTests,
      searchQuery,
      showFavoritesOnly,
      marketTypeFilter,
    ],
  );

  const { track } = usePerpsEventTracking();

  // Handle category badge selection — clears watchlist filter (mutual exclusivity)
  const handleCategorySelect = useCallback(
    (category: MarketTypeFilter) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: category,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
      });
      setMarketTypeFilter(category);
      setShowFavoritesOnly(false);
    },
    [setMarketTypeFilter, setShowFavoritesOnly, track],
  );

  // Toggle watchlist-only filter — clears category filter (mutual exclusivity)
  const handleWatchlistToggle = useCallback(() => {
    const willActivate = !showFavoritesOnly;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
    });
    setShowFavoritesOnly(willActivate);
    if (willActivate) {
      setMarketTypeFilter('all');
    }
  }, [showFavoritesOnly, setShowFavoritesOnly, setMarketTypeFilter, track]);

  useEffect(() => {
    if (filteredMarkets.length > 0) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filteredMarkets.length, fadeAnimation]);

  const handleBackPressed = perpsNavigation.navigateBack;

  // Debounced search result_count tracking — fires ~600ms after the query/result
  // count stabilises. Includes zero-result searches so analysts can measure failure.
  const searchResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    if (searchResultTimerRef.current) {
      clearTimeout(searchResultTimerRef.current);
    }

    searchResultTimerRef.current = setTimeout(() => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SEARCH_CLICKED,
        [PERPS_EVENT_PROPERTY.RESULT_COUNT]: filteredMarkets.length,
      });
    }, 600);

    return () => {
      if (searchResultTimerRef.current) {
        clearTimeout(searchResultTimerRef.current);
      }
    };
  }, [searchQuery, filteredMarkets.length, track]);

  // Performance tracking: Measure screen load time until market data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView,
    conditions: [filteredMarkets.length > 0],
  });

  // Track markets screen viewed event
  const source =
    route.params?.source || PERPS_EVENT_VALUE.SOURCE.MAIN_ACTION_BUTTON;

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
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.MARKET_LIST,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      [PERPS_EVENT_PROPERTY.HAS_PERP_BALANCE]: hasPerpBalance,
      [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: showFavoritesOnly
        ? PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST
        : marketTypeFilter,
      ...(marketTypeFilter !== 'all' && {
        product_filter: normalizeFilterKey(marketTypeFilter),
      }),
      ...(buttonClicked && {
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: buttonClicked,
      }),
      ...(buttonLocation && {
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
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

    // Watchlist filter active — show watchlisted markets plus suggestions.
    // Mirrors PerpsHome behavior, without the collapsible "Show more" toggle.
    // Only reachable when the watchlist flag is enabled (pill is hidden otherwise).
    // When a search query is active both watchlist rows and suggested markets are
    // filtered inline so the user can find any relevant market by name or symbol.
    // "No tokens found" is only shown when nothing matches in either section.
    if (isWatchlistEnabled && showFavoritesOnly) {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      const visibleWatchlistMarkets = trimmedQuery
        ? watchlistMarketObjects.filter(
            (m) =>
              m.symbol.toLowerCase().includes(trimmedQuery) ||
              m.name.toLowerCase().includes(trimmedQuery),
          )
        : watchlistMarketObjects;
      const visibleSuggestedMarkets = trimmedQuery
        ? suggestedMarkets?.filter(
            (m) =>
              m.symbol.toLowerCase().includes(trimmedQuery) ||
              m.name.toLowerCase().includes(trimmedQuery),
          )
        : suggestedMarkets;

      if (
        trimmedQuery &&
        visibleWatchlistMarkets.length === 0 &&
        !visibleSuggestedMarkets?.length
      ) {
        return (
          <View
            style={styles.emptyStateContainer}
            testID={PerpsMarketListViewSelectorsIDs.NO_RESULTS}
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Xl}
              color={IconColor.IconMuted}
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
              {strings('perps.no_tokens_found_description', { searchQuery })}
            </Text>
          </View>
        );
      }

      return (
        <ScrollView
          style={styles.watchlistScrollContainer}
          contentContainerStyle={listContentContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          <PerpsWatchlistMarkets
            markets={visibleWatchlistMarkets}
            suggestedMarkets={visibleSuggestedMarkets}
            showHeader={false}
            enableShowMore={false}
            onMarketPress={handleMarketPress}
          />
        </ScrollView>
      );
    }

    // Empty search results - show when user has typed and no markets match
    if (searchQuery.trim() && filteredMarkets.length === 0) {
      return (
        <View
          style={styles.emptyStateContainer}
          testID={PerpsMarketListViewSelectorsIDs.NO_RESULTS}
        >
          <Icon
            name={IconName.Search}
            size={IconSize.Xl}
            color={IconColor.IconMuted}
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
          filterKey={marketTypeFilter}
          contentContainerStyle={listContentContainerStyle}
          testID={PerpsMarketListViewSelectorsIDs.MARKET_LIST}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderStandard
        includesTopInset
        title={title || strings('perps.home.markets')}
        onBack={handleBackPressed}
        backButtonProps={{
          testID: `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`,
        }}
        testID={PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}
      />

      {showBalanceActions && variant === 'full' && (
        <PerpsMarketBalanceActions />
      )}

      {!isLoadingMarkets && !error && (
        <View style={styles.searchBarRow}>
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            onPressClearButton={() => setSearchQuery('')}
            placeholder={strings('perps.search_by_token_symbol')}
            testID={PerpsMarketListViewSelectorsIDs.SEARCH_BAR}
            clearButtonProps={{
              testID: PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON,
            }}
          />
        </View>
      )}

      {!isLoadingMarkets && !error && (
        <PerpsMarketFiltersBar
          selectedOptionId={selectedOptionId}
          onSortPress={() => setIsSortFieldSheetVisible(true)}
          marketTypeFilter={marketTypeFilter}
          onCategorySelect={handleCategorySelect}
          showWatchlistBadge={isWatchlistEnabled}
          isWatchlistSelected={showFavoritesOnly}
          onWatchlistToggle={handleWatchlistToggle}
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
    </View>
  );
};

export default PerpsMarketListView;
