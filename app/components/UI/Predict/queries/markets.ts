import type { PredictCategory } from '../types';

/**
 * Query key factory for Predict market-list (infinite scroll) queries.
 *
 * - `all()` — prefix key for invalidating every market-list entry at once.
 * - `list(params)` — unique key for a specific category + search + custom params combo.
 */
export const predictMarketsKeys = {
  all: () => ['predict', 'markets'] as const,
  list: (params: {
    category: PredictCategory;
    q?: string;
    customQueryParams?: string;
  }) =>
    [
      ...predictMarketsKeys.all(),
      params.category,
      params.q ?? '',
      params.customQueryParams ?? '',
    ] as const,
};
