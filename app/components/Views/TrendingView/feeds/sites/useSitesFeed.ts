import { useSitesData } from '../../../../UI/Sites/hooks/useSiteData/useSitesData';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';

interface UseSitesFeedOptions {
  query?: string;
  refresh?: RefreshConfig;
}

export interface UseSitesFeedResult {
  data: SiteData[];
  isLoading: boolean;
  refetch: () => void;
}

/** Curated sites feed (Explore "Sites" section + search). */
export const useSitesFeed = ({
  query,
  refresh,
}: UseSitesFeedOptions = {}): UseSitesFeedResult => {
  const { sites, isLoading, refetch } = useSitesData(query);
  useFeedRefresh(refresh, refetch);
  return { data: sites, isLoading, refetch };
};
