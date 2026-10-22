import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import {
  Box,
  BoxAlignItems,
  ButtonBase,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  type ScrollHandlerProcessed,
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSocialEntryModeration } from './SocialEntryOptionsBottomSheet';
import SocialFeedEmpty from './SocialFeedEmpty';
import SocialFeedError from './SocialFeedError';
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from './SocialFeedPostShell';
import {
  SocialFeedSurfaceProvider,
  type SocialSurfaceLocation,
} from '../SocialFeedSurface';
import type { SocialFeedPageHandle, SocialV1FeedPost } from '../types';
import FeedItemEntryAnimation, {
  createFeedItemEntryScheduler,
} from '../../../Views/SocialLeaderboard/FeedView/components/FeedItemEntryAnimation';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  useSocialFeedCanonical,
  type SocialFeedScope,
} from '../data/useSocialFeedCanonical';
import {
  useSocialFeedEntranceEventId,
  type SocialFeedEntrances,
} from '../data/socialFeedEntrances';
import SocialFeedSkeleton, {
  SOCIAL_FEED_SKELETON_DEFAULT_COUNT,
} from './SocialFeedSkeleton';

export type SocialFeedCanonicalScope = SocialFeedScope;

export interface SocialFeedCanonicalFilters {
  assetClass?: 'all' | 'tokens' | 'perps' | 'predictions';
  verification?: 'all' | 'verified' | 'unverified';
  networks?: readonly CaipChainId[];
  caipAssetType?: CaipAssetType;
  profileId?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume24h?: number;
  maxVolume24h?: number;
}

export type SocialFeedCanonicalScrollHandler = ScrollHandlerProcessed;

export interface SocialFeedCanonicalHeaderProps {
  pendingNewCount: number;
  onRevealPending: () => void;
}

export interface SocialFeedCanonicalProps {
  scope: SocialFeedCanonicalScope;
  scrollMode: 'content' | 'virtualized';
  realtime?: boolean;
  paused?: boolean;
  filters?: SocialFeedCanonicalFilters;
  renderHeader?: (props: SocialFeedCanonicalHeaderProps) => React.ReactNode;
  location?: SocialSurfaceLocation;
  onScroll?: SocialFeedCanonicalScrollHandler;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  onPositionPress?: (post: SocialV1FeedPost) => void;
  testID?: string;
  scrollTestID?: string;
}

interface ScrollContext extends Record<string, unknown> {
  nearTop?: boolean;
}

interface CanonicalRowProps {
  entrances: SocialFeedEntrances;
  isFirst: boolean;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  onPositionPress?: (post: SocialV1FeedPost) => void;
  post: SocialV1FeedPost;
  scheduleEntryDelay: () => number;
}

const areReactionsEqual = (
  previous: SocialV1FeedPost['reactions'],
  next: SocialV1FeedPost['reactions'],
): boolean =>
  previous.length === next.length &&
  previous.every(
    (reaction, index) =>
      reaction.emotion === next[index]?.emotion &&
      reaction.count === next[index]?.count,
  );

const areCanonicalRowPropsEqual = (
  previous: CanonicalRowProps,
  next: CanonicalRowProps,
): boolean =>
  previous.entrances === next.entrances &&
  previous.isFirst === next.isFirst &&
  previous.onAuthorPress === next.onAuthorPress &&
  previous.onCopyTrade === next.onCopyTrade &&
  previous.onPositionPress === next.onPositionPress &&
  previous.scheduleEntryDelay === next.scheduleEntryDelay &&
  previous.post.id === next.post.id &&
  previous.post.realtimeEventId === next.post.realtimeEventId &&
  previous.post.authorHandle === next.post.authorHandle &&
  previous.post.authorImageUrl === next.post.authorImageUrl &&
  previous.post.timestampMs === next.post.timestampMs &&
  previous.post.commentId === next.post.commentId &&
  previous.post.copyCount === next.post.copyCount &&
  previous.post.gifUri === next.post.gifUri &&
  previous.post.userReaction === next.post.userReaction &&
  areReactionsEqual(previous.post.reactions, next.post.reactions) &&
  previous.post.item.timestamp === next.post.item.timestamp;

const CanonicalRow = React.memo(
  ({
    entrances,
    isFirst,
    onAuthorPress,
    onCopyTrade,
    onPositionPress,
    post,
    scheduleEntryDelay,
  }: CanonicalRowProps) => {
    const eventId = useSocialFeedEntranceEventId(
      entrances,
      post.realtimeEventId,
    );
    return (
      <FeedItemEntryAnimation
        eventId={eventId}
        scheduleEntryDelay={scheduleEntryDelay}
        onAnimationComplete={entrances.markPlayed}
      >
        <>
          {!isFirst ? <Box twClassName="h-px bg-muted" /> : null}
          <Box twClassName="px-4">
            <SocialFeedPostShell
              post={post}
              onAuthorPress={onAuthorPress}
              onCopyTrade={onCopyTrade}
              onPositionPress={post.position ? onPositionPress : undefined}
            />
          </Box>
        </>
      </FeedItemEntryAnimation>
    );
  },
  areCanonicalRowPropsEqual,
);

const LOAD_MORE_THRESHOLD_PX = 600;
const VISIBILITY_CHECK_MS = 400;
const styles = StyleSheet.create({
  sentinel: {
    height: 1,
  },
});

const ContentLoadMoreSentinel: React.FC<{
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

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    check();
    const interval = setInterval(check, VISIBILITY_CHECK_MS);
    return () => clearInterval(interval);
  }, [check, enabled]);

  if (!enabled) {
    return null;
  }

  return <View ref={ref} collapsable={false} style={styles.sentinel} />;
};

