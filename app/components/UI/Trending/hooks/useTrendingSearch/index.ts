import type { CaipChainId } from '@metamask/utils';
import { SortTrendingBy, TrendingAsset } from '@metamask/assets-controllers';
import { useSearchRequest } from '../useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest';
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
      chainIds: [],
    });

  const {
    results: trendingResults,
    isLoading: isTrendingLoading,
    fetch: fetchTrendingTokens,
  } = useTrendingRequest({
    sortBy,
    chainIds: chainIds ?? undefined,
  });

  if (!searchQuery) {
    const sortedResults = sortTrendingTokens(
      trendingResults,
      PriceChangeOption.PriceChange,
    );
    return {
      data: sortedResults,
      isLoading: isTrendingLoading,
      refetch: () => {
        fetchTrendingTokens();
      },
    };
  }

  const resultMap = new Map(
    trendingResults.map((result) => [result.assetId, result]),
  );

  searchResults.forEach((result) => {
    const asset = result as TrendingAsset;
    if (!resultMap.has(asset.assetId)) {
      resultMap.set(asset.assetId, asset);
    }
  });

  return {
    data: Array.from(resultMap.values()),
    isLoading: isSearchLoading,
    refetch: () => {
      fetchTrendingTokens();
    },
  };
};
