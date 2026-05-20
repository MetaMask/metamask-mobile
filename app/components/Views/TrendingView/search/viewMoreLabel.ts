import { strings } from '../../../../../locales/i18n';
import type { SearchFeedId } from './useExploreSearch';

export const MAX_ITEMS_PER_SECTION = 3;

/**
 * Feeds whose full result set is available client-side, enabling an exact
 * "View X more" count based on the number of loaded items when no server
 * total is provided. Tokens and predictions supply a server `total` directly
 * and do not rely on this set.
 */
export const LOCAL_SEARCH_FEEDS: ReadonlySet<SearchFeedId> = new Set([
  'perps',
  'stocks',
  'sites',
]);

/**
 * Returns the label for the "View all / View X more / View more" button in a
 * search section header.
 *
 * Priority:
 * 1. No query → "View all".
 * 2. `total` provided (server-known count, e.g. tokens or predictions) → exact "View X more" or "View all".
 * 3. Local-search feeds (perps, stocks, sites) → client-side item count.
 * `hasMore` is a fallback "View more" signal used here; in V2 none of these feeds expose hasMore,
 * so this branch is only reachable via V1.
 * 4. Fallback → "View all".
 */
export function getViewMoreLabel(
  feedId: SearchFeedId,
  totalItems: number,
  searchQuery: string,
  hasMore?: boolean,
  total?: number,
): string {
  if (!searchQuery.trim()) {
    return strings('trending.view_all');
  }

  if (total !== undefined) {
    const extra = total - Math.min(totalItems, MAX_ITEMS_PER_SECTION);
    if (extra > 0) {
      return strings('trending.view_x_more', { count: extra });
    }
    return strings('trending.view_all');
  }

  if (LOCAL_SEARCH_FEEDS.has(feedId)) {
    const extra = totalItems - MAX_ITEMS_PER_SECTION;
    if (extra > 0) {
      return strings('trending.view_x_more', { count: extra });
    }
    if (hasMore) {
      return strings('trending.view_more');
    }
  }

  return strings('trending.view_all');
}
