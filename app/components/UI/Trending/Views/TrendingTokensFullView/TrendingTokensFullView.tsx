import React, { useCallback, useMemo, useState } from 'react';
import TrendingQuickBuy from '../../components/TrendingQuickBuy/TrendingQuickBuy';
import { View, RefreshControl } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import TrendingTokensList, {
  TrendingFilterContext,
} from '../../components/TrendingTokensList/TrendingTokensList';
import TrendingTokensSkeleton from '../../components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import {
  SortTrendingBy,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import {
  TrendingTokenTimeBottomSheet,
  mapTimeOptionToSortBy,
  PriceChangeOption,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import { useTrendingSearch } from '../../hooks/useTrendingSearch/useTrendingSearch';
import { useTokenListFilters } from '../../hooks/useTokenListFilters/useTokenListFilters';
import EmptyErrorTrendingState from '../../../../Views/TrendingView/components/EmptyErrorState/EmptyErrorTrendingState';
import EmptySearchResultState from '../../../../Views/TrendingView/components/EmptyErrorState/EmptySearchResultState';
import WatchlistEmptyState from '../../../../Views/Homepage/Sections/Watchlist/components/WatchlistEmptyState';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import { useSearchTracking } from '../../hooks/useSearchTracking/useSearchTracking';
import { FilterButton } from '../../components/FilterBar/FilterBar';
import TokenListPageLayout from '../../components/TokenListPageLayout/TokenListPageLayout';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';
import type { Theme } from '../../../../../util/theme/models';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../../../../Views/TrendingView/search/abTestConfig';
import type { QuickBuySheetSource } from '../../../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/analytics';
import { useQuickBuySearchKeyboard } from '../../hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard';
import { selectTokenWatchlistEnabled } from '../../../Assets/selectors/featureFlags';
import { useTokenWatchlistQuery } from '../../../Assets/watchlist/hooks/useTokenWatchlistQuery';
import { mapWatchlistTokenToTrendingAsset } from '../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { getCaipChainIdFromAssetId } from '../../components/TrendingTokenRowItem/utils';

export type TrendingTokensFullViewEntryPoint =
  | 'crypto_movers'
  | 'trending_tokens';

export interface TrendingTokensFullViewParams {
  initialTimeOption?: TimeOption;
  /** Quick Buy analytics source. Defaults to `explore_trending`. */
  quickBuySource?: QuickBuySheetSource;
  /** Entry surface for title and analytics context. */
  entryPoint?: TrendingTokensFullViewEntryPoint;
}

export interface TrendingTokensDataProps {
  isLoading: boolean;
  refreshing: boolean;
  trendingTokens: TrendingAsset[];
  handleRefresh: () => void;
  selectedTimeOption: TimeOption;
  filterContext: TrendingFilterContext;
  theme: Theme;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onQuickTrade?: (token: TrendingAsset) => void;
  /** When true, an empty list shows the watchlist empty illustration instead of the error state. */
  isWatchlistFilterActive?: boolean;
  /** Token Details analytics source for row navigation. */
  tokenDetailsSource?: TokenDetailsSource;

  search: {
    searchResults: TrendingAsset[];
    searchQuery: string;
  };
}

export const TrendingTokensData = (props: TrendingTokensDataProps) => {
  const {
    isLoading,
    refreshing,
    trendingTokens,
    search,
    handleRefresh,
    selectedTimeOption,
    filterContext,
    theme,
    onLoadMore,
    isLoadingMore,
    onQuickTrade,
    isWatchlistFilterActive = false,
    tokenDetailsSource = TokenDetailsSource.Trending,
  } = props;

  const tw = useTailwind();

  const isSearching = search.searchQuery.trim().length > 0;
  const hasSearchResults = search.searchResults.length > 0;

  if (isLoading) {
    return (
      <View style={tw`flex-1 px-4`} testID="trending-tokens-skeleton">
        {Array.from({ length: 12 }).map((_, index) => (
          <TrendingTokensSkeleton key={index} />
        ))}
      </View>
    );
  }

  if (isSearching && !hasSearchResults) {
    return <EmptySearchResultState />;
  }

  if (
    !isLoading &&
    isWatchlistFilterActive &&
    !isSearching &&
    trendingTokens.length === 0
  ) {
    return (
      <View style={tw`pt-40`} testID="trending-watchlist-empty-state">
        <WatchlistEmptyState />
      </View>
    );
  }

  if (!isSearching && !hasSearchResults) {
    return <EmptyErrorTrendingState onRetry={handleRefresh} />;
  }

  return (
    <View style={tw`flex-1 px-4`}>
      <TrendingTokensList
        trendingTokens={trendingTokens}
        selectedTimeOption={selectedTimeOption}
        filterContext={filterContext}
        onLoadMore={onLoadMore}
        isLoadingMore={isLoadingMore}
        onQuickTrade={onQuickTrade}
        tokenDetailsSource={tokenDetailsSource}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary.default]}
            tintColor={theme.colors.icon.default}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    </View>
  );
};

