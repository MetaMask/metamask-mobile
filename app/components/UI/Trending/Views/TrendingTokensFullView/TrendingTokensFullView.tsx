import React, { useCallback, useMemo, useState } from 'react';
import TrendingQuickBuy from '../../components/TrendingQuickBuy/TrendingQuickBuy';
import { View, RefreshControl } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
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

  const [sortBy, setSortBy] = useState<SortTrendingBy | undefined>(
    initialTimeOption ? mapTimeOptionToSortBy(initialTimeOption) : undefined,
  );
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState(false);

  const {
    data: searchResults,
    isLoading,
    refetch: refetchTokensSection,
    loadMore,
    isLoadingMore,
  } = useTrendingSearch({
    searchQuery: filters.searchQuery || undefined,
    sortBy,
    chainIds: filters.selectedNetwork,
    filterLowQuality: true,
  });

  const trendingTokens = useMemo(() => {
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
    searchResults,
    filters.searchQuery,
    filters.selectedPriceChangeOption,
    filters.priceChangeSortDirection,
    filters.selectedTimeOption,
  ]);

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
      refetchTokensSection?.();
    } catch (error) {
      console.warn('Failed to refresh trending tokens:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTokensSection, setRefreshing]);

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
      extraFilters={timeFilterButton}
      onLoadMore={loadMore}
      isLoadingMore={isLoadingMore}
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
