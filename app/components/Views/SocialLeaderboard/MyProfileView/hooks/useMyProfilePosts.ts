import { useCallback, useMemo } from 'react';
import type {
  TraderFeedRow,
  SocialV1FeedPost,
} from '../../../../UI/SocialFeed/types';
import type { SocialFeedSource } from '../../../../UI/SocialFeed/data/socialFeedSource';
import { useSocialFeed } from '../../../../UI/SocialFeed/data/useSocialFeed';
import { readAuthorComment } from '../../../../UI/SocialFeed/reactions';
import { usePendingPostsOverlay } from '../../pendingPosts/usePendingPostsOverlay';

export interface UseMyProfilePostsOptions {
  /**
   * The viewer's social profile id, when this is their own profile: their
   * just-written posts show on top until the feed returns them.
   */
  ownerProfileId?: string;
  /** Whether the Posts tab is on screen; gates realtime and pending refetches. */
  isActive?: boolean;
}

export interface UseMyProfilePostsResult {
  posts: SocialV1FeedPost[];
  rows: TraderFeedRow[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * The trader's commented positions, as feed posts. The feed is ordered by
 * comment time, so each card is dated by its comment rather than its trade.
 */
export const useMyProfilePosts = (
  profileId: string | undefined,
  { ownerProfileId, isActive = true }: UseMyProfilePostsOptions = {},
): UseMyProfilePostsResult => {
  const source = useMemo(
    (): SocialFeedSource | null =>
      profileId ? { scope: 'all', profileId, commentedOnly: true } : null,
    [profileId],
  );
  const filterPost = useCallback(
    (post: SocialV1FeedPost) =>
      post.item.author.id === profileId && Boolean(post.commentId),
    [profileId],
  );

  const {
    posts: feedPosts,
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh: refetch,
  } = useSocialFeed(source, { realtime: isActive, filterPost });

  const serverPosts = useMemo(
    () =>
      feedPosts.map((post, index) => {
        const row = rows[index];
        const commentedAt = row
          ? readAuthorComment(row.core)?.timestamp
          : undefined;
        return commentedAt
          ? { ...post, timestampMs: commentedAt * 1000 }
          : post;
      }),
    [feedPosts, rows],
  );

  const overlay = usePendingPostsOverlay({
    surface: 'posts',
    ownerProfileId,
    serverPosts,
    refetch,
    isActive,
  });

  const posts = useMemo(
    () => [...overlay.pinnedPosts, ...overlay.posts],
    [overlay.pinnedPosts, overlay.posts],
  );

  return {
    posts,
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh: overlay.refresh,
  };
};
