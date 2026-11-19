import { queryOptions } from '@tanstack/react-query';
import { fetchMockHomePacks } from '../mocks/homePacks';

/**
 * Query key factory for Collectibles pack queries.
 *
 * - `all()` — prefix key for invalidating every pack query at once.
 * - `home()` — packs shown in the Home carousel.
 */
export const collectiblesPackKeys = {
  all: () => ['collectibles', 'packs'] as const,
  home: () => [...collectiblesPackKeys.all(), 'home'] as const,
};

export const collectiblesHomePacksOptions = queryOptions({
  queryKey: collectiblesPackKeys.home(),
  // TODO: replace with the Collector Crypt, pack and Social API calls (GAC-65, GAC-68, GAC-69).
  queryFn: fetchMockHomePacks,
  // Always stale so a remount or focus refetch picks up reopened machines.
  staleTime: 0,
});
