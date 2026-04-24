import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectBrowserHistory } from '../../../../../reducers/browser/selectors';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';
import { extractDisplayUrl } from '../useSiteData/useSitesData';

const MAX_RECENT_SITES = 5;

interface HistoryEntry {
  url: string;
  name: string;
}

const normalizeUrlKey = (raw: string): string => {
  try {
    const trimmed = raw.trim();
    const withProtocol =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const u = new URL(withProtocol);
    u.hash = '';
    const path = u.pathname.replace(/\/$/, '') || '/';
    return `${u.origin}${path}`;
  } catch {
    return raw;
  }
};

const toSiteData = (entry: HistoryEntry, index: number): SiteData => {
  const trimmed = entry.url.trim();
  const url =
    trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

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
  const history = useSelector(selectBrowserHistory) as HistoryEntry[];

  const data = useMemo(() => {
    const seen = new Set<string>();
    const out: SiteData[] = [];

    for (
      let i = history.length - 1;
      i >= 0 && out.length < MAX_RECENT_SITES;
      i--
    ) {
      const entry = history[i];
      if (!entry?.url) {
        continue;
      }
      const key = normalizeUrlKey(entry.url);
      if (seen.has(key)) {
        continue;
      }
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
