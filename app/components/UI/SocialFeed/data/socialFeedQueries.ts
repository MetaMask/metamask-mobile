import type { FeedResponse } from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';
import type { FeedScope, SocialFeedRequest } from './socialFeedSource';

/** Page size requested per feed page. */
export const FEED_PAGE_LIMIT = 30;

/** Messenger actions that return a `FeedResponse`; also the query-key roots. */
export const SOCIAL_FEED_QUERY_ACTIONS = [
  'SocialService:fetchFeed',
  'SocialService:fetchTokenFeed',
  'SocialService:fetchTraderFeed',
] as const satisfies readonly SocialFeedRequest['action'][];

/**
 * Distinguishes this paginated cache from `SocialService.fetchQuery`.
 *
 * The service stores each page as a plain `FeedResponse` under
 * `[action, options]`. The UI query client hydrates
 * `SocialService:cacheUpdated:${hash}` into any query with that hash, which
 * replaces `{ pages, pageParams }` and crashes the next render in
 * `hasNextPage` (`data.pages` is missing). This extra segment keeps prefix
 * invalidation on `[action]` working and makes the hashes differ.
 */
export const SOCIAL_FEED_INFINITE_QUERY_KIND = 'infinite' as const;

export type SocialFeedQueryKey = [
  SocialFeedRequest['action'],
  SocialFeedRequest['options'] & { limit: number },
  typeof SOCIAL_FEED_INFINITE_QUERY_KIND,
];

/**
 * `[action, request options + page size, 'infinite']`. The page size is part
 * of the key because a 3-item preview and a full list are different first
 * pages. See {@link SOCIAL_FEED_INFINITE_QUERY_KIND} for the third segment.
 */
export const buildSocialFeedQueryKey = (
  request: SocialFeedRequest,
  limit: number,
): SocialFeedQueryKey => [
  request.action,
  { ...request.options, limit },
  SOCIAL_FEED_INFINITE_QUERY_KIND,
];

/**
 * Partial keys matching every cached feed of the viewer's follow graph,
 * whatever its chains or page size: V0's `following` (`useTraderFeed`) and
 * V1's `following_v1`.
 */
export const FOLLOWING_FEED_QUERY_KEY_PREFIXES = (
  ['following', 'following_v1'] as const satisfies readonly FeedScope[]
).map((scope) => ['SocialService:fetchFeed', { scope }] as const);

/**
 * Refetches the viewer's following feeds. Follow and unfollow leave the
 * cache in place; FollowingView calls this when the tab is opened again.
 * The UI client forwards each invalidation to `SocialService`, so its own
 * cache cannot serve the old page back. A key, not a predicate, because only
 * the key crosses the messenger. `ReactQueryService` is imported lazily to
 * keep it out of this module's load-time import graph.
 */
export const invalidateFollowingFeed = async (): Promise<void> => {
  const { default: ReactQueryService } = await import(
    '../../../../core/ReactQueryService'
  );
  await Promise.all(
    FOLLOWING_FEED_QUERY_KEY_PREFIXES.map((queryKey) =>
      ReactQueryService.queryClient.invalidateQueries({ queryKey }),
    ),
  );
};

/**
 * Fetches one feed page for a resolved request.
 *
 * Call as a member expression so the messenger keeps its `this` binding;
 * aliasing `.call` into a local detaches it and breaks action lookup.
 */
export const fetchSocialFeedPage = (
  request: SocialFeedRequest,
  limit: number,
  olderThan?: string,
): Promise<FeedResponse> => {
  const paging = olderThan ? { limit, olderThan } : { limit };
  switch (request.action) {
    case 'SocialService:fetchFeed': {
      const { chains, assetIds, ...options } = request.options;
      return Engine.controllerMessenger.call('SocialService:fetchFeed', {
        ...options,
        chains: [...chains],
        ...(assetIds ? { assetIds: [...assetIds] } : {}),
        ...paging,
      });
    }
    case 'SocialService:fetchTokenFeed':
      return Engine.controllerMessenger.call('SocialService:fetchTokenFeed', {
        ...request.options,
        ...paging,
      });
    case 'SocialService:fetchTraderFeed':
      return Engine.controllerMessenger.call('SocialService:fetchTraderFeed', {
        ...request.options,
        ...paging,
      });
    default:
      return request satisfies never;
  }
};

/**
 * react-query only stops paginating on `undefined`; guard the empty cursor
 * so an exhausted feed doesn't loop back to the first page.
 */
export const getSocialFeedNextPageParam = (
  lastPage: FeedResponse,
): string | undefined => lastPage.pagination?.olderCursor ?? undefined;
