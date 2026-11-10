import type { QueryClient } from '@tanstack/react-query';
import type {
  FetchPositionsOptions,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';

export const TRADER_POSITIONS_FETCH_LIMIT = 100;
export const TRADER_PROFILE_PREFETCH_STALE_TIME_MS = 30_000;

export const buildTraderProfileQueryKey = (
  traderId: string,
): [string, FetchTraderProfileOptions] => [
  'SocialService:fetchTraderProfile',
  { addressOrId: traderId },
];

export const buildOpenPositionsQueryKey = (
  traderId: string,
): [string, FetchPositionsOptions] => [
  'SocialService:fetchOpenPositions',
  {
    addressOrId: traderId,
    limit: TRADER_POSITIONS_FETCH_LIMIT,
  },
];

export const buildClosedPositionsQueryKey = (
  traderId: string,
): [string, FetchPositionsOptions] => [
  'SocialService:fetchClosedPositions',
  {
    addressOrId: traderId,
    sort: 'latest',
    limit: TRADER_POSITIONS_FETCH_LIMIT,
  },
];

/**
 * Marks paginated (infinite) positions keys. The cache stores `InfiniteData`
 * under these keys, so they must never share an entry with the single-page
 * keys above, which store a plain `PositionsResponse`.
 */
export const TRADER_POSITIONS_INFINITE_QUERY_KIND = 'infinite' as const;

/**
 * Paginated open positions key. Its prefix matches
 * {@link buildOpenPositionsQueryKey}, so deeplink invalidation by
 * `{ addressOrId }` still reaches it.
 */
export const buildPaginatedOpenPositionsQueryKey = (
  traderId: string,
): [
  string,
  FetchPositionsOptions,
  typeof TRADER_POSITIONS_INFINITE_QUERY_KIND,
] => [
  'SocialService:fetchOpenPositions',
  {
    addressOrId: traderId,
    limit: TRADER_POSITIONS_FETCH_LIMIT,
  },
  TRADER_POSITIONS_INFINITE_QUERY_KIND,
];

/** Paginated closed positions key; see {@link buildPaginatedOpenPositionsQueryKey}. */
export const buildPaginatedClosedPositionsQueryKey = (
  traderId: string,
): [
  string,
  FetchPositionsOptions,
  typeof TRADER_POSITIONS_INFINITE_QUERY_KIND,
] => [
  'SocialService:fetchClosedPositions',
  {
    addressOrId: traderId,
    sort: 'latest',
    limit: TRADER_POSITIONS_FETCH_LIMIT,
  },
  TRADER_POSITIONS_INFINITE_QUERY_KIND,
];

export const getTraderProfilePrefetchQueryKeys = (traderId: string) => [
  buildTraderProfileQueryKey(traderId),
  buildOpenPositionsQueryKey(traderId),
  buildClosedPositionsQueryKey(traderId),
];

export const prefetchTraderProfileData = async (
  queryClient: QueryClient,
  traderId: string,
): Promise<void> => {
  const keys = getTraderProfilePrefetchQueryKeys(traderId);

  await Promise.allSettled(
    keys.map((queryKey) =>
      queryClient.prefetchQuery({
        queryKey,
        staleTime: TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
      }),
    ),
  );
};
