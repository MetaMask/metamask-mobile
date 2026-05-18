import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenWatchlistEnabled } from '../../selectors/featureFlags';
import {
  addBalanceToTokens,
  buildAssetsByAssetId,
  type AssetsByChain,
  type WatchlistTokenWithBalance,
} from '../utils/addBalanceToTokens';
import { getTokens, type WatchlistTokenMetadata } from '../utils/getTokens';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import { WATCHLIST_QUERY_STALE_TIME_MS } from './useTokenWatchlistQuery';

/**
 * The three curated CAIP-19 asset IDs we surface in the empty-state CTA.
 *
 * Per the watchlist tech spec these are intentionally hard-coded: they
 * power the "you haven't starred anything yet" view, so we want a small,
 * stable, well-known set rather than a network-driven recommendation.
 *
 * - ETH (mainnet native)
 * - BTC (bip122 mainnet native)
 * - SOL (mainnet native)
 */
export const SUGGESTED_WATCHLIST_ASSET_IDS: readonly string[] = [
  'eip155:1/slip44:60',
  'bip122:000000000019d6689c085ae165831e93/slip44:0',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
] as const;

/**
 * Returns the curated suggested watchlist items, hydrated with metadata and
 * (best-effort) the user's wallet balance.
 *
 * Mirrors {@link useTokenWatchlistQuery} but skips the storage read step:
 * the input is a hard-coded constant rather than a user-managed blob.
 * Sharing the same hydration utilities ensures the empty-state and the
 * full list render visually identical token rows.
 *
 * Gated on the same {@link selectTokenWatchlistEnabled} flag as
 * {@link useTokenWatchlistQuery}: when the flag is off the underlying
 * `useQuery` stays disabled and the Token API is never called.
 */
export const useSuggestedWatchlistItemsQuery = (): UseQueryResult<
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
      queryKey: tokenWatchlistQueryKeys.suggested,
      staleTime: WATCHLIST_QUERY_STALE_TIME_MS,
      enabled: isWatchlistEnabled,
      queryFn: () => getTokens(SUGGESTED_WATCHLIST_ASSET_IDS),
      select: (tokens) => addBalanceToTokens(tokens, assetsByAssetId),
    },
  );
};
