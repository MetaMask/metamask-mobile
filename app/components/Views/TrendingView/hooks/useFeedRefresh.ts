import { useEffect } from 'react';
import type { RefreshConfig } from './useExploreRefresh';

/**
 * Wires a feed's `refetch` to the page's `refresh.trigger`. Skips trigger 0
 * (initial mount) since the underlying hook already fetches on first mount.
 */
export const useFeedRefresh = (
  refresh: RefreshConfig | undefined,
  refetch: (() => Promise<void> | void) | undefined,
): void => {
  useEffect(() => {
    if (!refresh || refresh.trigger === 0 || !refetch) return;
    refetch();
  }, [refresh, refetch]);
};
