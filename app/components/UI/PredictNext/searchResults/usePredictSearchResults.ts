import { useEffect, useMemo, useState } from 'react';
import { usePredictImplementation } from '../implementation';
import { useLegacyPredictSearchResults } from './internal/legacy/useLegacyPredictSearchResults';
import type { PredictSearchResults } from './types';

/** Matches Explore search, so both surfaces send a query at the same time. */
export const PREDICT_SEARCH_DEBOUNCE_MS = 200;

const NO_RESULTS: PredictSearchResults = { results: [], isLoading: false };
const DEBOUNCING_NO_RESULTS: PredictSearchResults = {
  results: [],
  isLoading: true,
};

/**
 * Predict's results for a search query, for Browser URL autocomplete. The
 * query is debounced, and the results stay loading while it debounces.
 *
 * The legacy branch is the Polymarket search Browser used before PRED-1386,
 * with the same ranking and query key, so it shares Explore's cache. While the
 * Active Venue resolves, and for next Venues until PRED-1409, there are no
 * results and nothing loads: the caller leaves its Predictions section out.
 * An empty query has no results.
 */
export const usePredictSearchResults = (
  query: string,
): PredictSearchResults => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query),
      PREDICT_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);
  const isDebouncing = query !== debouncedQuery;
  const hasQuery = debouncedQuery.trim().length > 0;

  const legacy = useLegacyPredictSearchResults({
    query: debouncedQuery,
    enabled: isLegacy && hasQuery,
  });

  return useMemo(() => {
    if (!isLegacy) return NO_RESULTS;
    if (!hasQuery) return isDebouncing ? DEBOUNCING_NO_RESULTS : NO_RESULTS;
    return isDebouncing ? { results: legacy.results, isLoading: true } : legacy;
  }, [hasQuery, isDebouncing, isLegacy, legacy]);
};
