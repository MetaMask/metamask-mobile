import { useEffect, useMemo, useState } from 'react';
import Logger from '../../../../util/Logger';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';

/**
 * Resolves each marker's remote `avatarUrl` to a `data:` URI on the RN side so
 * the WebView never fetches a remote host directly. This keeps the chart
 * WebView CSP tight (`img-src 'self' data:` — no external avatar host needed)
 * and lets avatars load even when the WebView itself can't reach the CDN.
 *
 * Fetched blobs are cached module-wide by URL (avatars repeat across a trader's
 * trades and across tokens), so each unique image is downloaded at most once
 * per session. While a URL is still resolving — or if it fails — the marker's
 * `avatarUrl` is cleared so the overlay shows the initials fallback until (and
 * unless) the data URI arrives.
 */

/** Session cache: remote URL → resolved `data:` URI. */
const dataUriCache = new Map<string, string>();

/** Map of remote URL → resolved `data:` URI. */
type ResolvedMap = Record<string, string>;

const isHttpUrl = (url: string | undefined): url is string =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

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
  } catch (error) {
    Logger.log('[social-markers] avatar fetch failed', url, error);
    return null;
  }
};

export const useResolvedAvatarMarkers = (
  markers: AvatarMarker[],
): AvatarMarker[] => {
  // Resolved data URIs held in state so the mapping memo below recomputes when
  // new avatars land. The module cache is the cross-mount source of truth; this
  // state mirrors it to trigger re-renders.
  const [resolved, setResolved] = useState<ResolvedMap>({});

  const remoteUrls = useMemo(
    () =>
      Array.from(new Set(markers.map((m) => m.avatarUrl).filter(isHttpUrl))),
    [markers],
  );

  useEffect(() => {
    let cancelled = false;
    const pending = remoteUrls.filter((url) => !dataUriCache.has(url));
    if (pending.length === 0) return undefined;

    Promise.all(
      pending.map(async (url): Promise<void> => {
        const dataUri = await fetchAsDataUri(url);
        if (dataUri) dataUriCache.set(url, dataUri);
      }),
    ).then((): void => {
      if (cancelled) return;
      // Snapshot the cache into state so the mapping memo recomputes.
      setResolved((prev): ResolvedMap => {
        const next: ResolvedMap = { ...prev };
        for (const url of remoteUrls) {
          const dataUri = dataUriCache.get(url);
          if (dataUri) next[url] = dataUri;
        }
        return next;
      });
    });

    return (): void => {
      cancelled = true;
    };
  }, [remoteUrls]);

  return useMemo(
    () =>
      markers.map((marker) => {
        if (!isHttpUrl(marker.avatarUrl)) return marker;
        const dataUri = resolved[marker.avatarUrl];
        // Clear the URL until resolved so the WebView shows initials (and never
        // fetches the remote host itself); swap in the data URI once ready.
        return { ...marker, avatarUrl: dataUri };
      }),
    [markers, resolved],
  );
};

export default useResolvedAvatarMarkers;
