import { useBrowserRecentsSites } from '../../../../UI/Sites/hooks/useBrowserRecentsSites/useBrowserRecentsSites';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';

interface UseRecentsFeedOptions {
  refresh?: RefreshConfig;
}

export interface UseRecentsFeedResult {
  data: SiteData[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/** Most-recent unique browser-history entries as `SiteData` tiles. */
export const useRecentsFeed = ({
  refresh,
}: UseRecentsFeedOptions = {}): UseRecentsFeedResult => {
  const { data, isLoading, refetch } = useBrowserRecentsSites();
  useFeedRefresh(refresh, refetch);
  return { data, isLoading, refetch };
};
