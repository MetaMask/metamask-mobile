import { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';

const ETHEREUM_CAIP_CHAIN_ID = 'eip155:1/';

interface UseStocksFeedOptions {
  query?: string;
  refresh?: RefreshConfig;
}

export interface UseStocksFeedResult {
  data: TrendingAsset[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/** Tokenized stocks (RWAs). Only Ethereum mainnet tokens are shown in the section. */
export const useStocksFeed = ({
  query,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const { data, isLoading, refetch } = useRwaTokens({
    searchQuery: query,
  });

  // Keep mainnet filtering here (not in the request) so all surfaces share the same
  // RWA cache (server-side); chain-specific params would split the cache and diverge from the main feed.
  const ethereumData = useMemo(
    () =>
      data.filter((asset) => asset.assetId.startsWith(ETHEREUM_CAIP_CHAIN_ID)),
    [data],
  );

  useFeedRefresh(refresh, refetch);

  return { data: ethereumData, isLoading, refetch };
};
