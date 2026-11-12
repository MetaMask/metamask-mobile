import { collectiblesQueries } from '../services/data/collectiblesQueries';
import { usePackPartnerAccount } from '../providers/pack-partner/hooks/usePackPartnerAccount';
import { useInfiniteQuery, useQuery } from '@metamask/react-data-query';
import { collectiblesDataScope } from '../services/data/queryKeys';
export { useCollectiblesFollow } from './useCollectiblesSocialCommands';
import type {
  CollectiblesSocialApiClient,
  CollectiblesCommentTarget,
  CollectiblesLeaderboardSort,
} from '../services/clients/CollectiblesSocialApiClient';
import { useCollectiblesPresentation } from './useCollectiblesPresentation';

type Result<Key extends keyof CollectiblesSocialApiClient> = Awaited<
  ReturnType<CollectiblesSocialApiClient[Key]>
>;

/** Social provides ordered profiles; ranking scores are never computed in the view. */
export function useCollectiblesLeaderboard(sort: CollectiblesLeaderboardSort) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useInfiniteQuery<Result<'getLeaderboard'>>({
    queryKey: collectiblesQueries.social(
      'getLeaderboard',
      collectiblesDataScope(account),
      { sort, limit: 20 },
    ),
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: online,
    gcTime: 5 * 60_000,
  });
}

/** Paginated Feed V2 may contain either single-pack or multi-pack items. */
export function useCollectiblesFeed(profileId?: string) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useInfiniteQuery<Result<'getFeed'>>({
    queryKey: collectiblesQueries.social(
      'getFeed',
      collectiblesDataScope(account),
      { ...(profileId ? { profileId } : {}), limit: 20 },
    ),
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: online,
    gcTime: 5 * 60_000,
  });
}

export function useCollectiblesProfile(profileId?: string) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useQuery<Result<'getProfile'>>({
    queryKey: collectiblesQueries.social(
      'getProfile',
      collectiblesDataScope(account),
      { profileId: profileId ?? '' },
    ),
    enabled: online && Boolean(profileId),
    gcTime: 5 * 60_000,
  });
}

export function useProfilePokedex(profileId?: string, generation?: number) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useQuery<Result<'getProfilePokedex'>>({
    queryKey: collectiblesQueries.social(
      'getProfilePokedex',
      collectiblesDataScope(account),
      {
        profileId: profileId ?? '',
        ...(generation === undefined ? {} : { generation }),
      },
    ),
    enabled: online && Boolean(profileId),
    gcTime: 5 * 60_000,
  });
}

export function useCollectiblesComments(target: CollectiblesCommentTarget) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useInfiniteQuery<Result<'getComments'>>({
    queryKey: collectiblesQueries.social(
      'getComments',
      collectiblesDataScope(account),
      { ...target, limit: 20 },
    ),
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: online,
    gcTime: 5 * 60_000,
  });
}

/** Public indexed openings, including sold cards; never presented as current ownership. */
export function useProfileCollectibles(profileId?: string) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useInfiniteQuery<Result<'getProfileCollectibles'>>({
    queryKey: collectiblesQueries.social(
      'getProfileCollectibles',
      collectiblesDataScope(account),
      { profileId: profileId ?? '', limit: 20 },
    ),
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: online && Boolean(profileId),
    gcTime: 5 * 60_000,
  });
}

/** Full indexed history aggregate; independent from the profile's currently loaded page. */
export function useProfileFavoritePacks(profileId?: string) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useQuery<Result<'getProfileFavoritePacks'>>({
    queryKey: collectiblesQueries.social(
      'getProfileFavoritePacks',
      collectiblesDataScope(account),
      { profileId: profileId ?? '' },
    ),
    enabled: online && Boolean(profileId),
    gcTime: 5 * 60_000,
  });
}
