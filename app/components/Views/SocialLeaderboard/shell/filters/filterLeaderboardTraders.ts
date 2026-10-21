import { matchesShellFollowing } from './matchShellFilters';
import type { SocialShellFilters } from './types';

interface LeaderboardFollowingTrader {
  isFollowing: boolean;
}

/**
 * Client-side Leaderboard following filter on the loaded page. Type and
 * timeframe already drive `useTopTraders`.
 */
export const filterLeaderboardTraders = <T extends LeaderboardFollowingTrader>(
  traders: readonly T[],
  filters: SocialShellFilters,
): T[] =>
  traders.filter((trader) =>
    matchesShellFollowing({
      following: filters.following,
      isFollowing: trader.isFollowing,
    }),
  );
