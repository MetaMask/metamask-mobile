import React, { useCallback, useMemo, useState } from 'react';
import { Modal, RefreshControl, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  sortMarkets,
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from '../../../UI/Perps/hooks/usePerpsEventTracking';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { usePerpsMarkets } from '../../../UI/Perps/hooks/usePerpsMarkets';
import { usePerpsSorting } from '../../../UI/Perps/hooks/usePerpsSorting';
import { useNowOnScreenFocus } from '../../../UI/Perps/hooks/useNowOnScreenFocus';
import { selectPerpsWatchlistMarkets } from '../../../UI/Perps/selectors/perpsController';
import { filterMarketsByCategory } from '../../../UI/Perps/utils/marketCategoryMapping';
import { isRecentlyListed } from '../../../UI/Perps/utils/time';
import { getSuggestedWatchlistMarkets } from '../../../UI/Perps/utils/marketUtils';
import { selectPerpsWatchlistEnabledFlag } from '../../../UI/Perps/selectors/featureFlags';
import PerpsMarketList from '../../../UI/Perps/components/PerpsMarketList';
import PerpsWatchlistMarkets from '../../../UI/Perps/components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import PerpsMarketFiltersBar from '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketFiltersBar';
import PerpsMarketSortFieldBottomSheet from '../../../UI/Perps/components/PerpsMarketSortFieldBottomSheet';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import Routes from '../../../../constants/navigation/Routes';
import PerpsRowSkeleton from '../../../UI/Perps/components/PerpsRowSkeleton';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { trackExploreInteracted } from '../search/analytics';
import PerpsSectionProvider from '../feeds/perps/PerpsSectionProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TopTradersSection from '../../Homepage/Sections/TopTraders/TopTradersSection';
import ModalSafeAreaProvider from '../../../../component-library/components-temp/ModalSafeAreaProvider';
import { useTheme } from '../../../../util/theme';
import type { TabProps } from '../hooks/useExploreRefresh';

/**
 * Header rendered above the market list. Contains the top-traders carousel
 * (reused from the homepage) and a section title for the market list below.
 * Scrolls away naturally as the FlashList scrolls; the filter bar (rendered
 * as `stickyHeader`) stays pinned.
 */
const PerpsTabListHeader: React.FC<{ showTopTraders: boolean }> = ({
  showTopTraders,
}) => (
  <Box>
    {showTopTraders && <TopTradersSection source="explore_perps" />}
    {showTopTraders && <SectionDivider />}
    <SectionHeader
      title={strings('trending.perps_trending_lists')}
      testID="section-header-perps-trending-lists"
    />
  </Box>
);

// Pull-to-refresh is visual only (consistent with other Explore tabs): market
// prices stream over websockets and top traders refetch on mount/app focus.
const PerpsTabContent: React.FC<Pick<TabProps, 'refreshing' | 'onRefresh'>> = ({
  refreshing,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const perpsNavigation =
    useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isTopTradersEnabled = useSelector(selectSocialLeaderboardEnabled);
  const [isSortSheetVisible, setIsSortSheetVisible] = useState(false);
  const floatingTabBarInset = useFloatingTabBarInset();
  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: 16 + floatingTabBarInset }),
    [floatingTabBarInset],
  );

  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);
  // Explore keeps its own category/watchlist/sort state: nothing is restored
  // from or saved to the Perps screen's preferences. The watchlist and the
  // categories are mutually exclusive, so they share one selection.
  const { markets: allMarkets, isLoading } = usePerpsMarkets({
    showZeroVolume: false,
    showZeroOpenInterest: false,
  });
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const now = useNowOnScreenFocus();
  const [selection, setSelection] = useState<MarketTypeFilter | 'watchlist'>(
    'all',
  );
  const { selectedOptionId, sortBy, direction, handleOptionChange } =
    usePerpsSorting({
      initialOptionId: 'priceChange',
      initialDirection: 'desc',
    });
  const { track } = usePerpsEventTracking();

  const showFavoritesOnly = isWatchlistEnabled && selection === 'watchlist';
  const marketTypeFilter = selection === 'watchlist' ? 'all' : selection;
  const setShowFavoritesOnly = useCallback(
    (show: boolean) => setSelection(show ? 'watchlist' : 'all'),
    [],
  );

  const markets = useMemo(() => {
    const byCategory =
      marketTypeFilter === 'new'
        ? allMarkets.filter((market) => isRecentlyListed(market.listedAt, now))
        : filterMarketsByCategory(allMarkets, marketTypeFilter);
    const visible = showFavoritesOnly
      ? byCategory.filter((market) => watchlistSymbols.includes(market.symbol))
      : byCategory;
    return sortMarkets({ markets: visible, sortBy, direction });
  }, [
    allMarkets,
    marketTypeFilter,
    now,
    showFavoritesOnly,
    watchlistSymbols,
    sortBy,
    direction,
  ]);
  const suggestedMarkets = useMemo(
    () => getSuggestedWatchlistMarkets(allMarkets, watchlistSymbols),
    [allMarkets, watchlistSymbols],
  );

  // Same Perps UI events (and shapes) as the Perps screen's market list, tagged
  // with source=explore so Explore usage is separable.
  const trackPerpsUi = useCallback(
    (properties: Record<string, string>) =>
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        ...properties,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
      }),
    [track],
  );

  const handleCategorySelect = useCallback(
    (category: MarketTypeFilter) => {
      trackPerpsUi({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: category,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
      });
      trackPerpsUi({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FILTER_APPLIED,
        [PERPS_EVENT_PROPERTY.FILTER_CATEGORY]: category,
      });
      setSelection(category);
    },
    [trackPerpsUi],
  );

  const handleWatchlistToggle = useCallback(() => {
    const willActivate = !showFavoritesOnly;
    trackPerpsUi({
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
    });
    // Like the Perps screen: filter_applied only when applying, not clearing.
    if (willActivate) {
      trackPerpsUi({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FILTER_APPLIED,
        [PERPS_EVENT_PROPERTY.FILTER_CATEGORY]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST,
      });
    }
    setShowFavoritesOnly(willActivate);
  }, [showFavoritesOnly, setShowFavoritesOnly, trackPerpsUi]);

  const handleSortChange = useCallback<typeof handleOptionChange>(
    (optionId, field, sortDirection) => {
      trackPerpsUi({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SORT_APPLIED,
        [PERPS_EVENT_PROPERTY.SORT_FIELD]: field,
        [PERPS_EVENT_PROPERTY.SORT_DIRECTION]: sortDirection,
      });
      handleOptionChange(optionId, field, sortDirection);
    },
    [handleOptionChange, trackPerpsUi],
  );

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      // Omitted for markets outside the main list (e.g. watchlist suggestions).
      const position = markets.findIndex((m) => m.symbol === market.symbol);
      trackExploreInteracted({
        interaction_type: 'section_item_tapped',
        tab_name: 'Perps',
        section_name: 'perps_tab_markets',
        ...(position >= 0 && { position }),
        asset_type: 'perp',
        item_clicked: market.symbol,
      });
      perpsNavigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
          source_section: 'perps_tab_markets',
        },
      });
    },
    [perpsNavigation, markets],
  );

  const listHeader = useMemo(
    () => <PerpsTabListHeader showTopTraders={isTopTradersEnabled} />,
    [isTopTradersEnabled],
  );

  // Watchlist view: reuse the Perps screen's watchlist block (rows + suggested
  // markets). It is bounded (watchlist cap + a few suggestions), so it is
  // rendered as the list's "empty" content while the list itself gets no rows.
  const watchlistContent = useMemo(
    () =>
      showFavoritesOnly ? (
        <PerpsWatchlistMarkets
          markets={markets}
          suggestedMarkets={suggestedMarkets}
          showHeader={false}
          enableShowMore={false}
          onMarketPress={handleMarketPress}
          displayMetric={sortBy}
          addSource={PERPS_EVENT_VALUE.SOURCE.EXPLORE}
        />
      ) : undefined,
    [showFavoritesOnly, markets, suggestedMarkets, handleMarketPress, sortBy],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.icon.default}
        colors={[colors.primary.default]}
      />
    ),
    [refreshing, onRefresh, colors],
  );

  const stickyHeader = useMemo(
    () => (
      <PerpsMarketFiltersBar
        selectedOptionId={selectedOptionId}
        onSortPress={() => setIsSortSheetVisible(true)}
        sortDirection={direction}
        marketTypeFilter={marketTypeFilter}
        onCategorySelect={handleCategorySelect}
        marketCount={markets.length}
        showWatchlistBadge={isWatchlistEnabled}
        isWatchlistSelected={showFavoritesOnly}
        onWatchlistToggle={handleWatchlistToggle}
        showCategoryRow
        showSortRow
        testID="perps-tab-filters"
      />
    ),
    [
      selectedOptionId,
      direction,
      marketTypeFilter,
      handleCategorySelect,
      markets.length,
      isWatchlistEnabled,
      showFavoritesOnly,
      handleWatchlistToggle,
    ],
  );

  if (!isPerpsEnabled && !isLoading) {
    return null;
  }

  // Avoid the list's "no markets" footer flashing while data loads. A fixed
  // handful of skeleton rows is not a virtualization concern.
  if (isLoading) {
    return (
      <View testID="perps-tab-loading">
        {listHeader}
        <PerpsRowSkeleton count={8} />
      </View>
    );
  }

  return (
    <>
      <PerpsMarketList
        contentContainerStyle={contentContainerStyle}
        markets={showFavoritesOnly ? [] : markets}
        emptyComponent={watchlistContent}
        onMarketPress={handleMarketPress}
        ListHeaderComponent={listHeader}
        stickyHeader={stickyHeader}
        keepHeaderHiddenOnReset
        sortBy={sortBy}
        showBadge={false}
        filterKey={`${marketTypeFilter}|${showFavoritesOnly}`}
        refreshControl={refreshControl}
        testID="perps-tab-market-list"
      />
      {isSortSheetVisible && (
        // Rendered in a Modal so the sheet and backdrop cover the whole screen
        // (above the floating tab bar) instead of being clipped to the tab.
        // Android: wrap <Modal> in a plain <View> to avoid rendering issues.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <ModalSafeAreaProvider>
              <PerpsMarketSortFieldBottomSheet
                isVisible
                onClose={() => setIsSortSheetVisible(false)}
                selectedOptionId={selectedOptionId}
                sortDirection={direction}
                onOptionSelect={handleSortChange}
                testID="perps-tab-sort-sheet"
              />
            </ModalSafeAreaProvider>
          </Modal>
        </View>
      )}
    </>
  );
};

const PerpsTab: React.FC<TabProps> = ({ refreshing, onRefresh }) => (
  <PerpsSectionProvider>
    <PerpsTabContent refreshing={refreshing} onRefresh={onRefresh} />
  </PerpsSectionProvider>
);

export default PerpsTab;
