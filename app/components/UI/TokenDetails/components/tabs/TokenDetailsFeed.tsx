import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useLoadMoreOnScroll } from '../tokenDetailsScroll';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import { useSocialFeed } from '../../../SocialFeed/data/useSocialFeed';
import type { SocialFeedSource } from '../../../SocialFeed/data/socialFeedSource';
import {
  SocialFeedSurfaceProvider,
  type SocialSurfaceLocation,
} from '../../../SocialFeed/SocialFeedSurface';
import type { SocialV1FeedPost } from '../../../SocialFeed/types';
import {
  SocialEntryOptionsProvider,
  useSocialEntryModeration,
} from '../../../SocialFeed/components/SocialEntryOptionsBottomSheet';
import SocialFeedError from '../../../SocialFeed/components/SocialFeedError';
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from '../../../SocialFeed/components/SocialFeedPostShell';
import SocialFeedSkeleton from '../../../SocialFeed/components/SocialFeedSkeleton';
import SocialV1FeedPostList from '../../../SocialFeed/components/SocialV1FeedPostList';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

const NEXT_PAGE_TEST_ID = 'token-details-feed-next-page';

export interface TokenDetailsFeedProps {
  source: SocialFeedSource;
  location: SocialSurfaceLocation;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  /** The visible tab pages alone follow the page scroll for more posts. */
  isActive?: boolean;
  /** True when this wallet holds the token. Picks the empty-state copy. */
  hasBalance?: boolean;
  /** Token on screen, so the empty-state post opens on this holding. */
  token?: TokenDetailsRouteParams;
  /** Reports whether the feed is showing its empty state. */
  onEmptyChange?: (isEmpty: boolean) => void;
}

const TokenDetailsFeedBody: React.FC<TokenDetailsFeedProps> = ({
  source,
  location,
  onCopyTrade,
  isActive = true,
  hasBalance = false,
  token,
  onEmptyChange,
}) => {
  const enabled = useSelector(selectSocialLeaderboardEnabled);
  const { isEntryHidden } = useSocialEntryModeration();
  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostShell
        post={post}
        requireSocialTerms
        onCopyTrade={onCopyTrade}
      />
    ),
    [onCopyTrade],
  );
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialFeed(enabled ? source : null);
  // A hidden post must leave the list. The row keeps its padding and the
  // divider after it when the post itself renders nothing.
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

  useLoadMoreOnScroll({
    enabled: isActive && hasNextPage && !isFetchingNextPage,
    onLoadMore: loadMore,
  });

  const showEmpty =
    enabled && !isLoading && !error && visiblePosts.length === 0;

  useEffect(() => {
    onEmptyChange?.(showEmpty);
  }, [onEmptyChange, showEmpty]);

  if (!enabled) {
    return null;
  }

  const showSkeleton = isLoading && posts.length === 0;

  return (
    <SocialFeedSurfaceProvider location={location}>
      <Box twClassName="gap-4">
        {showSkeleton ? <SocialFeedSkeleton /> : null}
        {visiblePosts.length > 0 ? (
          <SocialV1FeedPostList
            posts={visiblePosts}
            dividerKeyPrefix={location}
            renderPost={renderPost}
          />
        ) : null}
        {showEmpty ? (
          <TokenDetailsFeedEmptyState hasBalance={hasBalance} token={token} />
        ) : null}
        {error ? <SocialFeedError onRetry={() => refresh()} /> : null}
        {isFetchingNextPage ? (
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="py-2"
            testID={NEXT_PAGE_TEST_ID}
          >
            <ActivityIndicator size="small" />
          </Box>
        ) : null}
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

/**
 * Token feed. Hosts the post options sheet so hide and block confirm with a
 * toast, and drops hidden posts before the list draws them.
 */
export const TokenDetailsFeed: React.FC<TokenDetailsFeedProps> = (props) => (
  <SocialEntryOptionsProvider>
    <TokenDetailsFeedBody {...props} />
  </SocialEntryOptionsProvider>
);
