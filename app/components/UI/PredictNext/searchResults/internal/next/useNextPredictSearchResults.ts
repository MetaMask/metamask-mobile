import { useMemo } from 'react';
import {
  isVenueSearchSupported,
  useVenueCapabilities,
} from '../../../capabilities';
import {
  SEARCH_QUERY_MAX_LENGTH,
  useSearchEvents,
} from '../../../hooks/useSearchEvents';
import type { PredictVenueId } from '../../../types';
import type { PredictSearchResult, PredictSearchResults } from '../../types';
import { toNextPredictSearchResult } from './toNextPredictSearchResult';

/** Stands in for the Venue while the next branch is inactive: nothing reads. */
export const NO_VENUE = '' as PredictVenueId;

const NO_RESULTS: readonly PredictSearchResult[] = [];

interface UseNextPredictSearchResultsOptions {
  /** The Active next Venue, or {@link NO_VENUE} while the branch is inactive. */
  venueId: PredictVenueId;
  /** The debounced query. */
  query: string;
}

export interface NextPredictSearchResults extends PredictSearchResults {
  /** Whether the Venue's descriptor supports search. Without it the caller
   * shows no Predictions section at all, not even while typing. */
  isSupported: boolean;
}

/**
 * The next branch: the Venue's `useSearchEvents`, mapped to venue-neutral
 * results. It searches only when the descriptor supports search and the
 * query fits the backend's cap. The Venue is part of the query key, so a
 * Venue change drops the old results on the same render and a late answer
 * for the old Venue lands in that Venue's cache, never here. An Event of
 * another Venue is dropped rather than re-minted onto this one. An error
 * or an empty search has no results.
 */
export const useNextPredictSearchResults = ({
  venueId,
  query,
}: UseNextPredictSearchResultsOptions): NextPredictSearchResults => {
  const capabilities = useVenueCapabilities(venueId);
  const isSupported =
    venueId !== NO_VENUE && isVenueSearchSupported(capabilities);
  const trimmed = query.trim();
  const canSearch =
    isSupported &&
    trimmed.length > 0 &&
    trimmed.length <= SEARCH_QUERY_MAX_LENGTH;

  const search = useSearchEvents(venueId, canSearch ? trimmed : '');
  const events = canSearch ? search.data?.events : undefined;

  const results = useMemo(
    () =>
      events
        ? events
            .filter((event) => event?.id && event.venueId === venueId)
            .map(toNextPredictSearchResult)
        : NO_RESULTS,
    [events, venueId],
  );
  // A fresh key commits one frame as pending before its request starts, so
  // "no data and no error yet" is loading.
  const isLoading = canSearch && events === undefined && !search.isError;

  return useMemo(
    () => ({
      results: results as PredictSearchResult[],
      isLoading,
      isSupported,
    }),
    [isLoading, isSupported, results],
  );
};
