import { useMemo } from 'react';
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenWatchlistEnabled } from '../../../Assets/selectors/featureFlags';
import { readFromTokenWatchList, type WatchlistBlob } from '../storage';
import {
  addBalanceToTokens,
  buildAssetsByAssetId,
  type AssetsByChain,
  type WatchlistTokenWithBalance,
} from '../utils/addBalanceToTokens';
import { getTokens, type WatchlistTokenMetadata } from '../utils/getTokens';
import { tokenWatchlistQueryKeys } from './watchlist-query-keys';

export const WATCHLIST_QUERY_STALE_TIME_MS = 60_000;

export interface UseTokenWatchlistQueryOptions {
  /** When provided, bypass the stored watchlist and hydrate these IDs instead. */
  suggestedTokens?: readonly string[];
  /** When hydrating suggested tokens, vary the cache key if SpaceX is included. */
  suggestedIncludeSpaceX?: boolean;
}

/**
 * Reads the watchlist IDs (or `suggestedTokens`), hydrates them via the
 * Token API, then layers on the user's wallet balance from controller state.
 * Disabled when the watchlist feature flag is off.
 */
export const useTokenWatchlistQuery = (
  options: UseTokenWatchlistQueryOptions = {},
): UseQueryResult<WatchlistTokenWithBalance[], Error> => {
  const { suggestedTokens, suggestedIncludeSpaceX = false } = options;

  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);

  const assetsByChain = useSelector(
    selectAssetsBySelectedAccountGroup,
  ) as AssetsByChain;

  const assetsByAssetId = useMemo(
    () => buildAssetsByAssetId(assetsByChain),
    [assetsByChain],
  );

  const queryClient = useQueryClient();

  return useQuery({
    queryKey: suggestedTokens
      ? tokenWatchlistQueryKeys.suggested(suggestedIncludeSpaceX)
      : tokenWatchlistQueryKeys.hydrated,
    staleTime: WATCHLIST_QUERY_STALE_TIME_MS,
    enabled: isWatchlistEnabled,
    queryFn: async (): Promise<WatchlistTokenMetadata[]> => {
      if (suggestedTokens) {
        return getTokens(suggestedTokens);
      }
      const blob = await readFromTokenWatchList();
      if (!blob.assets.length) {
        return [];
      }
      const tokens = await getTokens(blob.assets);

      // Reconcile against the latest optimistic blob (preferred) or storage.
      // A slow getTokens started by add can otherwise finish after remove and
      // resurrect a token the user already unwatched.
      const cachedBlob = queryClient.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      const latestAssets =
        cachedBlob?.assets ?? (await readFromTokenWatchList()).assets;
      if (!latestAssets.length) {
        return [];
      }

      const byId = new Map(
        tokens.map((token) => [String(token.assetId).toLowerCase(), token]),
      );
      return latestAssets
        .map((id) => byId.get(id.toLowerCase()))
        .filter(
          (token): token is WatchlistTokenMetadata => token !== undefined,
        );
    },
    select: (tokens: WatchlistTokenMetadata[]) =>
      addBalanceToTokens(tokens, assetsByAssetId),
  });
};
