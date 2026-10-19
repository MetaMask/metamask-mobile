import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
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
import SocialFeedEmpty from '../../../SocialFeed/components/SocialFeedEmpty';
import SocialFeedError from '../../../SocialFeed/components/SocialFeedError';
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from '../../../SocialFeed/components/SocialFeedPostShell';
import SocialFeedSkeleton from '../../../SocialFeed/components/SocialFeedSkeleton';
import SocialV1FeedPostList from '../../../SocialFeed/components/SocialV1FeedPostList';

/** How far past the screen a footer may sit and still count as reached. */
const LOAD_MORE_THRESHOLD_PX = 600;

/** How often a mounted feed checks whether its footer has scrolled into view. */
const VISIBILITY_CHECK_MS = 400;

const NEXT_PAGE_TEST_ID = 'token-details-feed-next-page';

const styles = StyleSheet.create({
  // An empty view measures as height 0, and the visibility check ignores that,
  // so the footer would never ask for another page. One pixel is enough to
  // measure, and `collapsable={false}` stops Android from dropping the view.
  sentinel: {
    height: 1,
  },
});

export interface TokenDetailsFeedProps {
  source: SocialFeedSource;
  location: SocialSurfaceLocation;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
}

const LoadMoreSentinel: React.FC<{
  enabled: boolean;
  onVisible: () => void;
}> = ({ enabled, onVisible }) => {
  const ref = useRef<View>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  const check = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (height <= 0) {
        return;
      }
      const screenHeight = Dimensions.get('window').height;
      if (y < screenHeight + LOAD_MORE_THRESHOLD_PX && y + height > 0) {
        onVisibleRef.current();
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    check();
    const intervalId = setInterval(check, VISIBILITY_CHECK_MS);
    return () => clearInterval(intervalId);
  }, [check, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={styles.sentinel}
      onLayout={check}
    />
  );
};

const TokenDetailsFeedBody: React.FC<TokenDetailsFeedProps> = ({
  source,
  location,
  onCopyTrade,
}) => {
  const enabled = useSelector(selectSocialLeaderboardEnabled);
  const { isEntryHidden } = useSocialEntryModeration();
  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostShell post={post} onCopyTrade={onCopyTrade} />
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
          }),
      ),
    [isEntryHidden, posts],
  );

  if (!enabled) {
    return null;
  }

  const showSkeleton = isLoading && posts.length === 0;
  const showEmpty = !isLoading && !error && visiblePosts.length === 0;

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
        {showEmpty ? <SocialFeedEmpty /> : null}
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
        <LoadMoreSentinel
          enabled={hasNextPage && !isFetchingNextPage}
          onVisible={loadMore}
        />
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
