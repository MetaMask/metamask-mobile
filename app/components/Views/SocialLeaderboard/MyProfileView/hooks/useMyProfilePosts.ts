import { useMemo } from 'react';
import type {
  TraderFeedRow,
  SocialV1FeedPost,
} from '../../../../UI/SocialFeed/types';
import type { SocialFeedSource } from '../../../../UI/SocialFeed/data/socialFeedSource';
import { useSocialFeed } from '../../../../UI/SocialFeed/data/useSocialFeed';

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
