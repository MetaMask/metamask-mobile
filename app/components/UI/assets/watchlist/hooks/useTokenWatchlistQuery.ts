import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenWatchlistEnabled } from '../../selectors/featureFlags';
import { readFromTokenWatchList } from '../storage';
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
}

/**
 * Reads the watchlist IDs (or `suggestedTokens`), hydrates them via the
 * Token API, then layers on the user's wallet balance from controller state.
 * Disabled when the watchlist feature flag is off.
 */
export const useTokenWatchlistQuery = (
  options: UseTokenWatchlistQueryOptions = {},
): UseQueryResult<WatchlistTokenWithBalance[], Error> => {
  const { suggestedTokens } = options;

  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);

  const assetsByChain = useSelector(
    selectAssetsBySelectedAccountGroup,
  ) as AssetsByChain;

  const assetsByAssetId = useMemo(
    () => buildAssetsByAssetId(assetsByChain),
    [assetsByChain],
  );

  return useQuery<WatchlistTokenMetadata[], Error, WatchlistTokenWithBalance[]>(
    {
      queryKey: suggestedTokens
        ? tokenWatchlistQueryKeys.suggested
        : tokenWatchlistQueryKeys.blob,
      staleTime: WATCHLIST_QUERY_STALE_TIME_MS,
      enabled: isWatchlistEnabled,
      queryFn: async () => {
        if (suggestedTokens) {
          return getTokens(suggestedTokens);
        }
        const blob = await readFromTokenWatchList();
        if (!blob.assets.length) {
          return [];
        }
        return getTokens(blob.assets);
      },
      select: (tokens) => addBalanceToTokens(tokens, assetsByAssetId),
    },
  );
};
