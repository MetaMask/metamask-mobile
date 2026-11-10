import { useEffect, useMemo, useState } from 'react';
import { usePredictImplementation } from '../implementation';
import { useLegacyPredictSearchResults } from './internal/legacy/useLegacyPredictSearchResults';
import {
  NO_VENUE,
  useNextPredictSearchResults,
} from './internal/next/useNextPredictSearchResults';
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
 * with the same ranking and query key, so it shares Explore's cache. A next
 * Venue searches with `useSearchEvents` when its descriptor supports search,
 * keyed by the Venue, so a Venue change drops the old Venue's results on the
 * same render and a late answer never reaches the new one. Without search
 * support, and while the Active Venue resolves, there are no results and
 * nothing loads, not even while typing: the caller leaves its Predictions
 * section out. An empty query has no results.
 */
export const usePredictSearchResults = (
  query: string,
): PredictSearchResults => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const nextVenueId =
    resolution.status === 'ready' && resolution.implementation === 'next'
      ? resolution.venueId
      : NO_VENUE;

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
  const next = useNextPredictSearchResults({
    venueId: nextVenueId,
    query: debouncedQuery,
  });

  return useMemo(() => {
    let source: PredictSearchResults;
    if (isLegacy) source = legacy;
    else if (next.isSupported)
      source = { results: next.results, isLoading: next.isLoading };
    else return NO_RESULTS;
    if (!hasQuery) return isDebouncing ? DEBOUNCING_NO_RESULTS : NO_RESULTS;
    return isDebouncing ? { results: source.results, isLoading: true } : source;
  }, [hasQuery, isDebouncing, isLegacy, legacy, next]);
};
