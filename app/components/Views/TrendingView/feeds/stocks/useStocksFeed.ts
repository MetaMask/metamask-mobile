import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { hasProperty, type CaipChainId } from '@metamask/utils';
import { NetworkToCaipChainId } from '../../../../UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { RWA_CHAIN_IDS } from '../../../../UI/Trending/utils/trendingNetworksList';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';

const SHOW_ROBINHOOD_RWA_FLAG_NAME = 'ASSETS4098ShowRobinhoodRwa';

const selectShowRobinhoodRwa = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    hasProperty(remoteFeatureFlags, SHOW_ROBINHOOD_RWA_FLAG_NAME) &&
    remoteFeatureFlags[SHOW_ROBINHOOD_RWA_FLAG_NAME] === true,
);

const STOCKS_FEED_RWA_CHAIN_IDS: CaipChainId[] = [
  NetworkToCaipChainId.ETHEREUM,
  NetworkToCaipChainId.ROBINHOOD,
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
  pageSize,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const trimmedQuery = query?.trim();
  const hasQuery = Boolean(trimmedQuery);
  const showRobinhoodRwa = useSelector(selectShowRobinhoodRwa);
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const stocksFeedChainIds = useMemo(
    () =>
      showRobinhoodRwa
        ? STOCKS_FEED_RWA_CHAIN_IDS
        : STOCKS_FEED_RWA_CHAIN_IDS.filter(
            (chainId) => chainId !== NetworkToCaipChainId.ROBINHOOD,
          ),
    [showRobinhoodRwa],
  );
  const stocksFeedAssetIdPrefixes = useMemo(
    () => stocksFeedChainIds.map((chainId) => `${chainId}/`),
    [stocksFeedChainIds],
  );
  const searchChainIds = useMemo(
    () =>
      showRobinhoodRwa
        ? RWA_CHAIN_IDS
        : RWA_CHAIN_IDS.filter(
            (chainId) => chainId !== NetworkToCaipChainId.ROBINHOOD,
          ),
    [showRobinhoodRwa],
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
    chainIds: hasQuery ? searchChainIds : stocksFeedChainIds,
    pageSize,
    includeTokenSecurityData: hasQuery && isBasicFunctionalityEnabled,
  });

  const filteredData = useMemo(() => {
    // During search, surface tokens from all supported RWA chains so the user
    // can find any matching stock regardless of chain.
    if (hasQuery) return data;
    // Tab sections show Ethereum and Robinhood Chain tokens.
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
