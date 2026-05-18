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

/**
 * Time the watchlist response is considered fresh before TanStack Query will
 * refetch on remount/focus. Aligned with the tech spec recommendation
 * (60 seconds).
 */
export const WATCHLIST_QUERY_STALE_TIME_MS = 60_000;

/**
 * Options accepted by {@link useTokenWatchlistQuery}.
 *
 * `suggestedTokens` lets a caller bypass the user's stored watchlist and
 * hydrate a hard-coded list of CAIP-19 IDs instead. This powers the
 * empty-state CTA via {@link useSuggestedWatchlistItemsQuery} without
 * duplicating the hydration pipeline.
 */
export interface UseTokenWatchlistQueryOptions {
  suggestedTokens?: readonly string[];
}

/**
 * The watchlist query hydrates a list of CAIP-19 IDs in three steps:
 *
 * 1. Source the IDs. By default these are read from the user's stored
 * watchlist blob; when `suggestedTokens` is supplied that constant array
 * is the source of truth and storage is never touched.
 * 2. Hydrate IDs into token metadata via the Token API `/assets` endpoint.
 * This is the same hydration the trending UI relies on, so the watchlist
 * UI can render identical rows.
 * 3. Hydrate again with the user's wallet balance from controller state via
 * the assets-controllers selectors. Tokens the user does not hold default
 * to a zero balance so the UI still renders them.
 *
 * The third step lives in `select` rather than `queryFn` so it stays
 * subscribed to redux without invalidating the network response.
 *
 * The query is gated on {@link selectTokenWatchlistEnabled}: when the
 * `assets-global-watchlist-v1` remote feature flag is off, the underlying
 * `useQuery` stays disabled so neither storage nor the Token API is touched.
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
