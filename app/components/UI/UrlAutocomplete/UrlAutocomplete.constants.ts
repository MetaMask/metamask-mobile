import { UrlAutocompleteCategory } from './types';
import type { SectionId } from '../../Views/TrendingView/sections.config';

export const MAX_RECENTS = 5;

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
 * Search is now handled by useExploreSearch with BROWSER_SEARCH_SECTIONS_ORDER.
 */
export const ORDERED_CATEGORIES = [
  UrlAutocompleteCategory.Recents,
  UrlAutocompleteCategory.Favorites,
  UrlAutocompleteCategory.Tokens,
  UrlAutocompleteCategory.Sites,
];

/**
 * Section order for browser search (Sites first, then other omni-search sections)
 * This order is passed to useExploreSearch to display Sites before tokens/perps/predictions
 */
export const BROWSER_SEARCH_SECTIONS_ORDER: SectionId[] = [
  'sites',
  'tokens',
  'perps',
  'predictions',
];
