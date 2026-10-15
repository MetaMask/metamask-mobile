import type {
  TopTrader,
  TraderRowMetric,
} from '../../Views/Homepage/Sections/TopTraders/types';
import type {
  LeaderboardSort,
  SocialTimeframe,
  V1LeaderboardRanking,
} from '../../Views/SocialLeaderboard/components/Filters';
import type { SocialTraderCohort } from '../../Views/SocialLeaderboard/shell/filters/types';

/**
 * A ranked trader with its display metric precomputed, so the value stays
 * stable across renders and the memoised row can skip unchanged traders.
 */
export type RankedTrader = TopTrader & { displayMetric: TraderRowMetric };

/** Ranking options the host controls. The component renders no filter UI. */
export interface SocialLeaderboardFilters {
  /** Window the PnL, ROI and win rate come from. */
  timeframe: SocialTimeframe;
  /** What the list is ordered by. */
  ranking: V1LeaderboardRanking;
  /** Client-side cohort filter over the loaded page. */
  cohort: SocialTraderCohort;
}

export const DEFAULT_SOCIAL_LEADERBOARD_FILTERS: SocialLeaderboardFilters = {
  timeframe: '7d',
  ranking: 'pnl',
  cohort: 'all',
};

/**
 * The API sort a ranking maps to. The API cannot sort by volume and the
 * entries carry no volume, so Volume keeps the PnL order.
 */
export const toLeaderboardSort = (
  ranking: V1LeaderboardRanking,
): LeaderboardSort => (ranking === 'volume' ? 'pnl' : ranking);
