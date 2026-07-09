import { useMemo } from 'react';
import { getMockTraderFeed } from '../mocks/traderFeed.mock';
import type { FeedAudience, FeedItem, FeedSection } from '../types';
import { formatFeedDateLabel } from '../utils/formatFeedTimestamp';

export interface UseTraderFeedOptions {
  /**
   * Audience filter. When `following` the mock returns no items so the UI can
   * exercise the empty state (the user follows nobody in mock mode).
   */
  audience?: FeedAudience;
}

export interface UseTraderFeedResult {
  /** Feed items grouped by calendar day, newest first. */
  sections: FeedSection[];
  /** Flat list of items (ungrouped), newest first. */
  items: FeedItem[];
  isLoading: boolean;
}

/** Groups feed items into day sections, newest day first. */
const groupByDay = (items: FeedItem[]): FeedSection[] => {
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
  const sections: FeedSection[] = [];

  sorted.forEach((item) => {
    const dateLabel = formatFeedDateLabel(item.timestamp);
    const last = sections[sections.length - 1];
    if (last && last.dateLabel === dateLabel) {
      last.data.push(item);
    } else {
      sections.push({ dateLabel, data: [item] });
    }
  });

  return sections;
};

/**
 * Trader activity feed data source.
 *
 * TODO: swap the mock adapter for the Core `SocialService:fetchFeed` React
 * Query hook once the API lands. The presentation components consume only
 * `sections` / `items` / `isLoading`, so the swap is isolated to this hook.
 */
export const useTraderFeed = (
  options: UseTraderFeedOptions = {},
): UseTraderFeedResult => {
  const { audience = 'all' } = options;

  return useMemo(() => {
    // Mock mode: the user follows nobody, so `following` is intentionally empty
    // to surface the empty state.
    const items = audience === 'following' ? [] : getMockTraderFeed();
    return {
      items,
      sections: groupByDay(items),
      isLoading: false,
    };
  }, [audience]);
};
