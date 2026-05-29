import {
  useExploreSearch,
  type ExploreSearchResult,
  type SearchFeedId,
  type SearchFeedSection,
} from './useExploreSearch';

/**
 * Explore search uses pagination on tokens/predictions.
 */
export const useExploreSearchV2 = (query: string): ExploreSearchResult =>
  useExploreSearch(query, {
    exposePagination: true,
  });

export type { SearchFeedId, SearchFeedSection, ExploreSearchResult };
