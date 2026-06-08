import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import {
  getTrendingTokens,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';
import { isCaipChainId } from '@metamask/utils';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import type { BridgeToken } from '../../types';
import {
  getMinLiquidityForChains,
  getMinVolume24hForChains,
} from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../../Trending/utils/sortTrendingTokens';

export const POST_TRADE_TRENDING_TOKENS_LIMIT = 20;

const STALE_TIME_MS = 5 * 60 * 1000;
const POST_TRADE_TRENDING_TOKENS_QUERY_KEY =
  'bridge-post-trade-trending-tokens';
const MARKET_CAP_SORT_OPTION =
  'market_cap' as Parameters<typeof sortTrendingTokens>[1];
const DESCENDING_SORT_DIRECTION =
  'descending' as Parameters<typeof sortTrendingTokens>[2];

export const getDestinationCaipChainId = (
  destToken?: Pick<BridgeToken, 'chainId'>,
): CaipChainId | undefined => {
  const chainId = destToken?.chainId?.toString();
  if (!chainId) {
    return undefined;
  }

  if (isCaipChainId(chainId)) {
    return chainId;
  }

  try {
    return formatChainIdToCaip(chainId) as CaipChainId;
  } catch {
    return undefined;
  }
};

export const usePostTradeTrendingTokens = ({
  destToken,
  enabled = true,
}: {
  destToken?: BridgeToken;
  enabled?: boolean;
}) => {
  const currentCurrency = useSelector(selectCurrentCurrency) || 'usd';
  const destinationCaipChainId = useMemo(
    () => getDestinationCaipChainId(destToken),
    [destToken],
  );
  const chainIds = useMemo(
    () => (destinationCaipChainId ? [destinationCaipChainId] : []),
    [destinationCaipChainId],
  );
  const isQueryEnabled = enabled && Boolean(destinationCaipChainId);

  const query = useQuery<TrendingAsset[], Error>({
    queryKey: [
      POST_TRADE_TRENDING_TOKENS_QUERY_KEY,
      destinationCaipChainId,
      currentCurrency.toLowerCase(),
    ],
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
        includeTokenSecurityData: true,
        vsCurrency: currentCurrency.toLowerCase(),
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
      MARKET_CAP_SORT_OPTION,
      DESCENDING_SORT_DIRECTION,
    ).slice(0, POST_TRADE_TRENDING_TOKENS_LIMIT);
  }, [query.data]);

  return {
    tokens,
    isLoading: isQueryEnabled && query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
