import type { FeedItem } from '../../../UI/SocialFeed/types';

/**
 * Feed type filter. Alias of the shared {@link SocialTypeFilter} used across the
 * leaderboard and feed: everything, spot tokens, or perps. Applied client-side
 * over the loaded feed pages.
 */
export type { SocialTypeFilter as FeedTypeFilter } from '../components/Filters/types';

/** A day-grouped bucket of feed items, e.g. "July 1, 2026". */
export interface FeedSection {
  /** Formatted date label used as the section header. */
  dateLabel: string;
  data: FeedItem[];
}
