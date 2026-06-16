import { useBrowserFavoritesSites } from '../../../../UI/Sites/hooks/useBrowserFavoritesSites/useBrowserFavoritesSites';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';

interface UseFavoritesFeedOptions {
  query?: string;
  refresh?: RefreshConfig;
}

export interface UseFavoritesFeedResult {
  data: SiteData[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/** Bookmarked browser sites mapped to `SiteData`. */
export const useFavoritesFeed = ({
  query,
  refresh,
}: UseFavoritesFeedOptions = {}): UseFavoritesFeedResult => {
  const { data, isLoading, refetch } = useBrowserFavoritesSites(query);
  useFeedRefresh(refresh, refetch);
  return { data, isLoading, refetch };
};
