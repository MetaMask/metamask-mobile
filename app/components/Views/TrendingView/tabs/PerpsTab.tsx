import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { usePerpsMarketListView } from '../../../UI/Perps/hooks/usePerpsMarketListView';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SectionRefreshHandle } from '../../Homepage/types';
import ModalSafeAreaProvider from '../../../../component-library/components-temp/ModalSafeAreaProvider';
import { useTheme } from '../../../../util/theme';
import type { TabProps } from '../hooks/useExploreRefresh';

/**
 * Header rendered above the market list. Contains the top-traders carousel
 * (reused from the homepage) and a section title for the market list below.
 * Scrolls away naturally as the FlashList scrolls; the filter bar (rendered
 * as `stickyHeader`) stays pinned.
 */
const PerpsTabListHeader: React.FC<{
  showTopTraders: boolean;
  topTradersRef: React.Ref<SectionRefreshHandle>;
}> = ({ showTopTraders, topTradersRef }) => (
  <Box>
    {showTopTraders && <TopTradersSection ref={topTradersRef} />}
    {showTopTraders && <SectionDivider />}
    <SectionHeader
      title={strings('trending.perps_trending_lists')}
      testID="section-header-perps-trending-lists"
    />
  </Box>
);

// Pull-to-refresh only refetches top traders (REST). Market prices stream over
// websockets, so the market list needs no manual refresh.
const PerpsTabContent: React.FC<Pick<TabProps, 'refreshing' | 'onRefresh'>> = ({
  refreshing,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const topTradersRef = useRef<SectionRefreshHandle>(null);
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
  // Hide a persisted watchlist-only filter while the watchlist is disabled
  // (same override the Perps screen applies).
  const {
    markets,
    marketTypeFilterState,
    sortState,
    favoritesState,
    isLoading,
  } = usePerpsMarketListView({
    showWatchlistOnly: isWatchlistEnabled ? undefined : false,
  });
  const { showFavoritesOnly, setShowFavoritesOnly } = favoritesState;

  const { marketTypeFilter, setMarketTypeFilter } = marketTypeFilterState;
  const { selectedOptionId, sortBy, direction, handleOptionChange } = sortState;

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
    () => (
      <PerpsTabListHeader
        showTopTraders={isTopTradersEnabled}
        topTradersRef={topTradersRef}
      />
    ),
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
          suggestedMarkets={favoritesState.suggestedMarkets}
          showHeader={false}
          enableShowMore={false}
          onMarketPress={handleMarketPress}
          displayMetric={sortBy}
        />
      ) : undefined,
    [
      showFavoritesOnly,
      markets,
      favoritesState.suggestedMarkets,
      handleMarketPress,
      sortBy,
    ],
  );

  const handleRefresh = useCallback(() => {
    onRefresh();
    topTradersRef.current?.refresh().catch(() => undefined);
  }, [onRefresh]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.icon.default}
        colors={[colors.primary.default]}
      />
    ),
    [refreshing, handleRefresh, colors],
  );

  const stickyHeader = useMemo(
    () => (
      <PerpsMarketFiltersBar
        selectedOptionId={selectedOptionId}
        onSortPress={() => setIsSortSheetVisible(true)}
        sortDirection={direction}
        marketTypeFilter={marketTypeFilter}
        onCategorySelect={setMarketTypeFilter}
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
      setMarketTypeFilter,
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
