import { useIsFocused } from '@react-navigation/native';
import { useMemo } from 'react';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { useSocialEntryModeration } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import type { SocialFeedQuery } from '../../../../UI/SocialFeed/data/socialFeedSource';
import { useSocialFeed } from '../../../../UI/SocialFeed/data/useSocialFeed';
import { useSocialV1HotTokens } from '../../SocialV1View/feed/hooks/useSocialV1HotTokens';
import type { SocialV1HotToken } from '../../SocialV1View/feed/types';

export interface UseTrendingHotTokensOptions {
  /** False until the tab is first opened. Nothing is fetched before. */
  hasBeenActive: boolean;
  /** The chip filtering the feed, kept on the rail if it drops out. */
  selectedTokenId: string | null;
}

export interface TrendingHotTokens {
  tokens: SocialV1HotToken[];
  /** True until the first page has been ranked. */
  isLoading: boolean;
}

/**
 * Hot-token chips for Trending, ranked client-side from the unfiltered feed.
 *
 * The one caller of `useSocialFeed` outside `SocialFeed`, until a hot-tokens
 * endpoint replaces it. Pass the query `SocialFeed` renders, without
 * `assetIds`: with the default page size, both observe one cache entry, and
 * the gate is `SocialFeedVirtualized`'s plus first activation, so this never
 * fetches when the feed would not. It stays on the unfiltered entry while a
 * chip filters the feed, so the rail keeps offering every chip.
 *
 * The feed streams that entry and refreshes it itself. The pages never go
 * stale here, or regaining focus would reload every page under the reader.
 */
export const useTrendingHotTokens = (
  query: SocialFeedQuery,
  { hasBeenActive, selectedTokenId }: UseTrendingHotTokensOptions,
): TrendingHotTokens => {
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const { posts, isLoading } = useSocialFeed(query, {
    enabled: hasBeenActive && isFocused && networkTier !== 'NONE',
    staleTime: Infinity,
  });
  const { isEntryHidden } = useSocialEntryModeration();
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          !isEntryHidden({
            postId: post.id,
            authorId: post.item.author.id,
            authorHandle: post.authorHandle,
            commentId: post.commentId,
          }),
      ),
    [isEntryHidden, posts],
  );
  const { tokens, isLoading: isRanking } = useSocialV1HotTokens(
    visiblePosts,
    isLoading,
    selectedTokenId,
  );
  return useMemo(() => ({ tokens, isLoading: isRanking }), [isRanking, tokens]);
};
