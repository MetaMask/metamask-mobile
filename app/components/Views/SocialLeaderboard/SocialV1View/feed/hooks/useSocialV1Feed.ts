import { useMemo, useSyncExternalStore } from 'react';
import { useTraderFeed } from '../../../FeedView/hooks/useTraderFeed';
import { wrapLiveFeedPosts } from '../mocks/wrapLiveFeedPosts';
import {
  getSocialV1ComposedFeedSnapshot,
  subscribeSocialV1ComposedFeed,
} from '../store/socialV1ComposedFeedStore';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';

/** Trending reads the generic `leaderboard` scope, Following the per-user one. */
const TAB_AUDIENCE = {
  trending: 'all',
  following: 'following',
} as const;

/**
 * V1 feed data source: live trader activity from `SocialService:fetchFeed`,
 * mapped into the V1 card model with the missing enrichment mocked and flagged.
 *
 * Delegates fetching to `useTraderFeed`, so V1 inherits V0's unlock gate,
 * telemetry and error normalisation -- and shares its query keys, which means
 * either surface warms the cache for the other. Composed posts from the
 * plus-button composer still prepend on Trending only.
 */
export const useSocialV1Feed = (
  tab: SocialV1FeedTab = 'trending',
): UseSocialV1FeedResult => {
  // Everything composer-related must come off this snapshot rather than a
  // direct store read: React Compiler memoizes this hook's result, so a read
  // that isn't a reactive input can be cached across mutations and strand the
  // feed on an older revision (no posting banner, no new card).
  const snapshot = useSyncExternalStore(
    subscribeSocialV1ComposedFeed,
    getSocialV1ComposedFeedSnapshot,
    getSocialV1ComposedFeedSnapshot,
  );

  const {
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useTraderFeed({ audience: TAB_AUDIENCE[tab] });

  const livePosts = useMemo(() => wrapLiveFeedPosts(rows), [rows]);

  const pagination = {
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  };

  if (tab === 'following') {
    return {
      posts: livePosts,
      pendingPost: null,
      pendingStartedAtMs: null,
      ...pagination,
    };
  }

  return {
    posts: [...snapshot.composedPosts, ...livePosts],
    pendingPost: snapshot.pendingPost,
    pendingStartedAtMs: snapshot.pendingStartedAtMs,
    ...pagination,
  };
};