/**
 * Canonical Social feed component.
 *
 * Every feed call site should eventually migrate to this component. It is
 * deliberately scope- and host-agnostic: callers choose the feed scope,
 * scroll ownership, filters, and navigation callbacks while this component
 * owns feed data, pagination, realtime updates, row identity, and feed states.
 */
const SocialFeedCanonical: React.FC<SocialFeedCanonicalProps> = ({
  scope,
  scrollMode,
  realtime = false,
  paused = false,
  location = 'social_feed_screen',
  renderHeader,
  onScroll,
  pageRef,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  testID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const listRef = useRef<Animated.FlatList<SocialV1FeedPost>>(null);
  const [nearTop, setNearTop] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scheduleEntryDelay = useMemo(() => createFeedItemEntryScheduler(), []);
  const { isEntryHidden } = useSocialEntryModeration();

  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
    entrances,
    pendingNewCount,
    revealPending,
  } = useSocialFeedCanonical({
    nearTop,
    paused,
    realtime,
    scope,
  });

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
  const showInitialLoading = isLoading && visiblePosts.length === 0 && !error;
  const skeletonCount =
    hardwareTier === 'LOW' || networkTier === 'NONE'
      ? 2
      : SOCIAL_FEED_SKELETON_DEFAULT_COUNT;

  const setNearTopFromScroll = useCallback((value: boolean) => {
    setNearTop(value);
  }, []);

  const scrollHandler = useAnimatedScrollHandler<ScrollContext>(
    {
      onScroll: (event, context) => {
        const nextNearTop = event.contentOffset.y <= 4;
        if (context.nearTop !== nextNearTop) {
          context.nearTop = nextNearTop;
          scheduleOnRN(setNearTopFromScroll, nextNearTop);
        }
      },
    },
    [setNearTopFromScroll],
  );
  const composedScrollHandler = useComposedEventHandler([
    onScroll ?? null,
    scrollHandler,
  ]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        listRef.current?.scrollToOffset({ offset, animated });
      },
    }),
    [],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleRevealPending = useCallback(async () => {
    setNearTop(true);
    revealPending();
    await refresh();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refresh, revealPending]);

  const renderItem = useCallback(
    ({ item, index }: { item: SocialV1FeedPost; index: number }) => (
      <CanonicalRow
        entrances={entrances}
        isFirst={index === 0}
        onAuthorPress={onAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={onPositionPress}
        post={item}
        scheduleEntryDelay={scheduleEntryDelay}
      />
    ),
    [
      entrances,
      onAuthorPress,
      onCopyTrade,
      onPositionPress,
      scheduleEntryDelay,
    ],
  );

  const renderContentRows = useMemo(
    () =>
      visiblePosts.map((post, index) => (
        <CanonicalRow
          key={post.id}
          entrances={entrances}
          isFirst={index === 0}
          onAuthorPress={onAuthorPress}
          onCopyTrade={onCopyTrade}
          onPositionPress={onPositionPress}
          post={post}
          scheduleEntryDelay={scheduleEntryDelay}
        />
      )),
    [
      entrances,
      onAuthorPress,
      onCopyTrade,
      onPositionPress,
      scheduleEntryDelay,
      visiblePosts,
    ],
  );

  const pendingHeader =
    pendingNewCount > 0 ? (
      <Box alignItems={BoxAlignItems.Center} twClassName="py-2">
        <ButtonBase size={ButtonBaseSize.Sm} onPress={handleRevealPending}>
          {pendingNewCount > 60
            ? '60+ new posts'
            : `${pendingNewCount} new post${pendingNewCount === 1 ? '' : 's'}`}
        </ButtonBase>
      </Box>
    ) : null;
  const customHeader = renderHeader?.({
    pendingNewCount,
    onRevealPending: handleRevealPending,
  });

  return (
    <SocialFeedSurfaceProvider location={location}>
      <Box twClassName="flex-1 bg-default" testID={testID}>
        {scrollMode === 'virtualized' ? (
          <Animated.FlatList
            ref={listRef}
            data={visiblePosts}
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('flex-grow pb-8')}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            onScroll={composedScrollHandler}
            scrollEventThrottle={16}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            testID={scrollTestID}
            ListHeaderComponent={
              renderHeader ? customHeader : <>{pendingHeader}</>
            }
            ListEmptyComponent={
              showInitialLoading ? (
                <SocialFeedSkeleton count={skeletonCount} />
              ) : isLoading ? null : (
                <SocialFeedEmpty />
              )
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <Box alignItems={BoxAlignItems.Center} twClassName="py-4">
                  <ActivityIndicator />
                </Box>
              ) : error && posts.length === 0 ? (
                <SocialFeedError onRetry={refresh} />
              ) : null
            }
            renderItem={renderItem}
            keyExtractor={(item) => item.position?.positionId ?? item.id}
          />
        ) : (
          <Box twClassName="pb-8">
            {renderHeader ? customHeader : pendingHeader}
            {showInitialLoading ? (
              <SocialFeedSkeleton count={skeletonCount} />
            ) : null}
            {visiblePosts.length > 0 ? renderContentRows : null}
            {!isLoading && visiblePosts.length === 0 ? (
              <SocialFeedEmpty />
            ) : null}
            {error && posts.length === 0 ? (
              <SocialFeedError onRetry={refresh} />
            ) : null}
            {isFetchingNextPage ? (
              <Box alignItems={BoxAlignItems.Center} twClassName="py-4">
                <ActivityIndicator />
              </Box>
            ) : null}
            <ContentLoadMoreSentinel
              enabled={hasNextPage && !isFetchingNextPage}
              onVisible={loadMore}
            />
          </Box>
        )}
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default SocialFeedCanonical;
