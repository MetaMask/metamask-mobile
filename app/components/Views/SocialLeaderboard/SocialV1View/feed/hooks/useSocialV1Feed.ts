import { useSyncExternalStore } from 'react';
import { wrapMockFeedPosts } from '../mocks/wrapMockFeedPosts';
import {
  getSocialV1ComposedFeedSnapshot,
  subscribeSocialV1ComposedFeed,
} from '../store/socialV1ComposedFeedStore';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';

/**
 * Temporary V1 Feed data source until the social API exposes post/comment
 * fields. Composed posts from the plus-button composer prepend on Trending only.
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

  const mockPosts = wrapMockFeedPosts();

  if (tab === 'following') {
    return {
      posts: mockPosts,
      pendingPost: null,
      pendingStartedAtMs: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    posts: [...snapshot.composedPosts, ...mockPosts],
    pendingPost: snapshot.pendingPost,
    pendingStartedAtMs: snapshot.pendingStartedAtMs,
    isLoading: false,
    error: null,
  };
};
