import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import { useSocialFeed } from '../data/useSocialFeed';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
import { useSocialFeedScreenView } from '../socialFeedTracking';
import type { SocialV1FeedPost } from '../types';
import { getSocialFeedListState } from '../utils/getSocialFeedListState';
import type { SocialFeedContentProps } from './SocialFeed.types';
import {
  SocialFeedFooter,
  SocialFeedPlaceholder,
} from './SocialFeedListStates';
import SocialFeedPostShell from './SocialFeedPostShell';
import { SOCIAL_FEED_SENTINEL_TEST_ID } from './SocialFeedStates.testIds';
import SocialV1FeedPostList from './SocialV1FeedPostList';

/** How far past the screen a footer may sit and still count as reached. */
const LOAD_MORE_THRESHOLD_PX = 600;

/** How often a mounted feed checks whether its footer has scrolled into view. */
const VISIBILITY_CHECK_MS = 400;

const styles = StyleSheet.create({
  // An empty view measures as height 0, and the visibility check ignores that,
  // so the footer would never ask for another page. One pixel is enough to
  // measure, and `collapsable={false}` stops Android from dropping the view.
  sentinel: {
    height: 1,
  },
});

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

/**
 * Infinite social feed rendered inside the host's scroll: skeleton, error,
 * "No trades yet", then every loaded page. Invented values stay hidden unless
 * an outer surface has opted into them.
 */
const SocialFeedContent: React.FC<SocialFeedContentProps> = ({
  scope,
  chains,
  assetIds,
  profileId,
  commentedOnly,
  location,
  analyticsSource,
  showMockedFields,
  isActive,
  title,
  renderHeader,
  filterPost,
  emptyState,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  testID,
}) => {
  const query = useMemo(
    (): SocialFeedQuery => ({
      scope,
      chains,
      assetIds,
      profileId,
      commentedOnly,
    }),
    [assetIds, chains, commentedOnly, profileId, scope],
  );
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialFeed(query, { filterPost });
  const state = getSocialFeedListState({
    postCount: posts.length,
    isLoading,
    error,
  });
  useSocialFeedScreenView(
    location,
    analyticsSource,
    [isLoading, Boolean(error), posts.length > 0],
    isActive,
  );

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostShell
        post={post}
        onAuthorPress={onAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={post.position ? onPositionPress : undefined}
      />
    ),
    [onAuthorPress, onCopyTrade, onPositionPress],
  );

  return (
    <SocialFeedSurfaceProvider
      location={location}
      analyticsSource={analyticsSource}
      showMockedFields={showMockedFields}
    >
      <Box twClassName="gap-4" testID={testID}>
        {title ? <Text variant={TextVariant.HeadingSm}>{title}</Text> : null}
        {renderHeader?.()}
        <SocialFeedPlaceholder state={state} emptyState={emptyState} />
        {posts.length > 0 ? (
          <SocialV1FeedPostList
            posts={posts}
            dividerKeyPrefix={location}
            renderPost={renderPost}
          />
        ) : null}
        <SocialFeedFooter
          state={state}
          isFetchingNextPage={isFetchingNextPage}
          onRetry={() => refresh()}
        />
        <LoadMoreSentinel
          enabled={hasNextPage && !isFetchingNextPage}
          onVisible={loadMore}
        />
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default SocialFeedContent;
