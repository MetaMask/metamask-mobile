import { useState, useEffect, useMemo } from 'react';
import {
  useSearchSectionsArray,
  type SectionId,
  SectionData,
  SECTIONS_CONFIG,
} from '../sections.config';

export interface ExploreSearchResult {
  data: Record<SectionId, unknown[]>;
  isLoading: Record<SectionId, boolean>;
  sectionsOrder: SectionId[];
}

export interface ExploreSearchOptions {
  /**
   * Custom order of sections for display.
   * Defaults to `useSearchSectionsArray` (same as `DEFAULT_SEARCH_ORDER` in sections.config, with perps removed when perps is off).
   * The browser uses `['sites', 'tokens', 'perps', 'predictions']` to show Sites first.
   */
  sectionsOrder?: SectionId[];
}

type ExploreSearchSectionId =
  | 'tokens'
  | 'perps'
  | 'stocks'
  | 'predictions'
  | 'sites';

/**
 * Fetches data **only** for the Explore page omni-search. Matches `DEFAULT_SEARCH_ORDER` in sections.config
 * (tokens, perps, stocks, predictions, sites) and is not extended when new Explore tabs/sections are added.
 */
const useExploreSearchSectionsData = (
  searchQuery: string,
): Record<ExploreSearchSectionId, SectionData> => {
  const { data: trendingTokens, isLoading: isTokensLoading } =
    SECTIONS_CONFIG.tokens.useSectionData(searchQuery);

  const { data: perpsMarkets, isLoading: isPerpsLoading } =
    SECTIONS_CONFIG.perps.useSectionData(searchQuery);

  const { data: stocks, isLoading: isStocksLoading } =
    SECTIONS_CONFIG.stocks.useSectionData(searchQuery);

  const { data: predictionMarkets, isLoading: isPredictionsLoading } =
    SECTIONS_CONFIG.predictions.useSectionData(searchQuery);

  const { data: sites, isLoading: isSitesLoading } =
    SECTIONS_CONFIG.sites.useSectionData(searchQuery);

  return useMemo(
    () => ({
      tokens: { data: trendingTokens, isLoading: isTokensLoading },
      perps: { data: perpsMarkets, isLoading: isPerpsLoading },
      stocks: { data: stocks, isLoading: isStocksLoading },
      predictions: { data: predictionMarkets, isLoading: isPredictionsLoading },
      sites: { data: sites, isLoading: isSitesLoading },
    }),
    [
      trendingTokens,
      isTokensLoading,
      perpsMarkets,
      isPerpsLoading,
      stocks,
      isStocksLoading,
      predictionMarkets,
      isPredictionsLoading,
      sites,
      isSitesLoading,
    ],
  );
};

/**
 * GENERIC EXPLORE SEARCH HOOK
 *
 * Uses a fixed set of search sections (see `useExploreSearchSectionsData`) plus `useSearchSectionsArray` for order.
 * Handles:
 * - Debouncing the search query
 * - Returning top 3 items per section when no query is present
 */
export const useExploreSearch = (
  query: string,
  options?: ExploreSearchOptions,
): ExploreSearchResult => {
  const sectionsArray = useSearchSectionsArray();
  const sectionsOrder = useMemo(
    () => options?.sectionsOrder ?? sectionsArray.map((s) => s.id),
    [options?.sectionsOrder, sectionsArray],
  );
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const allSearchSectionsData = useExploreSearchSectionsData(debouncedQuery);

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

    sectionsArray.forEach((section) => {
      const sectionData =
        allSearchSectionsData[section.id as ExploreSearchSectionId];
      isLoading[section.id] = isDebouncing || sectionData.isLoading;

      if (shouldShowTopItems) {
        data[section.id] = sectionData.data.slice(0, 3);
      } else {
        data[section.id] = sectionData.data;
      }
    });

    return { data, isLoading, sectionsOrder };
  }, [
    debouncedQuery,
    allSearchSectionsData,
    isDebouncing,
    sectionsOrder,
    sectionsArray,
  ]);

  return filteredResults;
};
