import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import {
  View,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
import PerpsMarketListEmptyState from './components/PerpsMarketListEmptyState';
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
  useFocusEffect,
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

  const { track } = usePerpsEventTracking();

  // Search-session tracking refs — shared by the debounced query effect and the
  // result-tap handler so time-to-tap / abandonment durations line up.
  const searchResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastEmittedSearchQueryRef = useRef<string>('');
  const lastEmittedSearchResultsCountRef = useRef<number>(0);
  const searchStartTimeRef = useRef<number | null>(null);
  const searchQueryCountRef = useRef<number>(0);
  // query awaiting the debounce (typed but not yet emitted). Flushed
  // on blur/unmount so a mid-debounce exit is never silently lost.
  const pendingSearchQueryRef = useRef<string | null>(null);
  // set when a search result is tapped so leaving the screen after a
  // tap is not counted as a search abandonment.
  const searchResultTappedRef = useRef(false);
  // Holds the latest flushPendingSearchQuery so handleMarketPress (defined
  // before it) can force the pending query to emit before the result-tap event,
  // keeping the funnel order query → tap. Assigned once the callback exists.
  const flushPendingSearchQueryRef = useRef<() => void>(() => {
    // Assigned below once flushPendingSearchQuery is defined.
  });

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
          const resultRank =
            filteredMarkets.findIndex((m) => m.symbol === market.symbol) + 1;
          const timeToTapMs =
            searchStartTimeRef.current !== null
              ? Date.now() - searchStartTimeRef.current
              : undefined;
          // A fast tap can land before the still-debouncing PERPS_SEARCH_QUERY
          // has fired. Flush it synchronously first so the funnel stream is
          // always query → tap, never tap → query.
          flushPendingSearchQueryRef.current();
          track(MetaMetricsEvents.PERPS_SEARCH_RESULT_TAPPED, {
            [PERPS_EVENT_PROPERTY.SEARCH_QUERY]: trimmedQuery.toLowerCase(),
            [PERPS_EVENT_PROPERTY.RESULTS_COUNT]: filteredMarkets.length,
            ...(resultRank > 0
              ? { [PERPS_EVENT_PROPERTY.RESULT_RANK]: resultRank }
              : {}),
            ...(timeToTapMs !== undefined
              ? { time_to_tap_ms: timeToTapMs }
              : {}),
            [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
          });
          searchResultTappedRef.current = true;
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
      filteredMarkets,
      track,
    ],
  );

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
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FILTER_APPLIED,
        [PERPS_EVENT_PROPERTY.FILTER_CATEGORY]: category,
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
    // The watchlist toggle is a filter control too, so emit filter_applied
    // alongside category filters for a complete filter funnel — but only when
    // APPLYING the filter, not when toggling it off (which clears the filter).
    if (willActivate) {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FILTER_APPLIED,
        [PERPS_EVENT_PROPERTY.FILTER_CATEGORY]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST,
      });
    }
    setShowFavoritesOnly(willActivate);
    if (willActivate) {
      setMarketTypeFilter('all');
    }
  }, [showFavoritesOnly, setShowFavoritesOnly, setMarketTypeFilter, track]);

  // Emit sort interaction, then apply the sort change to the list.
  const handleSortChange = useCallback<typeof handleOptionChange>(
    (optionId, field, sortDirection) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SORT_APPLIED,
        [PERPS_EVENT_PROPERTY.SORT_FIELD]: field,
        [PERPS_EVENT_PROPERTY.SORT_DIRECTION]: sortDirection,
      });
      handleOptionChange(optionId, field, sortDirection);
    },
    [handleOptionChange, track],
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

  const handleBackPressed = perpsNavigation.navigateBack;

  // emit the search query + results/no-results screen view.
  // Stored in a ref (event-callback pattern) so both the debounce timer and the
  // on-blur flush use the latest result count / filter context.
  const emitSearchQueryRef = useRef<
    (trimmedQuery: string, resultsSettled?: boolean) => void
  >(() => {
    // Assigned on every render below.
  });
  // `resultsSettled` defaults to true (the debounced emit only runs once the
  // markets list has settled). A blur/unmount flush while markets are still
  // loading passes false: the result count is unknown, so the count-dependent
  // props are omitted (never a stale/zero count) and no results screen view is
  // recorded, but the query is still emitted so it is never silently dropped.
  emitSearchQueryRef.current = (
    trimmedQuery: string,
    resultsSettled = true,
  ) => {
    const normalizedQuery = trimmedQuery.toLowerCase();
    const resultCount = filteredMarkets.length;
    const hasResults = resultCount > 0;
    const activeChips = [
      ...(showFavoritesOnly
        ? [PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST]
        : []),
      ...(marketTypeFilter !== 'all' ? [marketTypeFilter] : []),
    ];
    // mode: chips/category narrow the set → discovery; a short ticker-like
    // token → intent; free-text or empty context → browse.
    const mode = activeChips.length
      ? 'discovery'
      : /^[a-z0-9]{1,6}$/.test(normalizedQuery)
        ? 'intent'
        : 'browse';

    lastEmittedSearchQueryRef.current = normalizedQuery;
    if (resultsSettled) {
      lastEmittedSearchResultsCountRef.current = resultCount;
    }
    searchQueryCountRef.current += 1;

    track(MetaMetricsEvents.PERPS_SEARCH_QUERY, {
      [PERPS_EVENT_PROPERTY.SEARCH_QUERY]: normalizedQuery,
      query_text: normalizedQuery,
      query_length: normalizedQuery.length,
      ...(resultsSettled
        ? {
            [PERPS_EVENT_PROPERTY.RESULTS_COUNT]: resultCount,
            [PERPS_EVENT_PROPERTY.RESULT_COUNT]: resultCount,
            has_results: hasResults,
          }
        : {}),
      [PERPS_EVENT_PROPERTY.MODE]: mode,
      active_chips: activeChips,
      [PERPS_EVENT_PROPERTY.SOURCE]:
        PERPS_EVENT_VALUE.SOURCE.PERP_MARKET_SEARCH,
    });

    // A results/no-results screen view is only meaningful once the counts are
    // known; while loading no such screen has actually been shown yet.
    if (resultsSettled) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: hasResults
          ? PERPS_EVENT_VALUE.SCREEN_TYPE.SEARCH_RESULTS_SHOWN
          : PERPS_EVENT_VALUE.SCREEN_TYPE.SEARCH_NO_RESULTS,
        [PERPS_EVENT_PROPERTY.SEARCH_QUERY]: normalizedQuery,
        [PERPS_EVENT_PROPERTY.RESULT_COUNT]: resultCount,
      });
    }
  };

  // Latest loading state readable from stable callbacks without dep churn.
  const isLoadingMarketsRef = useRef(isLoadingMarkets);
  isLoadingMarketsRef.current = isLoadingMarkets;

  // Reset the FULL search-session state so a new session never inherits a prior
  // session's start time or query count. Called on every abandonment path
  // (explicit clear, blur, unmount).
  const resetSearchSession = useCallback(() => {
    if (searchResultTimerRef.current) {
      clearTimeout(searchResultTimerRef.current);
      searchResultTimerRef.current = null;
    }
    pendingSearchQueryRef.current = null;
    lastEmittedSearchQueryRef.current = '';
    lastEmittedSearchResultsCountRef.current = 0;
    searchStartTimeRef.current = null;
    searchQueryCountRef.current = 0;
  }, []);

  // Flush a query still awaiting the debounce so a blur/unmount records it
  // before we decide on abandonment — it is never silently lost. When the
  // markets list is still loading, the query is emitted with the count-dependent
  // props omitted (unknown mid-load) rather than dropped or reported with a
  // stale count.
  const flushPendingSearchQuery = useCallback(() => {
    if (searchResultTimerRef.current) {
      clearTimeout(searchResultTimerRef.current);
      searchResultTimerRef.current = null;
    }
    if (pendingSearchQueryRef.current) {
      emitSearchQueryRef.current(
        pendingSearchQueryRef.current,
        !isLoadingMarketsRef.current,
      );
      pendingSearchQueryRef.current = null;
    }
  }, []);
  flushPendingSearchQueryRef.current = flushPendingSearchQuery;

  const emitSearchAbandoned = useCallback(() => {
    if (!lastEmittedSearchQueryRef.current) {
      return;
    }
    track(MetaMetricsEvents.PERPS_SEARCH_ABANDONED, {
      [PERPS_EVENT_PROPERTY.SEARCH_QUERY]: lastEmittedSearchQueryRef.current,
      [PERPS_EVENT_PROPERTY.RESULTS_COUNT]:
        lastEmittedSearchResultsCountRef.current,
      query_count: searchQueryCountRef.current,
      ...(searchStartTimeRef.current !== null
        ? { time_in_search_ms: Date.now() - searchStartTimeRef.current }
        : {}),
    });
    lastEmittedSearchQueryRef.current = '';
    lastEmittedSearchResultsCountRef.current = 0;
  }, [track]);

  // Debounced Search Query tracking — fires ~500ms after the query stabilises.
  // Includes zero-result searches so analysts can measure failure. On an
  // explicit clear, emits SEARCH_ABANDONED for any emitted query and resets the
  // full search session. Emits the controller contract event PERPS_SEARCH_QUERY.
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      emitSearchAbandoned();
      resetSearchSession();
      return;
    }

    if (searchStartTimeRef.current === null) {
      searchStartTimeRef.current = Date.now();
    }

    if (searchResultTimerRef.current) {
      clearTimeout(searchResultTimerRef.current);
      searchResultTimerRef.current = null;
    }
    pendingSearchQueryRef.current = trimmedQuery;

    // Wait for results to settle before scheduling the debounced emit so the
    // reported result_count / has_results are never captured from the loading
    // state. This effect re-runs (and reschedules) when loading completes or the
    // result count changes, so the emitted count reflects the settled results.
    if (isLoadingMarkets) {
      return;
    }

    searchResultTimerRef.current = setTimeout(() => {
      emitSearchQueryRef.current(trimmedQuery);
      pendingSearchQueryRef.current = null;
      searchResultTimerRef.current = null;
    }, 500);

    return () => {
      if (searchResultTimerRef.current) {
        clearTimeout(searchResultTimerRef.current);
      }
    };
  }, [
    searchQuery,
    isLoadingMarkets,
    filteredMarkets.length,
    emitSearchAbandoned,
    resetSearchSession,
  ]);

  // Leaving the list with an emitted (or mid-debounce) un-tapped search query is
  // an abandonment (blur / unmount / tab switch), not only an explicit clear.
  // Flush any pending query first so it is counted, then abandon unless a result
  // was tapped, then reset the full session so the next search starts clean. The
  // suppressor is re-armed on focus so returning to an active search and leaving
  // again still counts.
  useFocusEffect(
    useCallback(() => {
      searchResultTappedRef.current = false;
      return () => {
        flushPendingSearchQuery();
        if (!searchResultTappedRef.current) {
          emitSearchAbandoned();
        }
        resetSearchSession();
      };
    }, [flushPendingSearchQuery, emitSearchAbandoned, resetSearchSession]),
  );

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
          <PerpsMarketListEmptyState
            containerTestID={PerpsMarketListViewSelectorsIDs.NO_RESULTS}
            title={strings('perps.no_tokens_found')}
            description={strings('perps.no_tokens_found_description', {
              searchQuery,
            })}
            ctaLabel={strings('perps.clear_search')}
            onCtaPress={() => setSearchQuery('')}
            ctaTestID={PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA}
          />
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

    const hasSearchQuery = searchQuery.trim().length > 0;
    const hasActiveFilter = marketTypeFilter !== 'all';

    // Filter-priority: both search and category filter active, no results.
    // Show a filter-aware description and a "Clear filter" CTA so the user
    // can widen results without losing their search term.
    if (hasSearchQuery && hasActiveFilter && filteredMarkets.length === 0) {
      return (
        <PerpsMarketListEmptyState
          containerTestID={PerpsMarketListViewSelectorsIDs.NO_RESULTS}
          title={strings('perps.no_markets_found')}
          description={strings('perps.no_markets_search_description', {
            searchQuery: searchQuery.trim(),
          })}
          ctaLabel={strings('perps.clear_filter')}
          onCtaPress={() => setMarketTypeFilter('all')}
          ctaTestID={PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA}
        />
      );
    }

    // Search-only: search active, no category filter, no results.
    if (hasSearchQuery && filteredMarkets.length === 0) {
      return (
        <PerpsMarketListEmptyState
          containerTestID={PerpsMarketListViewSelectorsIDs.NO_RESULTS}
          title={strings('perps.no_tokens_found')}
          description={strings('perps.no_tokens_found_description', {
            searchQuery,
          })}
          ctaLabel={strings('perps.clear_search')}
          onCtaPress={() => setSearchQuery('')}
          ctaTestID={PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA}
        />
      );
    }

    // Filter-only: category filter active, no search term, no results.
    if (hasActiveFilter && filteredMarkets.length === 0) {
      return (
        <PerpsMarketListEmptyState
          containerTestID={PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER}
          title={strings('perps.no_markets_found')}
          description={strings('perps.no_markets_found_description')}
          ctaLabel={strings('perps.clear_filter')}
          onCtaPress={() => setMarketTypeFilter('all')}
          ctaTestID={PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA}
        />
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
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
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
          marketCount={filteredMarkets.length}
          showWatchlistBadge={isWatchlistEnabled}
          isWatchlistSelected={showFavoritesOnly}
          onWatchlistToggle={handleWatchlistToggle}
          testID={PerpsMarketListViewSelectorsIDs.SORT_FILTERS}
        />
      )}

      {/* Market List - wrapped in KeyboardAvoidingView so empty-state CTAs
          remain visible and tappable when the search keyboard is open */}
      <KeyboardAvoidingView
        style={styles.listContainerWithTabBar}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderMarketList()}
      </KeyboardAvoidingView>

      {/* Sort Field Bottom Sheet */}
      <PerpsMarketSortFieldBottomSheet
        isVisible={isSortFieldSheetVisible}
        onClose={() => setIsSortFieldSheetVisible(false)}
        selectedOptionId={selectedOptionId}
        sortDirection={direction}
        onOptionSelect={handleSortChange}
        testID={`${PerpsMarketListViewSelectorsIDs.SORT_FILTERS}-field-sheet`}
      />
    </View>
  );
};

export default PerpsMarketListView;
