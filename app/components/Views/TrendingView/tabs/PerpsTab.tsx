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
  PERPS_EVENT_VALUE,
  sortMarkets,
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
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
    {showTopTraders && <TopTradersSection />}
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
    usePerpsSorting();

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

  const handleMarketPress = useCallback(
    (market: PerpsMarketData) => {
      trackExploreInteracted({
        interaction_type: 'section_item_tapped',
        tab_name: 'Perps',
        section_name: 'perps_markets',
        asset_type: 'perp',
        item_clicked: market.symbol,
      });
      perpsNavigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
          source_section: 'perps_markets',
        },
      });
    },
    [perpsNavigation],
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
        onCategorySelect={setSelection}
        marketCount={markets.length}
        showWatchlistBadge={isWatchlistEnabled}
        isWatchlistSelected={showFavoritesOnly}
        onWatchlistToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
        showCategoryRow
        showSortRow
        testID="perps-tab-filters"
      />
    ),
    [
      selectedOptionId,
      direction,
      marketTypeFilter,
      setSelection,
      markets.length,
      isWatchlistEnabled,
      showFavoritesOnly,
      setShowFavoritesOnly,
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
                onOptionSelect={handleOptionChange}
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
