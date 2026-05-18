import { type UseQueryResult } from '@tanstack/react-query';

import { type WatchlistTokenWithBalance } from '../utils/addBalanceToTokens';
import { useTokenWatchlistQuery } from './useTokenWatchlistQuery';

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
 * Delegates to {@link useTokenWatchlistQuery} with `suggestedTokens` set so
 * the storage read step is skipped and the curated list is the source of
 * truth. The metadata + balance hydration and the feature-flag gate are
 * inherited from the parent hook, so the empty-state and the full
 * watchlist render visually identical rows.
 */
export const useSuggestedWatchlistItemsQuery = (): UseQueryResult<
  WatchlistTokenWithBalance[],
  Error
> => useTokenWatchlistQuery({ suggestedTokens: SUGGESTED_WATCHLIST_ASSET_IDS });