const TrendingTokensFullView = () => {
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const isWatchlistFilterActive = isWatchlistEnabled && showWatchlistOnly;
  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );
  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );
  const { params } =
    useRoute<
      RouteProp<{ TrendingTokensFullView: TrendingTokensFullViewParams }>
    >();
  const initialTimeOption = params?.initialTimeOption;
  const quickBuySource = params?.quickBuySource ?? 'explore_trending';
  const pageTitle =
    params?.entryPoint === 'crypto_movers'
      ? strings('trending.crypto_movers')
      : strings('trending.trending_tokens');
  const filters = useTokenListFilters({ timeOption: initialTimeOption });

  const isSearchActive =
    filters.isSearchVisible || Boolean(filters.searchQuery?.trim());
  /** Watchlist list mode: star selected and user is not searching trending tokens. */
  const isWatchlistListMode = isWatchlistFilterActive && !isSearchActive;

  const [sortBy, setSortBy] = useState<SortTrendingBy | undefined>(
    initialTimeOption ? mapTimeOptionToSortBy(initialTimeOption) : undefined,
  );
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState(false);

  const {
    data: searchResults,
    isLoading: isTrendingLoading,
    refetch: refetchTokensSection,
    loadMore,
    isLoadingMore,
  } = useTrendingSearch({
    searchQuery: filters.searchQuery || undefined,
    sortBy,
    chainIds: filters.selectedNetwork,
    filterLowQuality: true,
  });

  const {
    data: watchlistData,
    isLoading: isWatchlistLoading,
    refetch: refetchWatchlist,
  } = useTokenWatchlistQuery();

  const watchlistTokens = useMemo(() => {
    if (!isWatchlistListMode) {
      return [];
    }

    let tokens = (watchlistData ?? []).map(mapWatchlistTokenToTrendingAsset);

    if (filters.selectedNetwork && filters.selectedNetwork.length > 0) {
      const selectedChainId = filters.selectedNetwork[0];
      tokens = tokens.filter(
        (token) => getCaipChainIdFromAssetId(token.assetId) === selectedChainId,
      );
    }

    if (filters.selectedPriceChangeOption) {
      tokens = sortTrendingTokens(
        tokens,
        filters.selectedPriceChangeOption,
        filters.priceChangeSortDirection,
        filters.selectedTimeOption,
      );
    }

    return tokens;
  }, [
    isWatchlistListMode,
    watchlistData,
    filters.selectedNetwork,
    filters.selectedPriceChangeOption,
    filters.priceChangeSortDirection,
    filters.selectedTimeOption,
  ]);

  const trendingTokens = useMemo(() => {
    if (isWatchlistListMode) {
      return watchlistTokens;
    }

    if (searchResults.length === 0) {
      return [];
    }

    if (filters.searchQuery?.trim()) {
      return searchResults;
    }

    if (!filters.selectedPriceChangeOption) {
      return searchResults;
    }

    return sortTrendingTokens(
      searchResults,
      filters.selectedPriceChangeOption,
      filters.priceChangeSortDirection,
      filters.selectedTimeOption,
    );
  }, [
    isWatchlistListMode,
    watchlistTokens,
    searchResults,
    filters.searchQuery,
    filters.selectedPriceChangeOption,
    filters.priceChangeSortDirection,
    filters.selectedTimeOption,
  ]);

  const isLoading = isWatchlistListMode
    ? isWatchlistLoading
    : isTrendingLoading;

  useSearchTracking({
    searchQuery: filters.searchQuery,
    resultsCount: trendingTokens.length,
    isLoading,
    timeFilter: filters.selectedTimeOption,
    sortOption:
      filters.selectedPriceChangeOption || PriceChangeOption.PriceChange,
    networkFilter:
      filters.selectedNetwork && filters.selectedNetwork.length > 0
        ? filters.selectedNetwork[0]
        : 'all',
  });

  const {
    selectedTimeOption,
    selectedPriceChangeOption,
    selectedNetwork,
    setSelectedTimeOption,
  } = filters;

  const handleTimeSelect = useCallback(
    (selectedSortBy: SortTrendingBy, timeOption: TimeOption) => {
      const previousValue = selectedTimeOption;
      setSortBy(selectedSortBy);
      setSelectedTimeOption(timeOption);

      if (timeOption !== previousValue) {
        sessionManager.trackFilterChange({
          filter_type: 'time',
          previous_value: previousValue,
          new_value: timeOption,
          time_filter: timeOption,
          sort_option:
            selectedPriceChangeOption || PriceChangeOption.PriceChange,
          network_filter:
            selectedNetwork && selectedNetwork.length > 0
              ? selectedNetwork[0]
              : 'all',
        });
      }
    },
    [
      selectedTimeOption,
      selectedPriceChangeOption,
      selectedNetwork,
      setSelectedTimeOption,
      sessionManager,
    ],
  );

  const handle24hPress = useCallback(() => {
    setShowTimeBottomSheet(true);
  }, []);

  const { setRefreshing } = filters;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isWatchlistListMode) {
        await refetchWatchlist();
      } else {
        refetchTokensSection?.();
      }
    } catch (error) {
      console.warn('Failed to refresh trending tokens:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    isWatchlistListMode,
    refetchWatchlist,
    refetchTokensSection,
    setRefreshing,
  ]);

  const closeQuickBuy = useCallback(() => {
    setQuickTradeToken(null);
  }, []);

  useQuickBuySearchKeyboard(
    quickBuyVariant.showQuickTradeButton ? quickTradeToken : null,
    closeQuickBuy,
  );

  const timeFilterButton = (
    <FilterButton
      testID="24h-button"
      onPress={handle24hPress}
      label={filters.selectedTimeOption}
      disabled={!!filters.searchQuery?.trim()}
    />
  );

  const handleWatchlistFilterPress = useCallback(() => {
    setShowWatchlistOnly((prev) => !prev);
  }, []);

  const tokenDetailsSource = isWatchlistListMode
    ? TokenDetailsSource.ExploreWatchlistFilter
    : TokenDetailsSource.Trending;

  return (
    <TokenListPageLayout
      title={pageTitle}
      testID="trending-tokens-header"
      filters={filters}
      tokens={trendingTokens}
      searchResults={searchResults}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      allowedNetworks={TRENDING_NETWORKS_LIST}
      showWatchlistFilter={isWatchlistEnabled}
      onWatchlistFilterPress={handleWatchlistFilterPress}
      extraFilters={timeFilterButton}
      isWatchlistFilterActive={isWatchlistFilterActive}
      isWatchlistListMode={isWatchlistListMode}
      tokenDetailsSource={tokenDetailsSource}
      onLoadMore={isWatchlistListMode ? undefined : loadMore}
      isLoadingMore={isWatchlistListMode ? false : isLoadingMore}
      extraBottomSheets={
        <TrendingTokenTimeBottomSheet
          isVisible={showTimeBottomSheet}
          onClose={() => setShowTimeBottomSheet(false)}
          onTimeSelect={handleTimeSelect}
          selectedTime={filters.selectedTimeOption}
        />
      }
      onQuickTrade={
        quickBuyVariant.showQuickTradeButton ? setQuickTradeToken : undefined
      }
      quickBuyNode={
        <TrendingQuickBuy
          token={quickTradeToken}
          onClose={closeQuickBuy}
          source={quickBuySource}
        />
      }
    />
  );
};

TrendingTokensFullView.displayName = 'TrendingTokensFullView';

export default TrendingTokensFullView;
