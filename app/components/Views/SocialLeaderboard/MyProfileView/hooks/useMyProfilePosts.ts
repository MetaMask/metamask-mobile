import { useMemo } from 'react';
import type { TraderFeedRow } from '../../FeedView/hooks/useTraderFeed';
import type { SocialFeedSource } from '../../SocialFeed/socialFeedSource';
import { useSocialFeed } from '../../SocialFeed/useSocialFeed';
import type { SocialV1FeedPost } from '../../SocialV1View/feed/types';

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

/** The owner's commented positions, as feed posts. */
export const useMyProfilePosts = (
  addressOrId: string | undefined,
): UseMyProfilePostsResult => {
  const source = useMemo(
    (): SocialFeedSource | null =>
      addressOrId ? { kind: 'trader', addressOrId, commentedOnly: true } : null,
    [addressOrId],
  );

  const {
    posts,
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialFeed(source);

  return {
    posts,
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  };
};
