import { UrlAutocompleteCategory } from './types';
import type { SearchFeedId } from '../../Views/TrendingView/search/useExploreSearch';

export const MAX_RECENTS = 5;

/**
 * Fuse.js options for filtering browser history and bookmarks
 * Note: Project uses fuse.js v3.4.4 which has different API than v4+
 */
export const HISTORY_FUSE_OPTIONS = {
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'url', weight: 0.5 },
  ],
};

/**
 * Categories for empty state (no search query)
 * Shows Recents and Favorites only
 */
export const EMPTY_STATE_CATEGORIES = [
  UrlAutocompleteCategory.Recents,
  UrlAutocompleteCategory.Favorites,
];

/**
 * @deprecated Use EMPTY_STATE_CATEGORIES for empty state.
 * Search is now handled by useExploreSearch with BROWSER_SEARCH_FEEDS_ORDER.
 */
export const ORDERED_CATEGORIES = [
  UrlAutocompleteCategory.Recents,
  UrlAutocompleteCategory.Favorites,
  UrlAutocompleteCategory.Sites,
];

/**
 * Feed order for browser search (Sites first, then other omni-search feeds).
 * Used to reorder the result of `useExploreSearch` so Sites appears before
 * tokens / perps / predictions in the URL autocomplete.
 */
export const BROWSER_SEARCH_FEEDS_ORDER: SearchFeedId[] = [
  'sites',
  'tokens',
  'perps',
  'predictions',
];
