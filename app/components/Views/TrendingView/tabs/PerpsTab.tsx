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
    {showTopTraders && (
      <>
        <Box twClassName="pb-1">
          <TopTradersSection source="explore_perps" />
        </Box>
        <SectionDivider />
      </>
    )}
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
    () => ({ paddingTop: 12, paddingBottom: 16 + floatingTabBarInset }),
    [floatingTabBarInset],
  );

  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);
  // Local (not persisted) state; the watchlist and categories are exclusive.
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

  // Like the Perps screen: filter_applied only fires when applying a filter.
  const trackFilter = useCallback(
    (category: string, applied = true) => {
      trackPerpsUi({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.MARKET_LIST_FILTER,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: category,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.MARKET_LIST,
      });
      if (applied) {
        trackPerpsUi({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.FILTER_APPLIED,
          [PERPS_EVENT_PROPERTY.FILTER_CATEGORY]: category,
        });
      }
    },
    [trackPerpsUi],
  );

  const handleCategorySelect = useCallback(
    (category: MarketTypeFilter) => {
      trackFilter(category);
      setSelection(category);
    },
    [trackFilter],
  );

  const handleWatchlistToggle = useCallback(() => {
    const willActivate = !showFavoritesOnly;
    trackFilter(PERPS_EVENT_VALUE.BUTTON_CLICKED.WATCHLIST, willActivate);
    setSelection(willActivate ? 'watchlist' : 'all');
  }, [showFavoritesOnly, trackFilter]);

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

  // Body shown instead of rows. While loading: skeletons (the list stays
  // mounted so the header, e.g. top traders, is not remounted). Watchlist view:
  // the Perps screen's bounded watchlist block (rows + suggested markets).
  const emptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <View testID="perps-tab-loading">
          <PerpsRowSkeleton count={8} />
        </View>
      );
    }
    return showFavoritesOnly ? (
      <PerpsWatchlistMarkets
        markets={markets}
        suggestedMarkets={suggestedMarkets}
        showHeader={false}
        enableShowMore={false}
        onMarketPress={handleMarketPress}
        displayMetric={sortBy}
        addSource={PERPS_EVENT_VALUE.SOURCE.EXPLORE}
      />
    ) : undefined;
  }, [
    isLoading,
    showFavoritesOnly,
    markets,
    suggestedMarkets,
    handleMarketPress,
    sortBy,
  ]);

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
      // The top padding gives the pinned bar the same gap below the Explore
      // tab bar as there is between the pills and the count/sort row.
      <Box twClassName="bg-default pt-2">
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
      </Box>
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

  if (!isPerpsEnabled) {
    return null;
  }

  return (
    <>
      <PerpsMarketList
        contentContainerStyle={contentContainerStyle}
        markets={showFavoritesOnly || isLoading ? [] : markets}
        keepHeaderHiddenOnReset
        emptyComponent={emptyComponent}
        onMarketPress={handleMarketPress}
        ListHeaderComponent={listHeader}
        // No filter bar until there are markets to count.
        stickyHeader={isLoading ? null : stickyHeader}
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
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => setIsSortSheetVisible(false)}
          >
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
