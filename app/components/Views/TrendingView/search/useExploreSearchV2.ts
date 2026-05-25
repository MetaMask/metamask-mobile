import {
  useExploreSearch,
  type ExploreSearchResult,
  type SearchFeedId,
  type SearchFeedSection,
} from './useExploreSearch';

/**
 * Search V2: all results (no top-N cap), pagination on tokens/predictions,
 * search_tabs.* title keys.
 */
export const useExploreSearchV2 = (query: string): ExploreSearchResult =>
  useExploreSearch(query, {
    exposePagination: true,
    titleVariant: 'v2',
  });

export type { SearchFeedId, SearchFeedSection, ExploreSearchResult };
