import { useMemo, useState, useEffect } from 'react';
import Fuse, { type FuseOptions } from 'fuse.js';
import type { CaipChainId } from '@metamask/utils';
import { SortTrendingBy, TrendingAsset } from '@metamask/assets-controllers';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import {
  PriceChangeOption,
  SortDirection,
} from '../../components/TrendingTokensBottomSheet';
import { RWA_CHAIN_IDS } from '../../utils/trendingNetworksList';
import { isEqual } from 'lodash';

const useStableReference = <T>(value: T) => {
  const [stableValue, setStableValue] = useState(value);

  useEffect(() => {
    if (!isEqual(stableValue, value)) {
      setStableValue(value);
    }
  }, [value, stableValue]);

  return stableValue;
};

const TOKEN_FUSE_OPTIONS: FuseOptions<TrendingAsset> = {
  shouldSort: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['symbol', 'name', 'assetId'],
};

const fuseSearch = (
  data: TrendingAsset[],
  searchQuery: string | undefined,
): TrendingAsset[] => {
  const trimmed = searchQuery?.trim();
  if (!trimmed) {
    return data;
  }
  const fuse = new Fuse(data, TOKEN_FUSE_OPTIONS);
  const results = fuse.search(trimmed);
  // Penalize zero-marketCap tokens
  return results.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
};

/**
 * Hook for RWA tokens search.
 * Defaults to Ethereum + BNB when no chainIds are provided.
 *
 * @param opts.searchQuery - Client-side fuse.js query to filter results
 * @param opts.chainIds - Chain IDs to filter by (defaults to RWA_CHAIN_IDS)
 * @param opts.sortTrendingTokensOptions - Sorting options for price change / volume / market cap
 * @returns Search results, loading state, and refetch function for rwa tokens
 */
export const useRwaTokens = (opts?: {
  searchQuery?: string;
  sortBy?: SortTrendingBy;
  chainIds?: CaipChainId[] | null;
  includeMarketData?: boolean;
  sortTrendingTokensOptions?: {
    option: PriceChangeOption;
    direction: SortDirection;
  };
}) => {
  const {
    searchQuery,
    chainIds,
    includeMarketData = true,
    sortTrendingTokensOptions = {
      option: PriceChangeOption.PriceChange,
      direction: SortDirection.Descending,
    },
  } = useStableReference(opts ?? {});

  const effectiveChainIds = chainIds ?? RWA_CHAIN_IDS;

  const { results: searchResults, isLoading: isSearchLoading } =
    useSearchRequest({
      query: 'Ondo',
      limit: 100,
      chainIds: effectiveChainIds,
      includeMarketData,
    });

  const data = useMemo(() => {
    const normalizedResults: TrendingAsset[] = searchResults
      .filter((asset) => asset.rwaData)
      .map((asset) => ({
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
        rwaData: asset.rwaData as unknown as
          | TrendingAsset['rwaData']
          | undefined,
      }));

    if (searchQuery?.trim()) {
      return fuseSearch(normalizedResults, searchQuery);
    }

    return sortTrendingTokens(
      normalizedResults,
      sortTrendingTokensOptions.option,
      sortTrendingTokensOptions.direction,
    );
  }, [searchResults, searchQuery, sortTrendingTokensOptions]);

  return { data, isLoading: isSearchLoading, refetch: () => undefined };
};
