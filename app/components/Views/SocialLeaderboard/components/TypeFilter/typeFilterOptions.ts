import type { SocialTypeFilter } from './types';

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
