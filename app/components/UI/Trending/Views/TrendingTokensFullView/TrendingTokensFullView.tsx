import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
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
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import {
  TrendingTokenTimeBottomSheet,
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
import TokenListPageLayout from '../../components/TokenListPageLayout/TokenListPageLayout';
import type { Theme } from '../../../../../util/theme/models';

export interface TrendingTokensDataProps {
  isLoading: boolean;
  refreshing: boolean;
  trendingTokens: TrendingAsset[];
  handleRefresh: () => void;
  selectedTimeOption: TimeOption;
  filterContext: TrendingFilterContext;
  theme: Theme;

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
  const tw = useTailwind();
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const filters = useTokenListFilters();

  const [sortBy, setSortBy] = useState<SortTrendingBy | undefined>(undefined);
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState(false);

  const {
    data: searchResults,
    isLoading,
    refetch: refetchTokensSection,
  } = useTrendingSearch({
    searchQuery: filters.searchQuery || undefined,
    sortBy,
    chainIds: filters.selectedNetwork,
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

  const timeFilterButton = (
    <TouchableOpacity
      testID="24h-button"
      onPress={handle24hPress}
      style={tw.style(
        'shrink-0 items-center rounded-lg bg-muted p-2',
        filters.searchQuery?.trim() && 'opacity-50',
      )}
      activeOpacity={0.2}
      disabled={!!filters.searchQuery?.trim()}
    >
      <View style={tw`flex-row items-center justify-center gap-1`}>
        <Text style={tw`min-w-0 shrink text-[14px] font-semibold text-default`}>
          {filters.selectedTimeOption}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          color={IconColor.Alternative}
          size={IconSize.Xs}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <TokenListPageLayout
      title={strings('trending.trending_tokens')}
      testID="trending-tokens-header"
      filters={filters}
      tokens={trendingTokens}
      searchResults={searchResults}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      extraFilters={timeFilterButton}
      extraBottomSheets={
        <TrendingTokenTimeBottomSheet
          isVisible={showTimeBottomSheet}
          onClose={() => setShowTimeBottomSheet(false)}
          onTimeSelect={handleTimeSelect}
          selectedTime={filters.selectedTimeOption}
        />
      }
    />
  );
};

TrendingTokensFullView.displayName = 'TrendingTokensFullView';

export default TrendingTokensFullView;
