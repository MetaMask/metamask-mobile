import type { QueryFunctionContext } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type {
  PredictMarketListParams,
  PredictMarketListResponse,
} from '../types';

export const PREDICT_MARKET_LIST_PAGE_SIZE = 20;

/**
 * Deterministic, query-key-safe view of the list params. Emits fields in a
 * FIXED order and normalizes equivalent inputs to the same shape so the
 * React Query key is stable regardless of caller object key order or array order.
 *
 * `tags`/`tagSlugs`/`excludedTags`/`series` are sorted (order-insensitive).
 * `search` is trimmed and blank/whitespace becomes `undefined` (browse mode).
 * `live` only matters when `true` (matches the provider query builder), so
 * `false`/`undefined` collapse to `undefined`. `limit` defaults to
 * `PREDICT_MARKET_LIST_PAGE_SIZE`.
 *
 * `afterCursor` is intentionally excluded — it is the infinite-query page
 * param, not part of the cache key.
 */
export const normalizeMarketListParams = (
  params: PredictMarketListParams = {},
) => {
  const search = params.search?.trim();

  return {
    queryParams: params.queryParams?.trim() || undefined,
    tags: params.tags?.length
      ? [...params.tags].sort((a, b) => a.localeCompare(b))
      : undefined,
    tagSlugs: params.tagSlugs?.length
      ? [...params.tagSlugs].sort((a, b) => a.localeCompare(b))
      : undefined,
    excludedTags: params.excludedTags?.length
      ? [...params.excludedTags].sort((a, b) => a.localeCompare(b))
      : undefined,
    series: params.series?.length
      ? [...params.series].sort((a, b) => a.localeCompare(b))
      : undefined,
    order: params.order,
    status: params.status,
    live: params.live === true ? true : undefined,
    startTimeMin: params.startTimeMin,
    startTimeMinMinutesAgo: params.startTimeMinMinutesAgo,
    search: search || undefined,
    limit: params.limit ?? PREDICT_MARKET_LIST_PAGE_SIZE,
  };
};

export const predictMarketListKeys = {
  all: () => ['predict', 'marketList'] as const,
  list: (normalized: ReturnType<typeof normalizeMarketListParams>) =>
    [...predictMarketListKeys.all(), normalized] as const,
};

type PredictMarketListQueryKey = ReturnType<typeof predictMarketListKeys.list>;

export const predictMarketListOptions = (
  params: PredictMarketListParams = {},
) => ({
  queryKey: predictMarketListKeys.list(normalizeMarketListParams(params)),
  queryFn: ({
    pageParam,
  }: QueryFunctionContext<
    PredictMarketListQueryKey,
    string
  >): Promise<PredictMarketListResponse> =>
    Engine.context.PredictController.listMarkets({
      ...params,
      afterCursor: typeof pageParam === 'string' ? pageParam : null,
    }),
  getNextPageParam: (lastPage: PredictMarketListResponse) =>
    lastPage.nextCursor ?? undefined,
  staleTime: 10_000,
});
