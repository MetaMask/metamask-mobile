import { useSyncExternalStore } from 'react';
import {
  getSocialV1ComposedFeedSnapshot,
  subscribeSocialV1ComposedFeed,
} from '../store/socialV1ComposedFeedStore';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';
import { wrapMockFeedPosts } from './wrapMockFeedPosts';

/**
 * Stand-in for `useSocialV1Feed` in suites that cover the feed *chrome* --
 * tabs, carousel, posting banner, entrance animations -- rather than the data
 * layer.
 *
 * The real hook fetches through `useTraderFeed`, which needs keyring state and
 * a React Query provider; standing it up in a chrome test would only test the
 * harness. This keeps the composed-post store real, because the banner and
 * prepend assertions depend on it, and serves the static fixtures as the
 * baseline feed so those tests can key off known ids.
 */
export const mockUseSocialV1Feed = (
  tab: SocialV1FeedTab = 'trending',
): UseSocialV1FeedResult => {
  const snapshot = useSyncExternalStore(
    subscribeSocialV1ComposedFeed,
    getSocialV1ComposedFeedSnapshot,
    getSocialV1ComposedFeedSnapshot,
  );

  const mockPosts = wrapMockFeedPosts();
  // The fixtures are a single page, so the pagination surface is inert here.
  const pagination = {
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: () => undefined,
    error: null,
    refresh: () => Promise.resolve(),
  };

  if (tab === 'following') {
    return {
      posts: mockPosts,
      pendingPost: null,
      pendingStartedAtMs: null,
      ...pagination,
    };
  }

  return {
    posts: [...snapshot.composedPosts, ...mockPosts],
    pendingPost: snapshot.pendingPost,
    pendingStartedAtMs: snapshot.pendingStartedAtMs,
    ...pagination,
  };
};
