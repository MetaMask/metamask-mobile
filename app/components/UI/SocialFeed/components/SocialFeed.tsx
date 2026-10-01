import {
  Box,
  BoxAlignItems,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useSocialFeed } from '../data/useSocialFeed';
import type { SocialFeedSource } from '../data/socialFeedSource';
import {
  SocialFeedSurfaceProvider,
  type SocialFeedLocation,
} from '../SocialFeedSurface';
import type { SocialV1FeedPost } from '../types';
import SocialFeedEmpty from './SocialFeedEmpty';
import SocialFeedError from './SocialFeedError';
import SocialFeedPostShell from './SocialFeedPostShell';
import SocialFeedSkeleton from './SocialFeedSkeleton';
import SocialV1FeedPostList from './SocialV1FeedPostList';

/** How far past the screen a footer may sit and still count as reached. */
const LOAD_MORE_THRESHOLD_PX = 600;

/** How often a mounted feed checks whether its footer has scrolled into view. */
const VISIBILITY_CHECK_MS = 400;

export const SOCIAL_FEED_NEXT_PAGE_TEST_ID = 'social-feed-next-page';
export const SOCIAL_FEED_SENTINEL_TEST_ID = 'social-feed-sentinel';

export interface SocialFeedProps {
  /** Which slice to load. The component fetches it; the host does not. */
  source: SocialFeedSource;
  /** Where this feed is shown. Stored for later analytics. */
  location: SocialFeedLocation;
  /** Optional heading above the posts. */
  title?: string;
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
    <View ref={ref} onLayout={check} testID={SOCIAL_FEED_SENTINEL_TEST_ID} />
  );
};

const renderPost = (post: SocialV1FeedPost) => (
  <SocialFeedPostShell post={post} />
);

/**
 * Infinite social feed for one source. Renders inside the host's scroll:
 * skeleton, error, "No trades yet", then every loaded page. Invented values
 * stay hidden unless an outer surface has opted into them.
 */
const SocialFeed: React.FC<SocialFeedProps> = ({ source, location, title }) => {
  const enabled = useSelector(selectSocialLeaderboardEnabled);
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialFeed(enabled ? source : null);

  if (!enabled) {
    return null;
  }

  const showSkeleton = isLoading && posts.length === 0;
  const showEmpty = !isLoading && !error && posts.length === 0;
  const showError = Boolean(error) && posts.length === 0;

  return (
    <SocialFeedSurfaceProvider location={location}>
      <Box twClassName="gap-4">
        {title ? <Text variant={TextVariant.HeadingSm}>{title}</Text> : null}
        {showSkeleton ? <SocialFeedSkeleton /> : null}
        {posts.length > 0 ? (
          <SocialV1FeedPostList
            posts={posts}
            dividerKeyPrefix={location}
            renderPost={renderPost}
          />
        ) : null}
        {showEmpty ? <SocialFeedEmpty /> : null}
        {showError ? <SocialFeedError onRetry={() => refresh()} /> : null}
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

export default SocialFeed;
