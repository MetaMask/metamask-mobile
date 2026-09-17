import { useEffect, useState } from 'react';
import { wrapMockFeedPosts } from '../mocks/wrapMockFeedPosts';
import {
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
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
  const [, setRevision] = useState(0);

  useEffect(
    () => subscribeSocialV1ComposedFeed(() => setRevision((n) => n + 1)),
    [],
  );

  const mockPosts = wrapMockFeedPosts();

  if (tab === 'following') {
    return {
      posts: mockPosts,
      pendingPost: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    posts: [...getSocialV1ComposedPosts(), ...mockPosts],
    pendingPost: getSocialV1PendingPost(),
    isLoading: false,
    error: null,
  };
};
