import { useSyncExternalStore } from 'react';
/**
 * Session-wide store of follower avatar images resolved to `data:` URIs
 * (ASSETS-4102).
 *
 * RN downloads each remote avatar once and hands the WebView a `data:` URI so
 * the chart CSP can stay `img-src 'self' data:`. The TDP (and its chart) mount
 * and unmount as the user navigates, so per-mount state would forget what was
 * already resolved. Following the `failedPerpsIconUrls` pattern, this is a
 * module-level store with listeners, read via `useSyncExternalStore`: every
 * mount reads the cache on its first render, and a download that finishes
 * after its screen unmounted still publishes for whoever is mounted next.
 *
 * Each write publishes a new immutable snapshot so React (and React Compiler)
 * see a changed reference. Failed downloads are not cached, so a later
 * `ensureAvatarDataUris` call retries them.
 */

/** Remote URL → resolved `data:` URI. */
export type AvatarDataUriSnapshot = Readonly<Record<string, string>>;

const EMPTY_SNAPSHOT: AvatarDataUriSnapshot = Object.freeze({});

let snapshot: AvatarDataUriSnapshot = EMPTY_SNAPSHOT;
/** URLs with a download in progress, so concurrent mounts don't refetch. */
const inflight = new Set<string>();
const listeners = new Set<() => void>();
/** Bumped by `clearAvatarDataUris` so stale in-flight results are dropped. */
let generation = 0;

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const subscribeAvatarDataUris = (
  onStoreChange: () => void,
): (() => void) => {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

export const getAvatarDataUrisSnapshot = (): AvatarDataUriSnapshot => snapshot;

const fetchAsDataUri = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (): void =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = (): void => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Network/decoding failure: not cached, so the overlay shows initials and
    // a later ensureAvatarDataUris call retries.
    return null;
  }
};

/**
 * Starts downloads for URLs that are neither cached nor in flight. Idempotent,
 * so it is safe to call on every mount / URL-set change.
 */
const resolveOne = async (url: string): Promise<void> => {
  const startedIn = generation;
  inflight.add(url);
  const dataUri = await fetchAsDataUri(url);
  if (startedIn !== generation) return; // store was cleared meanwhile
  inflight.delete(url);
  if (!dataUri) return;
  snapshot = { ...snapshot, [url]: dataUri };
  emit();
};

export const ensureAvatarDataUris = (urls: readonly string[]): void => {
  for (const url of urls) {
    if (snapshot[url] || inflight.has(url)) continue;
    resolveOne(url);
  }
};

/** Re-renders whenever a new avatar resolves; returns the full snapshot. */
export const useAvatarDataUris = (): AvatarDataUriSnapshot =>
  useSyncExternalStore(
    subscribeAvatarDataUris,
    getAvatarDataUrisSnapshot,
    getAvatarDataUrisSnapshot,
  );

/** Resets the store. Unit tests call this so cases don't leak. */
export const clearAvatarDataUris = (): void => {
  generation += 1;
  inflight.clear();
  if (snapshot === EMPTY_SNAPSHOT) return;
  snapshot = EMPTY_SNAPSHOT;
  emit();
};
