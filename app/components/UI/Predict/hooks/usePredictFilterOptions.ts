import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { predictQueries } from '../queries';
import { ensureError } from '../utils/predictErrorHandler';
import type { PredictFilterOption, PredictFilterOptionsParams } from '../types';

export interface UsePredictFilterOptionsOptions {
  /** When false, skips fetching (e.g. section mounted while flag/feature off). */
  enabled?: boolean;
}

export interface UsePredictFilterOptionsResult {
  filterOptions: PredictFilterOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

/**
 * React Query hook for the redesigned Predict feed's dynamic filter chips
 * (e.g. "Popular today"). Drives `PredictController.listFilterOptions`, which is
 * best-effort and non-blocking: on failure the provider returns an empty list,
 * so consumers should keep static filters and simply hide the dynamic ones.
 *
 * Returns a flat, non-paginated list (mirrors `useFeaturedCarouselData`), unlike
 * the cursor-paginated `usePredictMarketList`.
 */
export const usePredictFilterOptions = (
  params: PredictFilterOptionsParams,
  options: UsePredictFilterOptionsOptions = {},
): UsePredictFilterOptionsResult => {
  const { enabled = true } = options;

  const query = useQuery({
    ...predictQueries.filterOptions.options(params),
    enabled,
  });

  // Stable empty-list reference when there is no data yet, so consumers using
  // `filterOptions` in dependency arrays don't re-run on every render.
  const filterOptions = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => {
    if (!query.error) {
      return;
    }

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictFilterOptions',
      },
      context: {
        name: 'usePredictFilterOptions',
        data: {
          method: 'queryFn',
          action: 'filter_options_load',
          operation: 'data_fetching',
          source: params.source,
        },
      },
    });
  }, [params.source, query.error]);

  return {
    filterOptions,
    // isInitialLoading (not isLoading) so a disabled query (enabled: false)
    // reports false instead of being stuck "loading": React Query v4 keeps a
    // never-fetched query in `status: 'loading'`.
    isLoading: query.isInitialLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
};
