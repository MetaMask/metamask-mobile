import { useSyncExternalStore } from 'react';
import type { AssetIconUrls } from '../../utils/marketUtils';

/**
 * Icon URLs that failed to load during this JS session.
 *
 * `PerpsTokenLogo` mounts once per row. Virtualized lists (Perps markets, Social
 * Live) destroy and recreate those rows while scrolling. A per-instance error
 * flag retries the same 404 on every mount. This set remembers the miss so
 * every instance skips that URL and uses the next source, or the monogram.
 */
const failedPerpsIconUrls = new Set<string>();
const listeners = new Set<() => void>();
let failedPerpsIconUrlRevision = 0;

function emitFailedPerpsIconUrlsChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribeToFailedPerpsIconUrls(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getFailedPerpsIconUrlRevision(): number {
  return failedPerpsIconUrlRevision;
}

/**
 * Re-renders when any logo records a new miss, so every mounted instance
 * drops that URL together.
 *
 * @returns A revision that changes each time a URL is recorded or the cache is cleared.
 */
export function useFailedPerpsIconUrlRevision(): number {
  return useSyncExternalStore(
    subscribeToFailedPerpsIconUrls,
    getFailedPerpsIconUrlRevision,
    getFailedPerpsIconUrlRevision,
  );
}

/**
 * Returns the first icon URL that has not already failed this session.
 *
 * @param iconUrls - Primary and fallback URLs for one asset, or null.
 * @returns The URL to request, or null when every candidate has failed.
 */
export function selectAvailablePerpsIconUrl(
  iconUrls: AssetIconUrls | null,
): string | null {
  if (!iconUrls) {
    return null;
  }

  if (!failedPerpsIconUrls.has(iconUrls.primary)) {
    return iconUrls.primary;
  }

  if (!failedPerpsIconUrls.has(iconUrls.fallback)) {
    return iconUrls.fallback;
  }

  return null;
}

/**
 * Remembers that an icon URL failed so later mounts do not request it.
 *
 * @param url - The URL that failed to load.
 */
export function recordFailedPerpsIconUrl(url: string): void {
  if (failedPerpsIconUrls.has(url)) {
    return;
  }

  failedPerpsIconUrls.add(url);
  failedPerpsIconUrlRevision += 1;
  emitFailedPerpsIconUrlsChange();
}

/**
 * Forgets recorded misses. Unit tests call this so cases do not leak.
 */
export function clearFailedPerpsIconUrls(): void {
  if (failedPerpsIconUrls.size === 0) {
    return;
  }

  failedPerpsIconUrls.clear();
  failedPerpsIconUrlRevision += 1;
  emitFailedPerpsIconUrlsChange();
}
