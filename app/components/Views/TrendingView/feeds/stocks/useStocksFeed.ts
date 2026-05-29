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

/**
 * Tokenized stocks (RWAs) feed.
 *
 * Tab sections (no query): only Ethereum mainnet tokens are shown, matching
 * the design intent of the RWAs/Now tab.
 *
 * Search (query present): all chains in RWA_CHAIN_IDS are included so users
 * can find stocks across Ethereum and BNB.
 *
 * Chain filtering is done client-side (not in the request) to share the same
 * server-side cache across all surfaces.
 */
export const useStocksFeed = ({
  query,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const { data, isLoading, refetch } = useRwaTokens({
    searchQuery: query,
  });

  const filteredData = useMemo(() => {
    // During search, surface tokens from all supported RWA chains so the user
    // can find any matching stock regardless of chain.
    if (query?.trim()) return data;
    // Tab sections only show Ethereum mainnet tokens.
    return data.filter((asset) =>
      asset.assetId.startsWith(ETHEREUM_CAIP_CHAIN_ID),
    );
  }, [data, query]);

  useFeedRefresh(refresh, refetch);

  return { data: filteredData, isLoading, refetch };
};
