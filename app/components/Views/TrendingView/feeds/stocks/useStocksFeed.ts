import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { NetworkToCaipChainId } from '../../../../UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { selectShowRobinhoodRwa } from '../../../../../selectors/featureFlagController/rwa';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';

const STOCKS_FEED_BASE_CHAIN_IDS: CaipChainId[] = [
  NetworkToCaipChainId.ETHEREUM,
];
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
 * Tab sections (no query): Ethereum tokens are shown. Robinhood Chain tokens
 * are included when `ASSETS4098ShowRobinhoodRwa` is on.
 *
 * Search (query present): all chains in the flag-aware RWA chain list are
 * included so users can find stocks across Ethereum, BNB, and Robinhood
 * when that flag is on.
 *
 * No-query sections request Ethereum (and Robinhood when the flag is on) so
 * the API page is not consumed by other supported RWA chains before the
 * section renders its 3-item preview.
 */
export const useStocksFeed = ({
  query,
  pageSize,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const trimmedQuery = query?.trim();
  const hasQuery = Boolean(trimmedQuery);
  const showRobinhoodRwa = useSelector(selectShowRobinhoodRwa);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const stocksFeedChainIds = useMemo(() => {
    if (!showRobinhoodRwa) {
      return STOCKS_FEED_BASE_CHAIN_IDS;
    }
    return [...STOCKS_FEED_BASE_CHAIN_IDS, NetworkToCaipChainId.ROBINHOOD];
  }, [showRobinhoodRwa]);
  const stocksFeedAssetIdPrefixes = useMemo(
    () => stocksFeedChainIds.map((chainId) => `${chainId}/`),
    [stocksFeedChainIds],
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
    searchQuery: hasQuery ? trimmedQuery : undefined,
    chainIds: hasQuery ? undefined : stocksFeedChainIds,
    pageSize,
    includeTokenSecurityData: hasQuery && isBasicFunctionalityEnabled,
  });

  const filteredData = useMemo(() => {
    // During search, surface tokens from all supported RWA chains so the user
    // can find any matching stock regardless of chain.
    if (hasQuery) return data;
    // Tab sections show Ethereum, plus Robinhood Chain when the flag is on.
    return data.filter((asset) =>
      stocksFeedAssetIdPrefixes.some((prefix) =>
        asset.assetId.startsWith(prefix),
      ),
    );
  }, [data, hasQuery, stocksFeedAssetIdPrefixes]);

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
