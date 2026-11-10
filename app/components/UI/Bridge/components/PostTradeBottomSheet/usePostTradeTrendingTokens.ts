import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTrendingTokens,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';
import type { BridgeToken } from '../../types';
import {
  getMinLiquidityForChains,
  getMinVolume24hForChains,
} from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';

export const POST_TRADE_TRENDING_TOKENS_LIMIT = 20;

const STALE_TIME_MS = 5 * 60 * 1000;
const POST_TRADE_TRENDING_TOKENS_QUERY_KEY =
  'bridge-post-trade-trending-tokens';

const getSortedTrendingTokens = async (chainId: CaipChainId) => {
  const chainIds = [chainId];
  const tokens = await getTrendingTokens({
    chainIds,
    sort: 'h24_trending',
    minLiquidity: getMinLiquidityForChains(chainIds),
    minVolume24hUsd: getMinVolume24hForChains(chainIds),
    minMarketCap: 0,
    excludeLabels: ['stable_coin', 'blue_chip'],
  });

  return sortTrendingTokens(
    tokens,
    PriceChangeOption.MarketCap,
    SortDirection.Descending,
  );
};

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
  const isQueryEnabled = enabled && Boolean(destinationCaipChainId);

  const destinationQuery = useQuery<TrendingAsset[], Error>({
    queryKey: [POST_TRADE_TRENDING_TOKENS_QUERY_KEY, destinationCaipChainId],
    queryFn: () => {
      if (!destinationCaipChainId) {
        return Promise.resolve([]);
      }

      return getSortedTrendingTokens(destinationCaipChainId);
    },
    enabled: isQueryEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
  });
  const destinationTokens = useMemo(
    () =>
      destinationQuery.data?.slice(0, POST_TRADE_TRENDING_TOKENS_LIMIT) ?? [],
    [destinationQuery.data],
  );
  const isFallbackEnabled =
    isQueryEnabled && destinationCaipChainId !== NetworkToCaipChainId.ETHEREUM;
  const shouldFillWithFallback =
    isFallbackEnabled &&
    destinationQuery.isSuccess &&
    destinationTokens.length < POST_TRADE_TRENDING_TOKENS_LIMIT;
  const fallbackQuery = useQuery<TrendingAsset[], Error>({
    queryKey: [
      POST_TRADE_TRENDING_TOKENS_QUERY_KEY,
      NetworkToCaipChainId.ETHEREUM,
    ],
    queryFn: () => getSortedTrendingTokens(NetworkToCaipChainId.ETHEREUM),
    enabled: isFallbackEnabled,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
  });
  const tokens = useMemo(() => {
    if (!shouldFillWithFallback || !fallbackQuery.data?.length) {
      return destinationTokens;
    }

    return [
      ...destinationTokens,
      ...fallbackQuery.data.slice(
        0,
        POST_TRADE_TRENDING_TOKENS_LIMIT - destinationTokens.length,
      ),
    ];
  }, [destinationTokens, fallbackQuery.data, shouldFillWithFallback]);

  return {
    tokens,
    isLoading:
      isQueryEnabled &&
      (destinationQuery.isLoading ||
        (shouldFillWithFallback && fallbackQuery.isLoading)),
    error: destinationQuery.error,
    refetch: destinationQuery.refetch,
  };
};
