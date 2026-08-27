import type { QueryClient } from '@tanstack/react-query';
import type {
  FeedResponse,
  FetchFeedOptions,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { FEED_CAIP2_CHAINS } from '../feed-constants';
import type { FeedAudience } from '../types';

/** Feed scope the social API expects, derived from the audience toggle. */
export type FeedScope = NonNullable<FetchFeedOptions['scope']>;

/** Page size requested per feed page. */
export const FEED_PAGE_LIMIT = 30;

/** Audiences whose first page is warmed when Follow Trading opens. */
export const PREFETCH_FEED_AUDIENCES: readonly FeedAudience[] = [
  'following',
  'all',
];

export const toFeedScope = (audience: FeedAudience): FeedScope =>
  audience === 'following' ? 'following' : 'leaderboard';

export const buildTraderFeedQueryKey = (
  scope: FeedScope,
): [string, { scope: FeedScope; chains: typeof FEED_CAIP2_CHAINS }] => [
  'SocialService:fetchFeed',
  { scope, chains: FEED_CAIP2_CHAINS },
];

/**
 * Fetches one feed page via `SocialService:fetchFeed`.
 *
 * Call as a member expression so the messenger keeps its `this` binding;
 * aliasing `.call` into a local detaches it and breaks action lookup.
 */
export const fetchTraderFeedPage = (
  scope: FeedScope,
  pageParam?: string,
): Promise<FeedResponse> => {
  const messenger = Engine.controllerMessenger as unknown as {
    call: (
      action: 'SocialService:fetchFeed',
      fetchOptions: FetchFeedOptions,
    ) => Promise<FeedResponse>;
  };
  return messenger.call('SocialService:fetchFeed', {
    scope,
    limit: FEED_PAGE_LIMIT,
    chains: [...FEED_CAIP2_CHAINS],
    ...(pageParam ? { olderThan: pageParam } : {}),
  });
};

/**
 * react-query only stops paginating on `undefined`; guard the empty cursor
 * so an exhausted feed doesn't loop back to the first page.
 */
export const getTraderFeedNextPageParam = (
  lastPage: FeedResponse,
): string | undefined => lastPage.pagination?.olderCursor ?? undefined;

/**
 * Warms the first page of each feed audience into the shared React Query
 * cache so the Feed tab and audience toggle can render without waiting on
 * a network round trip.
 */
export const prefetchTraderFeeds = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.allSettled(
    PREFETCH_FEED_AUDIENCES.map((audience) => {
      const scope = toFeedScope(audience);
      return queryClient.prefetchInfiniteQuery({
        queryKey: buildTraderFeedQueryKey(scope),
        queryFn: ({ pageParam }: { pageParam?: string }) =>
          fetchTraderFeedPage(scope, pageParam),
        retry: false,
      });
    }),
  );
};
