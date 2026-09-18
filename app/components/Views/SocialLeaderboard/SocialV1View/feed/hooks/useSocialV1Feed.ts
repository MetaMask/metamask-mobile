import { useSyncExternalStore } from 'react';
import { wrapMockFeedPosts } from '../mocks/wrapMockFeedPosts';
import {
  getSocialV1ComposedFeedRevision,
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
  getSocialV1PendingStartedAtMs,
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
  // Subscribed for the re-render only; the posts themselves are read straight
  // from the store below so a bumped revision always yields fresh data.
  useSyncExternalStore(
    subscribeSocialV1ComposedFeed,
    getSocialV1ComposedFeedRevision,
    getSocialV1ComposedFeedRevision,
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
    posts: [...getSocialV1ComposedPosts(), ...mockPosts],
    pendingPost: getSocialV1PendingPost(),
    pendingStartedAtMs: getSocialV1PendingStartedAtMs(),
    isLoading: false,
    error: null,
  };
};
