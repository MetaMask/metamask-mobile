import { useSyncExternalStore } from 'react';
import {
  getPendingPostsSnapshot,
  subscribePendingPosts,
} from '../../../pendingPosts/pendingPostsStore';
import { overlayPendingPosts } from '../../../pendingPosts/usePendingPostsOverlay';
import type { SocialV1FeedTab, UseSocialV1FeedResult } from '../types';
import { wrapMockFeedPosts } from '../../../../../UI/SocialFeed/mocks/wrapMockFeedPosts';

/**
 * Stand-in for `useSocialV1Feed` in suites that cover the feed *chrome* --
 * tabs, carousel, pinned posts, entrance animations -- rather than the data
 * layer.
 *
 * The real hook fetches through `useSocialFeed`, which needs keyring state and
 * a React Query provider; standing it up in a chrome test would only test the
 * harness. This keeps the pending-post store and its merge rules real, because
 * the pinning assertions depend on them, and serves the static fixtures as the
 * baseline feed so those tests can key off known ids.
 */
export const mockUseSocialV1Feed = (
  tab: SocialV1FeedTab = 'trending',
  { ownerProfileId }: { ownerProfileId?: string } = {},
): UseSocialV1FeedResult => {
  const entries = useSyncExternalStore(
    subscribePendingPosts,
    getPendingPostsSnapshot,
    getPendingPostsSnapshot,
  );
  const { pinnedPosts, posts } = overlayPendingPosts(
    'following',
    entries,
    tab === 'following' ? ownerProfileId : undefined,
    wrapMockFeedPosts(),
  );

  return {
    posts,
    pinnedPosts,
    // The fixtures are a single page, so the pagination surface is inert here.
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: () => undefined,
    error: null,
    refresh: () => Promise.resolve(),
  };
};

/** First-page load with no rows yet — for skeleton chrome tests. */
export const mockUseSocialV1FeedLoading = (): UseSocialV1FeedResult => ({
  posts: [],
  pinnedPosts: [],
  isLoading: true,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: () => undefined,
  error: null,
  refresh: () => Promise.resolve(),
});
