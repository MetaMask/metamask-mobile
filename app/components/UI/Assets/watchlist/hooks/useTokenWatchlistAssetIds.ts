import { useQuery } from '@tanstack/react-query';
import { readFromTokenWatchList, type WatchlistBlob } from '../storage';
import { tokenWatchlistQueryKeys } from './watchlist-query-keys';

/**
 * Reactive subscription to the raw stored watchlist asset IDs.
 *
 * Optimistic add/remove mutations update the shared blob cache, so the
 * returned list reflects changes immediately. Returns `[]` until the
 * blob has loaded.
 */
export const useTokenWatchlistAssetIds = (): string[] => {
  const { data: blob } = useQuery<WatchlistBlob>({
    queryKey: tokenWatchlistQueryKeys.blob,
    queryFn: readFromTokenWatchList,
    staleTime: Infinity,
  });
  return blob?.assets ?? [];
};
