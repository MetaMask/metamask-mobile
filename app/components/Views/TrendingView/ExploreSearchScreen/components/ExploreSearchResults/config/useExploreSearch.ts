import { useState, useEffect, useMemo } from 'react';
import {
  SEARCH_SECTION_ARRAY,
  type SectionId,
  type SectionData,
} from './exploreSearchConfig';
import { usePerpsMarkets } from '../../../../../../UI/Perps/hooks/usePerpsMarkets';
import { usePredictMarketData } from '../../../../../../UI/Predict/hooks/usePredictMarketData';
import { useTrendingRequest } from '../../../../../../UI/Assets/hooks/useTrendingRequest';

export interface ExploreSearchResult {
  data: Record<SectionId, unknown[]>;
  isLoading: Record<SectionId, boolean>;
}

/**
 * Internal hook to fetch data from all sections.
 * When adding a new section, add the hook call here.
 */
const useExploreSearchData = (
  debouncedQuery: string,
): Record<SectionId, SectionData> => {
  const { results: trendingTokens, isLoading: isTokensLoading } =
    useTrendingRequest({});

  const { markets: perpsMarkets, isLoading: isPerpsLoading } =
    usePerpsMarkets();

  const { marketData: predictionMarkets, isFetching: isPredictionsLoading } =
    usePredictMarketData({
      category: 'trending',
      q: debouncedQuery || undefined,
      pageSize: debouncedQuery ? 20 : 3,
    });

  return {
    tokens: {
      data: trendingTokens,
      isLoading: isTokensLoading,
    },
    perps: {
      data: perpsMarkets,
      isLoading: isPerpsLoading,
    },
    predictions: {
      data: predictionMarkets,
      isLoading: isPredictionsLoading,
    },
  };
};

/**
 * GENERIC EXPLORE SEARCH HOOK
 *
 * This hook is completely generic and processes data from any sections
 * defined in exploreSearchConfig.tsx. It handles:
 * - Debouncing the search query
 * - Filtering results based on section configurations
 * - Returning top 3 items when no query is present
 *
 * TO ADD A NEW SECTION:
 * 1. Add section configuration to exploreSearchConfig.tsx
 * 2. Add hook call to useEploreSearchData above
 *
 * @param query - Search query string
 * @returns Search results grouped by section
 */
export const useExploreSearch = (query: string): ExploreSearchResult => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const allSectionsData = useExploreSearchData(debouncedQuery);

  const filteredResults = useMemo(() => {
    const isLoading: Record<SectionId, boolean> = {} as Record<
      SectionId,
      boolean
    >;
    const data: Record<SectionId, unknown[]> = {} as Record<
      SectionId,
      unknown[]
    >;

    const shouldShowTopItems = !debouncedQuery.trim();
    const searchTerm = debouncedQuery.toLowerCase();

    // Process each section generically
    SEARCH_SECTION_ARRAY.forEach((section) => {
      const sectionData = allSectionsData[section.id];
      isLoading[section.id] = sectionData.isLoading;

      if (shouldShowTopItems) {
        // Show top 3 items when no search query
        data[section.id] = sectionData.data.slice(0, 3);
      } else {
        // Filter items based on section's searchable text
        data[section.id] = sectionData.data.filter((item) =>
          section.getSearchableText(item as never).includes(searchTerm),
        );
      }
    });

    return { data, isLoading };
  }, [debouncedQuery, allSectionsData]);

  return filteredResults;
};
