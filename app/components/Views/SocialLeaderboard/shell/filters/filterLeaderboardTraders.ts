import { matchesShellTraderCohort } from './matchShellFilters';
import type { SocialShellFilters } from './types';

interface LeaderboardCohortTrader {
  isFollowing: boolean;
  pnl30d?: number | null;
}

/**
 * Client-side Leaderboard cohort filter on the loaded page. Type and
 * timeframe already drive `useTopTraders`. Verified is a no-op leftover —
 * that chip is hidden until a real verified field exists.
 */
export const filterLeaderboardTraders = <T extends LeaderboardCohortTrader>(
  traders: readonly T[],
  filters: SocialShellFilters,
): T[] =>
  traders.filter((trader) =>
    matchesShellTraderCohort({
      traderCohort: filters.traderCohort,
      pnl30d: trader.pnl30d,
      isFollowing: trader.isFollowing,
    }),
  );
