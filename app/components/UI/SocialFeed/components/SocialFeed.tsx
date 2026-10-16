import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useSocialFeed } from '../data/useSocialFeed';
import type { SocialFeedSource } from '../data/socialFeedSource';
import {
  SocialFeedSurfaceProvider,
  type SocialSurfaceLocation,
} from '../SocialFeedSurface';
import type { SocialV1FeedPost } from '../types';
import {
  SocialEntryOptionsProvider,
  useSocialEntryModeration,
} from './SocialEntryOptionsBottomSheet';
import SocialFeedEmpty from './SocialFeedEmpty';
import SocialFeedError from './SocialFeedError';
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from './SocialFeedPostShell';
import SocialFeedSkeleton from './SocialFeedSkeleton';
import SocialV1FeedPostList from './SocialV1FeedPostList';

/** How far past the screen a footer may sit and still count as reached. */
const LOAD_MORE_THRESHOLD_PX = 600;

/** How often a mounted feed checks whether its footer has scrolled into view. */
const VISIBILITY_CHECK_MS = 400;

export const SOCIAL_FEED_NEXT_PAGE_TEST_ID = 'social-feed-next-page';
export const SOCIAL_FEED_SENTINEL_TEST_ID = 'social-feed-sentinel';

const styles = StyleSheet.create({
  // An empty view measures as height 0, and the visibility check ignores that,
  // so the footer would never ask for another page. One pixel is enough to
  // measure, and `collapsable={false}` stops Android from dropping the view.
  sentinel: {
    height: 1,
  },
});

export interface SocialFeedProps {
  /** Which slice to load. The component fetches it; the host does not. */
  source: SocialFeedSource;
  /** Where this feed is shown. Stored for later analytics. */
  location: SocialSurfaceLocation;
  /** Optional heading above the posts. */
  title?: string;
  /**
   * Spot copy trade. Without it the spot Copy trade button has no action;
   * perps posts open the Perps order sheet on their own.
   */
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
}

/**
 * Asks for the next page once the footer is inside the host scroll.
 *
 * The feed has no scroll view of its own, because Perps and Token details
 * already scroll. Measuring the footer is what tells us the user reached it
 * without the host wiring a scroll callback.
 */
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
      testID={SOCIAL_FEED_SENTINEL_TEST_ID}
    />
  );
};

const SocialFeedBody: React.FC<SocialFeedProps> = ({
  source,
  location,
  title,
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
  // A hidden post must leave the list, not render empty: the list would keep
  // its padding and the divider that follows it.
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
        {title ? <Text variant={TextVariant.HeadingSm}>{title}</Text> : null}
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
            testID={SOCIAL_FEED_NEXT_PAGE_TEST_ID}
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
 * Infinite social feed for one source. Renders inside the host's scroll:
 * skeleton, error, "No trades yet", then every loaded page. Invented values
 * stay hidden unless an outer surface has opted into them.
 *
 * Hosts the post options sheet so hide and block confirm with a toast. A host
 * that already provides one keeps it, and the hidden posts it tracks.
 */
const SocialFeed: React.FC<SocialFeedProps> = (props) => (
  <SocialEntryOptionsProvider>
    <SocialFeedBody {...props} />
  </SocialEntryOptionsProvider>
);

export default SocialFeed;
