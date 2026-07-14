import type { FeedTypeFilter } from '../types';

export const FEED_TYPE_OPTIONS: FeedTypeFilter[] = ['all', 'tokens', 'perps'];

export const FEED_TYPE_LABEL_KEY: Record<FeedTypeFilter, string> = {
  all: 'social_leaderboard.feed.type_filter.all',
  tokens: 'social_leaderboard.feed.type_filter.tokens',
  perps: 'social_leaderboard.feed.type_filter.perps',
};
