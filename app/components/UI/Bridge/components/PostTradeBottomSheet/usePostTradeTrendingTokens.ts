import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTrendingTokens,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { BridgeToken } from '../../types';
import {
  getMinLiquidityForChains,
  getMinVolume24hForChains,
} from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';

export const POST_TRADE_TRENDING_TOKENS_LIMIT = 20;

const STALE_TIME_MS = 5 * 60 * 1000;
const POST_TRADE_TRENDING_TOKENS_QUERY_KEY =
  'bridge-post-trade-trending-tokens';

export const usePostTradeTrendingTokens = ({
  destToken,
  enabled = true,
}: {
  destToken?: BridgeToken;
  enabled?: boolean;
}) => {
  const destinationCaipChainId = destToken?.chainId
    ? formatChainIdToCaip(destToken.chainId)
    : undefined;
  const chainIds = destinationCaipChainId ? [destinationCaipChainId] : [];
  const isQueryEnabled = enabled && Boolean(destinationCaipChainId);

  const query = useQuery<TrendingAsset[], Error>({
    queryKey: [POST_TRADE_TRENDING_TOKENS_QUERY_KEY, destinationCaipChainId],
    queryFn: () => {
      if (!destinationCaipChainId) {
        return Promise.resolve([]);
      }

      return getTrendingTokens({
        chainIds,
        sort: 'h24_trending',
        minLiquidity: getMinLiquidityForChains(chainIds),
        minVolume24hUsd: getMinVolume24hForChains(chainIds),
        minMarketCap: 0,
        excludeLabels: ['stable_coin', 'blue_chip'],
      });
    },
    enabled: isQueryEnabled,
    staleTime: STALE_TIME_MS,
    cacheTime: STALE_TIME_MS,
  });

  const tokens = useMemo(() => {
    if (!query.data?.length) {
      return [];
    }

    return sortTrendingTokens(
      query.data,
      PriceChangeOption.MarketCap,
      SortDirection.Descending,
    ).slice(0, POST_TRADE_TRENDING_TOKENS_LIMIT);
  }, [query.data]);

  return {
    tokens,
    isLoading: isQueryEnabled && query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
