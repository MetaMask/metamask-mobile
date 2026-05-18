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
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';

/**
 * Time the watchlist response is considered fresh before TanStack Query will
 * refetch on remount/focus. Aligned with the tech spec recommendation
 * (60 seconds).
 */
export const WATCHLIST_QUERY_STALE_TIME_MS = 60_000;

/**
 * The watchlist query hydrates the raw CAIP-19 storage blob in three steps:
 *
 * 1. Read the storage blob (CAIP-19 IDs only).
 * 2. Hydrate IDs into token metadata via the Token API `/assets` endpoint.
 * This is the same hydration the trending UI relies on, so the watchlist
 * UI can render identical rows.
 * 3. Hydrate again with the user's wallet balance from controller state via
 * the assets-controllers selectors. Tokens the user does not hold default
 * to a zero balance so the UI still renders them.
 *
 * The third step lives in `select` rather than `queryFn` so it stays
 * subscribed to redux without invalidating the network response, and so the
 * sibling `useSuggestedWatchlistItemsQuery` hook can share the same logic.
 *
 * The query is gated on {@link selectTokenWatchlistEnabled}: when the
 * `assets-global-watchlist-v1` remote feature flag is off, the underlying
 * `useQuery` stays disabled so neither storage nor the Token API is touched.
 */
export const useTokenWatchlistQuery = (): UseQueryResult<
  WatchlistTokenWithBalance[],
  Error
> => {
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
      queryKey: tokenWatchlistQueryKeys.blob,
      staleTime: WATCHLIST_QUERY_STALE_TIME_MS,
      enabled: isWatchlistEnabled,
      queryFn: async () => {
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
