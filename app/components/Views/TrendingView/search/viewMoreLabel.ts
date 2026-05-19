import { strings } from '../../../../../locales/i18n';
import type { SearchFeedId } from './useExploreSearch';

export const MAX_ITEMS_PER_SECTION = 3;

/**
 * Feeds whose full result set is available client-side, enabling an exact
 * "View X more" count. Predictions is included but uses `hasMore` as a
 * fallback when the loaded page has ≤ MAX_ITEMS_PER_SECTION results.
 */
export const LOCAL_SEARCH_FEEDS: ReadonlySet<SearchFeedId> = new Set([
  'perps',
  'stocks',
  'sites',
  'predictions',
]);

/**
 * Returns the label for the "View all / View X more / View more" button in a
 * search section header.
 *
 * Local-search feeds (perps, stocks, sites, predictions) show an exact count
 * when the active query produces more than MAX_ITEMS_PER_SECTION hits.
 * For predictions, falls back to "View more" when the server signals there are
 * additional pages (hasMore) but the loaded slice fits in the preview.
 * Remote-search feeds (tokens) and the no-query state always show "View all".
 */
export function getViewMoreLabel(
  feedId: SearchFeedId,
  totalItems: number,
  searchQuery: string,
  hasMore?: boolean,
): string {
  if (LOCAL_SEARCH_FEEDS.has(feedId) && searchQuery.trim()) {
    const extra = totalItems - MAX_ITEMS_PER_SECTION;
    if (extra > 0) {
      return strings('trending.view_x_more', { count: extra });
    }
    // Predictions: loaded page fits within the preview but server has more pages
    if (hasMore) {
      return strings('trending.view_more');
    }
  }
  return strings('trending.view_all');
}
