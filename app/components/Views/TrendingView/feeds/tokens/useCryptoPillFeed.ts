import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  keepPreviousData,
  useQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import Logger from '../../../../../util/Logger';
import { useStableArray } from '../../../../UI/Perps/hooks/useStableArray';
import { useTrendingChainIds } from '../../../../UI/Trending/hooks/useTrendingChainIds/useTrendingChainIds';
import { filterLowQualityTokens } from '../../../../UI/Trending/utils/filterTrendingTokens';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { useTokenWatchlistQuery } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { toWatchlistDisplayTokens } from '../../../Homepage/Sections/Watchlist/utils/toWatchlistDisplayTokens';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import {
  cryptoPillQueryKeys,
  fetchCryptoPillTokens,
  type CryptoPillRequestParams,
} from './cryptoPillApi';
import {
  CRYPTO_CHAIN_PILLS,
  CRYPTO_TOKEN_PILLS,
  CRYPTO_WATCHLIST_PILL,
  type CryptoPillKey,
} from './cryptoPillConfig';

/** Per-pill query state consumed by the crypto pill block. */
export interface CryptoPillFeedResult {
  data?: TrendingAsset[];
  isLoading: boolean;
  isError: boolean;
}

export interface CryptoPillFeedOptions {
  /** Only this pill's query is enabled before prefetching starts. */
  activePillKey: CryptoPillKey;
  /** Pull-to-refresh wiring from the Explore tab. */
  refresh?: RefreshConfig;
}

export interface CryptoPillFeed {
  /** Query state per pill key, including the watchlist pill. */
  results: Record<string, CryptoPillFeedResult>;
}

interface CryptoPillQueryDescriptor {
  key: CryptoPillKey;
  chainIds: CaipChainId[];
  request: CryptoPillRequestParams;
  fallback?: CryptoPillRequestParams;
}

const CRYPTO_PILL_STALE_TIME_MS = 300_000;

/**
 * One TanStack query per crypto pill. The active pill fetches immediately;
 * the remaining pills are prefetched in the background once the active pill
 * has finished loading. Chain pills fall back to a popular request when
 * their trending request returns no tokens.
 */
export const useCryptoPillFeed = ({
  activePillKey,
  refresh,
}: CryptoPillFeedOptions): CryptoPillFeed => {
  const queryClient = useQueryClient();
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const currentCurrency = useSelector(selectCurrentCurrency) || 'usd';
  const vsCurrency = currentCurrency.toLowerCase();
  const trendingChainIds = useStableArray(useTrendingChainIds());

  const watchlistQuery = useTokenWatchlistQuery();

  const [prefetchStarted, setPrefetchStarted] = useState(false);

  const descriptors = useMemo<CryptoPillQueryDescriptor[]>(
    () => [
      ...CRYPTO_TOKEN_PILLS.flatMap(({ key, request }) =>
        request ? [{ key, chainIds: trendingChainIds, request }] : [],
      ),
      ...CRYPTO_CHAIN_PILLS.map(
        ({ key, chainId, trending, popularFallback }) => ({
          key,
          chainIds: [chainId],
          request: trending,
          fallback: popularFallback,
        }),
      ),
    ],
    [trendingChainIds],
  );

  const fetchPillTokens = useCallback(
    async ({
      descriptor,
      signal,
    }: {
      descriptor: CryptoPillQueryDescriptor;
      signal?: AbortSignal;
    }): Promise<TrendingAsset[]> => {
      const primary = filterLowQualityTokens(
        await fetchCryptoPillTokens({
          ...descriptor.request,
          chainIds: descriptor.chainIds,
          vsCurrency,
          signal,
        }),
      );
      if (primary.length > 0 || !descriptor.fallback) {
        return primary;
      }
      return filterLowQualityTokens(
        await fetchCryptoPillTokens({
          ...descriptor.fallback,
          chainIds: descriptor.chainIds,
          vsCurrency,
          signal,
        }),
      );
    },
    [vsCurrency],
  );

  const tokenPillResults = useQueries({
    queries: descriptors.map((descriptor) => ({
      queryKey: cryptoPillQueryKeys.pill(
        descriptor.key,
        descriptor.chainIds.join(','),
        vsCurrency,
      ),
      queryFn: ({
        signal,
      }: {
        signal?: AbortSignal;
      }): Promise<TrendingAsset[]> => fetchPillTokens({ descriptor, signal }),
      enabled: prefetchStarted || descriptor.key === activePillKey,
      staleTime: CRYPTO_PILL_STALE_TIME_MS,
      placeholderData: keepPreviousData,
    })),
    combine: (
      queryResults: UseQueryResult<TrendingAsset[], Error>[],
    ): Record<string, CryptoPillFeedResult> => {
      const combined: Record<string, CryptoPillFeedResult> = {};
      descriptors.forEach((descriptor, index) => {
        const query = queryResults[index];
        if (query) {
          combined[descriptor.key] = {
            data: query.data,
            isLoading: query.isLoading,
            isError: query.isError,
          };
        }
      });
      return combined;
    },
  });

  const watchlistResult = useMemo<CryptoPillFeedResult>(
    () => ({
      data:
        watchlistQuery.data === undefined
          ? undefined
          : toWatchlistDisplayTokens(watchlistQuery.data),
      isLoading: watchlistQuery.isLoading,
      isError: watchlistQuery.isError,
    }),
    [watchlistQuery.data, watchlistQuery.isLoading, watchlistQuery.isError],
  );

  const results = useMemo<Record<string, CryptoPillFeedResult>>(
    () => ({
      ...tokenPillResults,
      [CRYPTO_WATCHLIST_PILL.key]: watchlistResult,
    }),
    [tokenPillResults, watchlistResult],
  );

  const activeResult =
    activePillKey === CRYPTO_WATCHLIST_PILL.key
      ? watchlistResult
      : tokenPillResults[activePillKey];

  const activeLoaded =
    activePillKey === CRYPTO_WATCHLIST_PILL.key ||
    activeResult === undefined ||
    activeResult.data !== undefined ||
    activeResult.isError;

  useEffect(() => {
    if (prefetchStarted || !activeLoaded) {
      return;
    }
    setPrefetchStarted(true);
  }, [prefetchStarted, activeLoaded]);

  useEffect(() => {
    const erroredKeys = descriptors
      .filter((descriptor) => tokenPillResults[descriptor.key]?.isError)
      .map((descriptor) => descriptor.key);
    if (erroredKeys.length > 0) {
      Logger.error(
        new Error(erroredKeys.join(', ')),
        'ExploreCryptoPillFeed: pill query failed',
      );
    }
  }, [descriptors, tokenPillResults]);

  const { refetch: refetchWatchlist } = watchlistQuery;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: cryptoPillQueryKeys.all,
      }),
      isWatchlistEnabled ? refetchWatchlist() : undefined,
    ]);
  }, [queryClient, isWatchlistEnabled, refetchWatchlist]);

  useFeedRefresh(refresh, handleRefresh);

  return { results };
};
