import type { TrendingAsset } from '@metamask/assets-controllers';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';

interface UseStocksFeedOptions {
  query?: string;
  refresh?: RefreshConfig;
}

export interface UseStocksFeedResult {
  data: TrendingAsset[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/** Tokenized stocks (RWAs on Ethereum mainnet). */
export const useStocksFeed = ({
  query,
  refresh,
}: UseStocksFeedOptions = {}): UseStocksFeedResult => {
  const { data, isLoading, refetch } = useRwaTokens({
    searchQuery: query,
    ...(query ? {} : { chainIds: ['eip155:1'] }),
  });

  useFeedRefresh(refresh, refetch);

  return { data, isLoading, refetch };
};
