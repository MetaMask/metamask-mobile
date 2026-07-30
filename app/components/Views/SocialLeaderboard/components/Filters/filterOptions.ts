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

export {
  DEFAULT_LEADERBOARD_SORT,
  DEFAULT_TIMEFRAME,
} from '../../../shared/top-traders-constants';
