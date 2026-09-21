import type {
  LeaderboardSort,
  SocialTimeframe,
  SocialTypeFilter,
} from './types';

export const TYPE_FILTER_OPTIONS: SocialTypeFilter[] = [
  'all',
  'tokens',
  'perps',
];

export const TYPE_FILTER_LABEL_KEY: Record<SocialTypeFilter, string> = {
  all: 'social_leaderboard.type_filter.all',
  tokens: 'social_leaderboard.type_filter.tokens',
  perps: 'social_leaderboard.type_filter.perps',
};

export const TIMEFRAME_OPTIONS: SocialTimeframe[] = ['7d', '30d'];

export const TIMEFRAME_LABEL_KEY: Record<SocialTimeframe, string> = {
  '7d': 'social_leaderboard.timeframe_filter.7d',
  '30d': 'social_leaderboard.timeframe_filter.30d',
};

/**
 * Ranking metrics offered in the leaderboard's Sort by sheet. `tradeCount` is
 * intentionally absent — the API reports it, but the product hasn't shipped it
 * as a ranking option yet.
 */
export const LEADERBOARD_SORT_OPTIONS: LeaderboardSort[] = [
  'pnl',
  'roi',
  'winRate',
];

export const LEADERBOARD_SORT_LABEL_KEY: Record<LeaderboardSort, string> = {
  pnl: 'social_leaderboard.sort_filter.pnl',
  roi: 'social_leaderboard.sort_filter.roi',
  winRate: 'social_leaderboard.sort_filter.win_rate',
};

/**
 * Social V1 ranking chip. Profit maps to the existing `pnl` API sort.
 * Volume is UI-only until the leaderboard endpoint accepts it.
 */
export type V1LeaderboardRanking = 'pnl' | 'volume';

export const V1_LEADERBOARD_RANKING_OPTIONS: V1LeaderboardRanking[] = [
  'pnl',
  'volume',
];

export const V1_LEADERBOARD_RANKING_LABEL_KEY: Record<
  V1LeaderboardRanking,
  string
> = {
  pnl: 'social_leaderboard.sort_filter.profit',
  volume: 'social_leaderboard.sort_filter.volume',
};

export const DEFAULT_V1_LEADERBOARD_RANKING: V1LeaderboardRanking = 'pnl';

/**
 * Leaderboard trader-cohort chip. `following` stays on the Live trades sheet.
 */
export type LeaderboardTraderCohort =
  | 'all'
  | 'shrimp'
  | 'dolphin'
  | 'whale'
  | 'kol';

export const LEADERBOARD_COHORT_OPTIONS: LeaderboardTraderCohort[] = [
  'all',
  'shrimp',
  'dolphin',
  'whale',
  'kol',
];

export const LEADERBOARD_COHORT_LABEL_KEY: Record<
  LeaderboardTraderCohort,
  string
> = {
  all: 'social_leaderboard.shell.filters.trader_cohort.all',
  shrimp: 'social_leaderboard.shell.filters.trader_cohort.shrimp',
  dolphin: 'social_leaderboard.shell.filters.trader_cohort.dolphin',
  whale: 'social_leaderboard.shell.filters.trader_cohort.whale',
  kol: 'social_leaderboard.shell.filters.trader_cohort.kol',
};

export const DEFAULT_LEADERBOARD_COHORT: LeaderboardTraderCohort = 'all';

/** Emoji prefixes for cohort rows in the Trader cohort sheet (Leaderboard). */
export const LEADERBOARD_COHORT_LEADING_EMOJI: Partial<
  Record<LeaderboardTraderCohort, string>
> = {
  shrimp: '🦐',
  dolphin: '🐬',
  whale: '🐳',
};

export {
  DEFAULT_LEADERBOARD_SORT,
  DEFAULT_TIMEFRAME,
} from '../../../shared/top-traders-constants';
