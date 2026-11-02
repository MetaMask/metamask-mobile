import { useMemo } from 'react';
import {
  DEFAULT_SOCIAL_LEADERBOARD_FILTERS,
  toLeaderboardSort,
  useSocialLeaderboard,
  type RankedTrader,
  type SocialLeaderboardSource,
  type UseSocialLeaderboardOptions,
} from '../../SocialLeaderboard';

const PERPS_LEADERBOARD_SOURCE: SocialLeaderboardSource = {
  kind: 'all',
  assetClass: 'perps',
};

export interface UsePerpsTopTradersOptions {
  timeframe?: UseSocialLeaderboardOptions['timeframe'];
  sort?: UseSocialLeaderboardOptions['sort'];
  limit?: number;
}

export interface UsePerpsTopTradersResult {
  traders: RankedTrader[];
  showSkeleton: boolean;
  showError: boolean;
  refresh: () => Promise<void>;
}

export const usePerpsTopTraders = ({
  timeframe = DEFAULT_SOCIAL_LEADERBOARD_FILTERS.timeframe,
  sort = toLeaderboardSort(DEFAULT_SOCIAL_LEADERBOARD_FILTERS.ranking),
  limit,
}: UsePerpsTopTradersOptions = {}): UsePerpsTopTradersResult => {
  const {
    traders: rankedTraders,
    isFetching,
    error,
    refresh,
  } = useSocialLeaderboard(PERPS_LEADERBOARD_SOURCE, { timeframe, sort });

  const traders = useMemo(
    () => (limit === undefined ? rankedTraders : rankedTraders.slice(0, limit)),
    [limit, rankedTraders],
  );

  const hasTraders = traders.length > 0;
  const showError = Boolean(error) && !isFetching && !hasTraders;

  return {
    traders,
    showSkeleton: isFetching && !hasTraders,
    showError,
    refresh,
  };
};
