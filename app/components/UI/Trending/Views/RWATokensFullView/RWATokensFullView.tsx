import React, { useCallback, useState } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingQuickBuy from '../../components/TrendingQuickBuy/TrendingQuickBuy';
import { strings } from '../../../../../../locales/i18n';
import {
  PriceChangeOption,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import { useRwaTokens } from '../../hooks/useRwaTokens/useRwaTokens';
import { useTokenListFilters } from '../../hooks/useTokenListFilters/useTokenListFilters';
import TokenListPageLayout from '../../components/TokenListPageLayout/TokenListPageLayout';
import { RWA_NETWORKS_LIST } from '../../utils/trendingNetworksList';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../../../../Views/TrendingView/search/abTestConfig';
import { useQuickBuySearchKeyboard } from '../../hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard';

const RWATokensFullView = () => {
  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );
  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );
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

  const closeQuickBuy = useCallback(() => {
    setQuickTradeToken(null);
  }, []);

  useQuickBuySearchKeyboard(
    quickBuyVariant.showQuickTradeButton ? quickTradeToken : null,
    closeQuickBuy,
  );

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
      onQuickTrade={
        quickBuyVariant.showQuickTradeButton ? setQuickTradeToken : undefined
      }
      quickBuyNode={
        <TrendingQuickBuy
          token={quickTradeToken}
          onClose={closeQuickBuy}
          source="explore_stocks"
        />
      }
    />
  );
};

RWATokensFullView.displayName = 'RWATokensFullView';

export default RWATokensFullView;
