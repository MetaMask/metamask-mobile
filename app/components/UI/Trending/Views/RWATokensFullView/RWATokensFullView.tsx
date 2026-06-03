import React, { useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  PriceChangeOption,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import { useRwaTokens } from '../../hooks/useRwaTokens/useRwaTokens';
import { useTokenListFilters } from '../../hooks/useTokenListFilters/useTokenListFilters';
import TokenListPageLayout from '../../components/TokenListPageLayout/TokenListPageLayout';
import { RWA_NETWORKS_LIST } from '../../utils/trendingNetworksList';

const RWATokensFullView = () => {
  const filters = useTokenListFilters({
    timeOption: TimeOption.TwentyFourHours,
  });

  const {
    data: searchResults,
    isLoading,
    isLoadingMore,
    loadMore,
    refetch: refetchStocks,
  } = useRwaTokens({
    searchQuery: filters.searchQuery || undefined,
    chainIds: filters.selectedNetwork,
    sortTrendingTokensOptions: {
      option:
        filters.selectedPriceChangeOption ?? PriceChangeOption.PriceChange,
      direction: filters.priceChangeSortDirection,
    },
  });

  const handleRefresh = useCallback(async () => {
    filters.setRefreshing(true);
    try {
      await refetchStocks();
    } catch (error) {
      console.warn('Failed to refresh stocks:', error);
    } finally {
      filters.setRefreshing(false);
    }
  }, [refetchStocks, filters]);

  return (
    <TokenListPageLayout
      title={strings('trending.stocks')}
      testID="rwa-tokens-header"
      filters={filters}
      tokens={searchResults}
      searchResults={searchResults}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      allowedNetworks={RWA_NETWORKS_LIST}
      onLoadMore={loadMore}
      isLoadingMore={isLoadingMore}
    />
  );
};

RWATokensFullView.displayName = 'RWATokensFullView';

export default RWATokensFullView;
