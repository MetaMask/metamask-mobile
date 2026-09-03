import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { PredictFilterOption, PredictFilterOptionsParams } from '../types';
import { normalizeMarketListParams } from './marketList';

/**
 * Deterministic, query-key-safe view of the filter-options params so the React
 * Query key is stable regardless of caller object key order. `baseParams` is
 * normalized via the shared market-list normalizer.
 */
export const normalizeFilterOptionsParams = (
  params: PredictFilterOptionsParams,
) => ({
  source: params.source,
  baseTagSlug: params.baseTagSlug ?? 'all',
  limit: params.limit,
  baseParams: params.baseParams
    ? normalizeMarketListParams(params.baseParams)
    : undefined,
});

export const predictFilterOptionsKeys = {
  all: () => ['predict', 'filterOptions'] as const,
  list: (normalized: ReturnType<typeof normalizeFilterOptionsParams>) =>
    [...predictFilterOptionsKeys.all(), normalized] as const,
};

export const predictFilterOptionsOptions = (
  params: PredictFilterOptionsParams,
) =>
  queryOptions<PredictFilterOption[], Error>({
    queryKey: predictFilterOptionsKeys.list(
      normalizeFilterOptionsParams(params),
    ),
    queryFn: async (): Promise<PredictFilterOption[]> => {
      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('PredictController not available');
      }
      return controller.listFilterOptions(params);
    },
    staleTime: 10_000,
  });
