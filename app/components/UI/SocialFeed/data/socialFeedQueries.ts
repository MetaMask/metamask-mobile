import type { FeedResponse } from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';
import type { SocialFeedRequest } from './socialFeedSource';

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
