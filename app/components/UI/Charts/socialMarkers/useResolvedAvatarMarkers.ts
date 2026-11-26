import { useEffect, useMemo } from 'react';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import { ensureAvatarDataUris, useAvatarDataUris } from './avatarDataUriStore';

/**
 * Resolves each marker's remote `avatarUrl` to a `data:` URI on the RN side so
 * the WebView never fetches a remote host directly. This keeps the chart
 * WebView CSP tight (`img-src 'self' data:` — no external avatar host needed)
 * and lets avatars load even when the WebView itself can't reach the CDN.
 *
 * Downloads and caching live in the session-wide `avatarDataUriStore`, which
 * this hook reads via `useSyncExternalStore`: a remounted TDP gets cached
 * avatars on its first render, and a download that outlives its screen still
 * lands for the next mount. Resolved images are returned once in an `avatars`
 * table keyed by URL (markers keep `avatarUrl` as the key), so hundreds of
 * markers from the same few traders don't each carry a copy of the data URI
 * over the bridge. While a URL is still resolving — or if it fails — it has no
 * table entry and the overlay shows the initials fallback.
 */

const isHttpUrl = (url: string | undefined): url is string =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

/** Markers (avatarUrl kept as a lookup key) + the url -> data URI table. */
export interface ResolvedAvatarMarkers {
  markers: AvatarMarker[];
  /** Only resolved entries; a missing key renders the initials fallback. */
  avatars: Record<string, string>;
}

export const useResolvedAvatarMarkers = (
  markers: AvatarMarker[],
): ResolvedAvatarMarkers => {
  const remoteUrls = useMemo(
    () =>
      Array.from(new Set(markers.map((m) => m.avatarUrl).filter(isHttpUrl))),
    [markers],
  );

  const cache = useAvatarDataUris();

  useEffect(() => {
    ensureAvatarDataUris(remoteUrls);
  }, [remoteUrls]);

  // Only URLs referenced by the current markers are sent to the WebView.
  const avatars = useMemo(() => {
    const table: Record<string, string> = {};
    for (const url of remoteUrls) {
      const dataUri = cache[url];
      if (dataUri) table[url] = dataUri;
    }
    return table;
  }, [remoteUrls, cache]);

  return useMemo(() => ({ markers, avatars }), [markers, avatars]);
};

export default useResolvedAvatarMarkers;
