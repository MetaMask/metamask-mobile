import { useSyncExternalStore } from 'react';
import type { AssetIconUrls } from '../../utils/marketUtils';

/**
 * Icon URLs that failed to load during this JS session.
 *
 * `PerpsTokenLogo` mounts once per row. Virtualized lists (Perps markets, Social
 * Live) destroy and recreate those rows while scrolling. A per-instance error
 * flag retries the same 404 on every mount. Each miss publishes a new immutable
 * snapshot so every instance can skip that URL.
 *
 * Snapshots stay immutable. Rendering must use the revision from
 * `useFailedPerpsIconUrlRevision` so React Compiler cannot reuse a URL it
 * computed for an older revision.
 */
const EMPTY_FAILED_PERPS_ICON_URLS: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
const failedPerpsIconUrlSnapshots: ReadonlySet<string>[] = [
  EMPTY_FAILED_PERPS_ICON_URLS,
];
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

/**
 * @returns The latest published miss revision.
 */
export function getFailedPerpsIconUrlRevision(): number {
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
 * Returns the icon URL that had not failed at `failedIconUrlRevision`.
 *
 * The revision is a real input. Callers must pass the revision they rendered
 * with. Reading the latest set instead would let React Compiler memoize the
 * result on `iconUrls` and keep a stale URL after a miss.
 *
 * @param iconUrls - Primary and fallback URLs for one asset, or null.
 * @param failedIconUrlRevision - Snapshot revision from `useFailedPerpsIconUrlRevision`.
 * @returns The URL to request, or null when every candidate has failed at that revision.
 */
export function selectAvailablePerpsIconUrl(
  iconUrls: AssetIconUrls | null,
  failedIconUrlRevision: number,
): string | null {
  if (!iconUrls) {
    return null;
  }

  const failedUrls =
    failedPerpsIconUrlSnapshots[failedIconUrlRevision] ??
    EMPTY_FAILED_PERPS_ICON_URLS;

  if (!failedUrls.has(iconUrls.primary)) {
    return iconUrls.primary;
  }

  if (!failedUrls.has(iconUrls.fallback)) {
    return iconUrls.fallback;
  }

  return null;
}

/**
 * Remembers that an icon URL failed so later renders at the new revision do not request it.
 *
 * @param url - The URL that failed to load.
 */
export function recordFailedPerpsIconUrl(url: string): void {
  const current =
    failedPerpsIconUrlSnapshots[failedPerpsIconUrlRevision] ??
    EMPTY_FAILED_PERPS_ICON_URLS;

  if (current.has(url)) {
    return;
  }

  const next = new Set(current);
  next.add(url);
  failedPerpsIconUrlRevision += 1;
  failedPerpsIconUrlSnapshots[failedPerpsIconUrlRevision] = next;
  emitFailedPerpsIconUrlsChange();
}

/**
 * Forgets recorded misses by publishing an empty snapshot. Unit tests call this
 * so cases do not leak. Older revisions stay unchanged.
 */
export function clearFailedPerpsIconUrls(): void {
  const current =
    failedPerpsIconUrlSnapshots[failedPerpsIconUrlRevision] ??
    EMPTY_FAILED_PERPS_ICON_URLS;

  if (current.size === 0) {
    return;
  }

  failedPerpsIconUrlRevision += 1;
  failedPerpsIconUrlSnapshots[failedPerpsIconUrlRevision] =
    EMPTY_FAILED_PERPS_ICON_URLS;
  emitFailedPerpsIconUrlsChange();
}
