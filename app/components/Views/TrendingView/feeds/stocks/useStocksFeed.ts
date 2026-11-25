import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { NetworkToCaipChainId } from '../../../../UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { RWA_CHAIN_IDS } from '../../../../UI/Trending/utils/trendingNetworksList';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { SearchRequestPerformance } from '../../../../../util/searchPerformance';
import { stripLeadingDollarQuery } from '../../search/stocksPromotion';

const STOCKS_FEED_RWA_CHAIN_IDS: CaipChainId[] = [
  NetworkToCaipChainId.ETHEREUM,
  NetworkToCaipChainId.ROBINHOOD,
];
const STOCKS_FEED_ASSET_ID_PREFIXES = STOCKS_FEED_RWA_CHAIN_IDS.map(
  (chainId) => `${chainId}/`,
);
export const STOCKS_FEED_PREVIEW_PAGE_SIZE = 3;

interface UseStocksFeedOptions {
  query?: string;
  performance?: SearchRequestPerformance;
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
 * Tab sections (no query): Ethereum and Robinhood Chain tokens are shown.
 *
 * Search (query present): all chains in RWA_CHAIN_IDS are included so users
 * can find stocks across Ethereum, BNB, and Robinhood.
 *
 * No-query sections request Ethereum and Robinhood only so the API page is not
 * consumed by other supported RWA chains before the section renders its
 * 3-item preview.
 */
export const useStocksFeed = ({
  query,
  performance,
  pageSize,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const normalizedQuery = stripLeadingDollarQuery(query);
  const hasQuery = Boolean(normalizedQuery);
  const chainIds = hasQuery ? RWA_CHAIN_IDS : STOCKS_FEED_RWA_CHAIN_IDS;
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const {
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    totalCount,
    refetch,
    loadMore,
  } = useRwaTokens({
    searchQuery: hasQuery ? normalizedQuery : undefined,
    chainIds,
    pageSize,
    ...(hasQuery && performance ? { performance } : {}),
    includeTokenSecurityData: hasQuery && isBasicFunctionalityEnabled,
  });

  const filteredData = useMemo(() => {
    // During search, surface tokens from all supported RWA chains so the user
    // can find any matching stock regardless of chain.
    if (hasQuery) return data;
    // Tab sections show Ethereum and Robinhood Chain tokens.
    return data.filter((asset) =>
      STOCKS_FEED_ASSET_ID_PREFIXES.some((prefix) =>
        asset.assetId.startsWith(prefix),
      ),
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
