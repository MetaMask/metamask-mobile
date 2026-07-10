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
