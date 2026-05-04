import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { prefixUrlWithProtocol } from '../../../../../util/browser';
import { selectBrowserBookmarksWithType } from '../../../../../selectors/browser';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';
import {
  extractDisplayUrl,
  matchesSiteQuery,
} from '../useSiteData/useSitesData';

interface BookmarkEntry {
  url: string;
  name: string;
}

const toSiteData = (entry: BookmarkEntry, index: number): SiteData => {
  const url = prefixUrlWithProtocol(entry.url.trim());
  return {
    id: `browser-favorite-${url}-${index}`,
    name: entry.name?.trim() || extractDisplayUrl(url),
    url,
    displayUrl: extractDisplayUrl(url),
    storedBookmarkUrl: entry.url,
  };
};

/**
 * Bookmarked (favorited) browser sites, mapped to {@link SiteData} for Explore/Dapps UI.
 * Accepts an optional searchQuery for client-side filtering.
 * Data is Redux-driven and requires no remote fetch.
 */
export const useBrowserFavoritesSites = (
  searchQuery?: string,
): {
  data: SiteData[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} => {
  const bookmarks = useSelector(
    selectBrowserBookmarksWithType,
  ) as BookmarkEntry[];

  const data = useMemo(() => {
    const all = bookmarks.filter((b) => b?.url).map((b, i) => toSiteData(b, i));
    const query = searchQuery?.trim() ?? '';
    return query ? all.filter((s) => matchesSiteQuery(s, query)) : all;
  }, [bookmarks, searchQuery]);

  return {
    data,
    isLoading: false,
    refetch: async () => {
      // Bookmarks are Redux-driven; no remote refetch.
    },
  };
};
