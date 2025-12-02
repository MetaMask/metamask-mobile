import { useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { SortTrendingBy } from '@metamask/assets-controllers';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import { PriceChangeOption } from '../../components/TrendingTokensBottomSheet';

/**
 * Hook for handling trending tokens search that returns trending tokens and tokens from search API
 * @returns {Object} An object containing the trending tokens results, token search results, loading state, error, and a function to trigger fetch
 */
export const useTrendingSearch = (
  searchQuery?: string,
  sortBy?: SortTrendingBy,
  chainIds?: CaipChainId[] | null,
) => {
  // Trending will return tokens that have just been created which wont be picked up by search API
  // so if you see a token on trending and search on omnisearch which uses the search endpoint...
  // There is a chance you will get 0 results
  const { results: searchResults, isLoading: isSearchLoading } =
    useSearchRequest({
      query: searchQuery || '',
      limit: 20,
      chainIds: chainIds ?? undefined,
    });

  const {
    results: trendingResults,
    isLoading: isTrendingLoading,
    fetch: fetchTrendingTokens,
  } = useTrendingRequest({
    sortBy,
    chainIds: chainIds ?? undefined,
  });

  const data = useMemo(() => {
    if (!searchQuery?.trim()) {
      return sortTrendingTokens(trendingResults, PriceChangeOption.PriceChange);
    }

    const query = searchQuery.toLowerCase().trim();

    const filteredTrendingResults = trendingResults.filter(
      (item) =>
        item.symbol?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query),
    );

    // Combine trending and search results, avoiding duplicates
    const resultMap = new Map(
      filteredTrendingResults.map((result) => [result.assetId, result]),
    );

    searchResults.forEach((asset) => {
      if (!resultMap.has(asset.assetId)) {
        resultMap.set(asset.assetId, {
          assetId: asset.assetId,
          symbol: asset.symbol,
          name: asset.name,
          decimals: asset.decimals,
          price: asset.price,
          aggregatedUsdVolume: asset.aggregatedUsdVolume,
          marketCap: asset.marketCap,
          priceChangePct: {
            h24: asset.pricePercentChange1d,
          },
        });
      }
    });

    return Array.from(resultMap.values());
  }, [searchQuery, trendingResults, searchResults]);

  return {
    data,
    isLoading: searchQuery ? isSearchLoading : isTrendingLoading,
    refetch: fetchTrendingTokens,
  };
};
