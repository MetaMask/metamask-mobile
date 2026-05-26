import { strings } from '../../../../../locales/i18n';
import type { SearchFeedId } from './useExploreSearch';

export const MAX_ITEMS_PER_SECTION = 3;

/** Feeds whose result set is fully loaded client-side; count-based "View X more" is exact. */
export const LOCAL_SEARCH_FEEDS: ReadonlySet<SearchFeedId> = new Set([
  'perps',
  'stocks',
  'sites',
]);

/**
 * Label for the section header "View all / View X more" button.
 *
 * @param visibleCount - items loaded in the section (may exceed MAX_ITEMS_PER_SECTION)
 * @param serverTotal  - server-reported total for feeds that expose it (tokens, predictions)
 */
export function getViewMoreLabel(
  feedId: SearchFeedId,
  visibleCount: number,
  searchQuery: string,
  serverTotal?: number,
): string {
  if (!searchQuery.trim()) {
    return strings('trending.view_all');
  }

  if (serverTotal !== undefined) {
    const hidden = serverTotal - Math.min(visibleCount, MAX_ITEMS_PER_SECTION);
    return hidden > 0
      ? strings('trending.view_x_more', { count: hidden })
      : strings('trending.view_all');
  }

  if (LOCAL_SEARCH_FEEDS.has(feedId)) {
    const hidden = visibleCount - MAX_ITEMS_PER_SECTION;
    if (hidden > 0) {
      return strings('trending.view_x_more', { count: hidden });
    }
  }

  return strings('trending.view_all');
}
