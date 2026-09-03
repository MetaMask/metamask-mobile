import { useEffect, useRef } from 'react';
import type { RefreshConfig } from './useExploreRefresh';

/**
 * Wires a feed's `refetch` to the page's `refresh.trigger`. Skips trigger 0
 * (initial mount) since the underlying hook already fetches on first mount.
 * Disabled consumers still observe triggers so enabling them does not replay
 * an already-consumed refresh.
 */
export const useFeedRefresh = (
  refresh: RefreshConfig | undefined,
  refetch: (() => Promise<void> | void) | undefined,
  enabled = true,
): void => {
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    const trigger = refresh?.trigger;
    if (trigger === undefined || trigger === 0) return;

    if (!enabled) {
      lastTriggerRef.current = trigger;
      return;
    }

    if (trigger === lastTriggerRef.current || !refetch) return;

    lastTriggerRef.current = trigger;
    refetch();
  }, [enabled, refresh?.trigger, refetch]);
};
