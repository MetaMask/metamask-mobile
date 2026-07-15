import { useCallback, useEffect, useState } from 'react';

/** Refresh signal forwarded to feed hooks. */
export interface RefreshConfig {
  /** Incrementing counter; feed hooks refetch when this changes. */
  trigger: number;
  /** When true, suppress skeletons during refresh (silent refresh). */
  silentRefresh: boolean;
}

/** Props every Explore tab consumes. Matches `useExploreRefresh`'s return shape. */
export interface TabProps {
  refresh: RefreshConfig;
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Owns pull-to-refresh state for the Explore page. Forward `refresh` to feed
 * hooks; they refetch when `refresh.trigger` increments.
 *
 * `silentRefresh: true` means subsequent fetches should suppress skeletons;
 * the first mount is non-silent so initial loads still show a skeleton.
 */
export const useExploreRefresh = (): TabProps => {
  const [refreshing, setRefreshing] = useState(false);
  const [refresh, setRefresh] = useState<RefreshConfig>({
    trigger: 0,
    silentRefresh: true,
  });

  // Hide the spinner shortly after pull-to-refresh fires; data hooks own the
  // actual refetch lifecycle independently.
  useEffect(() => {
    if (!refreshing) return;
    const timeoutId = setTimeout(() => setRefreshing(false), 1000);
    return () => clearTimeout(timeoutId);
  }, [refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefresh((prev) => ({
      trigger: prev.trigger + 1,
      silentRefresh: true,
    }));
  }, []);

  return { refresh, refreshing, onRefresh };
};
