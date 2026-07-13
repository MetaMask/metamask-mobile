import { type UseQueryResult } from '@tanstack/react-query';

import { type WatchlistTokenWithBalance } from '../utils/addBalanceToTokens';
import { useTokenWatchlistQuery } from './useTokenWatchlistQuery';

/** Curated ETH / BTC / SOL native asset IDs surfaced in the empty-state CTA. */
export const SUGGESTED_WATCHLIST_ASSET_IDS: readonly string[] = [
  'eip155:1/slip44:60',
  'bip122:000000000019d6689c085ae165831e93/slip44:0',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
] as const;

export const useSuggestedWatchlistItemsQuery = (): UseQueryResult<
  WatchlistTokenWithBalance[],
  Error
> => useTokenWatchlistQuery({ suggestedTokens: SUGGESTED_WATCHLIST_ASSET_IDS });
