import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { TrendingAsset } from '@metamask/assets-controllers';
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

  const trendingTokens = useMemo<TrendingAsset[]>(
    () => (searchResults.length === 0 ? [] : searchResults),
    [searchResults],
  );

  const handleRefresh = useCallback(async () => {
    filters.setRefreshing(true);
    try {
      refetchStocks?.();
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
      tokens={trendingTokens}
      searchResults={searchResults}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      allowedNetworks={RWA_NETWORKS_LIST}
    />
  );
};

RWATokensFullView.displayName = 'RWATokensFullView';

export default RWATokensFullView;
