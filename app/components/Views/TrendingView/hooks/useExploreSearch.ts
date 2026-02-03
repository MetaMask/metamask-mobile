import { useState, useEffect, useMemo } from 'react';
import {
  useSectionsArray,
  useSectionsData,
  type SectionId,
} from '../sections.config';

export interface ExploreSearchResult {
  data: Record<SectionId, unknown[]>;
  isLoading: Record<SectionId, boolean>;
  sectionsOrder: SectionId[];
}

export interface ExploreSearchOptions {
  /**
   * Custom order of sections for display.
   * Defaults to useSectionsArray order (tokens, perps, predictions, sites).
   * Browser uses ['sites', 'tokens', 'perps', 'predictions'] to show Sites first.
   */
  sectionsOrder?: SectionId[];
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
 * @param query - Search query string
 * @param options - Optional configuration including custom section order
 * @returns Search results grouped by section
 */
export const useExploreSearch = (
  query: string,
  options?: ExploreSearchOptions,
): ExploreSearchResult => {
  const sections = useSectionsArray();
  const sectionsOrder = useMemo(() => {
    const baseOrder = options?.sectionsOrder ?? sections.map((s) => s.id);
    const availableSectionIds = new Set(sections.map((s) => s.id));
    return baseOrder.filter((sectionId) => availableSectionIds.has(sectionId));
  }, [options?.sectionsOrder, sections]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch data for all sections using centralized hook
  const allSectionsData = useSectionsData(debouncedQuery);

  // Check if query is still debouncing (query changed but debounce hasn't completed)
  const isDebouncing = query !== debouncedQuery;

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

    // Process each section generically
    sections.forEach((section) => {
      const sectionData = allSectionsData[section.id];
      // If we're debouncing, show loading state immediately
      // Otherwise, use the actual loading state from the data fetch
      isLoading[section.id] = isDebouncing || sectionData.isLoading;

      if (shouldShowTopItems) {
        // Show top 3 items when no search query
        data[section.id] = sectionData.data.slice(0, 3);
      } else {
        // Filter items based on section's searchable text
        data[section.id] = sectionData.data;
      }
    });

    return { data, isLoading, sectionsOrder };
  }, [debouncedQuery, allSectionsData, isDebouncing, sections, sectionsOrder]);

  return filteredResults;
};
