import type { ActivityListItem } from '../../../util/activity-adapters';

/**
 * Transient hand-off for Activity rows that may not re-resolve cleanly by hash
 * alone: provider-backed rows (Perps / Predict) and local EVM rows (STX/gasless
 * hash flips while `TransactionMeta.id` is stable). The row is stashed before
 * navigating and only its unique key rides in the navigation params, so params
 * stay serializable. A per-navigation key (not chainId+hash) means a later open
 * of the same tx can't pick up a stale row. Not persisted — a cold start falls
 * back to normal resolution.
 */

// Cap the cache so it can't grow unbounded over a session.
const MAX_ENTRIES = 10;

let nextKey = 0;
const preloadedItems = new Map<string, ActivityListItem>();

/** Stash a row; returns the key to pass as `ActivityDetailsParams.preloadKey`. */
export function stashPreloadedActivityItem(item: ActivityListItem): string {
  const key = String((nextKey += 1));
  if (preloadedItems.size >= MAX_ENTRIES) {
    // Evict the oldest entry (Map keeps insertion order).
    const oldest = preloadedItems.keys().next().value;
    if (oldest !== undefined) {
      preloadedItems.delete(oldest);
    }
  }
  preloadedItems.set(key, item);
  return key;
}

/** Get a stashed row by its navigation-param key. */
export function getPreloadedActivityItem(
  key?: string,
): ActivityListItem | undefined {
  return key ? preloadedItems.get(key) : undefined;
}
