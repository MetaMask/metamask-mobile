import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { prefixUrlWithProtocol } from '../../../../../util/browser';
import { selectBrowserHistoryWithType } from '../../../../../selectors/browser';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';
import { extractDisplayUrl } from '../useSiteData/useSitesData';

const MAX_RECENT_SITES = 5;

interface HistoryEntry {
  url: string;
  name: string;
}

const normalizeUrlKey = (raw: string): string => {
  try {
    const u = new URL(prefixUrlWithProtocol(raw.trim()));
    u.hash = '';
    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${u.origin}${path}`;
  } catch {
    return raw;
  }
};

const toSiteData = (entry: HistoryEntry, index: number): SiteData => {
  const url = prefixUrlWithProtocol(entry.url.trim());
  return {
    id: `browser-recent-${normalizeUrlKey(url)}-${index}`,
    name: entry.name?.trim() || extractDisplayUrl(url),
    url,
    displayUrl: extractDisplayUrl(url),
  };
};

/**
 * Most recent unique browser history entries, mapped to {@link SiteData} for Explore/Dapps UI.
 * History is de-duplicated by normalized URL; latest visit wins.
 */
export const useBrowserRecentsSites = (): {
  data: SiteData[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} => {
  // selectBrowserHistoryWithType returns history already reversed (most recent first)
  const history = useSelector(selectBrowserHistoryWithType) as HistoryEntry[];

  const data = useMemo(() => {
    const seen = new Set<string>();
    const out: SiteData[] = [];

    for (const entry of history) {
      if (out.length >= MAX_RECENT_SITES) break;
      if (!entry?.url) continue;
      const key = normalizeUrlKey(entry.url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toSiteData(entry, out.length));
    }

    return out;
  }, [history]);

  return {
    data,
    isLoading: false,
    refetch: async () => {
      // History is driven by Redux; no remote refetch.
    },
  };
};
