import { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';

const ETHEREUM_CAIP_CHAIN_ID = 'eip155:1' as CaipChainId;
const ETHEREUM_CAIP_ASSET_ID_PREFIX = `${ETHEREUM_CAIP_CHAIN_ID}/`;
const ETHEREUM_RWA_CHAIN_IDS = [ETHEREUM_CAIP_CHAIN_ID];
export const STOCKS_FEED_PREVIEW_PAGE_SIZE = 3;

interface UseStocksFeedOptions {
  query?: string;
  pageSize?: number;
  refresh?: RefreshConfig;
}

export interface UseStocksFeedResult {
  data: TrendingAsset[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  loadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
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
 * No-query sections request Ethereum only so the API page is not consumed by
 * other supported RWA chains before the section renders its 3-item preview.
 */
export const useStocksFeed = ({
  query,
  pageSize,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const trimmedQuery = query?.trim();
  const hasQuery = Boolean(trimmedQuery);
  const {
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalCount,
    refetch,
    loadMore,
  } = useRwaTokens({
    searchQuery: hasQuery ? trimmedQuery : undefined,
    chainIds: hasQuery ? undefined : ETHEREUM_RWA_CHAIN_IDS,
    pageSize,
  });

  const filteredData = useMemo(() => {
    // During search, surface tokens from all supported RWA chains so the user
    // can find any matching stock regardless of chain.
    if (hasQuery) return data;
    // Tab sections only show Ethereum mainnet tokens.
    return data.filter((asset) =>
      asset.assetId.startsWith(ETHEREUM_CAIP_ASSET_ID_PREFIX),
    );
  }, [data, hasQuery]);

  useFeedRefresh(refresh, refetch);

  return {
    data: filteredData,
    isLoading,
    refetch,
    loadMore,
    isLoadingMore,
    hasMore: hasNextPage,
    totalCount,
  };
};
