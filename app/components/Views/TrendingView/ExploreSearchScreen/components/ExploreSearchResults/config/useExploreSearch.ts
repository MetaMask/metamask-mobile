import { useState, useEffect, useMemo } from 'react';
import {
  SECTIONS_ARRAY,
  useSectionsData,
  type SectionId,
} from '../../../../config/sections.config';

export interface ExploreSearchResult {
  data: Record<SectionId, unknown[]>;
  isLoading: Record<SectionId, boolean>;
}

/**
 * GENERIC EXPLORE SEARCH HOOK
 *
 * This hook is completely generic and processes data from any sections
 * defined in sections.config.tsx. It handles:
 * - Debouncing the search query
 * - Filtering results based on section configurations
 * - Returning top 3 items when no query is present
 *
 * TO ADD A NEW SECTION:
 * Edit sections.config.tsx only - this file requires no changes!
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

  // Fetch data for all sections using centralized hook
  const allSectionsData = useSectionsData(debouncedQuery);

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
    SECTIONS_ARRAY.forEach((section) => {
      const sectionData = allSectionsData[section.id];
      isLoading[section.id] = sectionData.isLoading;

      if (shouldShowTopItems) {
        // Show top 3 items when no search query
        data[section.id] = sectionData.data.slice(0, 3);
      } else {
        // Filter items based on section's searchable text
        data[section.id] = sectionData.data.filter((item) =>
          section.getSearchableText(item).includes(searchTerm),
        );
      }
    });

    return { data, isLoading };
  }, [debouncedQuery, allSectionsData]);

  return filteredResults;
};
