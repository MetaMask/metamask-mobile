import { useMemo } from 'react';
import { usePredictionsFeed } from '../../../../Predict/trending/usePredictionsFeed';
import type { PredictSearchResults } from '../../types';
import { toPredictSearchResults } from './toPredictSearchResult';

interface UseLegacyPredictSearchResultsOptions {
  query: string;
  enabled: boolean;
}

/**
 * The legacy branch: the Polymarket search Explore and Browser autocomplete
 * already used (`usePredictionsFeed` with a query, the same query key), mapped
 * to venue-neutral results. Disabled, it reads nothing.
 */
export const useLegacyPredictSearchResults = ({
  query,
  enabled,
}: UseLegacyPredictSearchResultsOptions): PredictSearchResults => {
  const { data, isLoading } = usePredictionsFeed({
    variant: 'trending',
    query,
    enabled,
  });

  const results = useMemo(() => toPredictSearchResults(data), [data]);

  return useMemo(() => ({ results, isLoading }), [results, isLoading]);
};
