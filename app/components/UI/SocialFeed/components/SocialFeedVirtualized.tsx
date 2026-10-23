import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useIsFocused } from '@react-navigation/native';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useSocialFeed } from '../data/useSocialFeed';
import { useSocialLivePrices } from '../live/SocialLivePricesContext';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
import type { SocialV1FeedPost } from '../types';
import { getSocialFeedListState } from '../utils/getSocialFeedListState';
import { createFeedItemEntryScheduler } from './FeedItemEntryAnimation';
import { useSocialEntryModeration } from './SocialEntryOptionsBottomSheet';
import type { SocialFeedVirtualizedProps } from './SocialFeed.types';
import {
  SocialFeedFooter,
  SocialFeedPlaceholder,
} from './SocialFeedListStates';
import SocialFeedRow from './SocialFeedRow';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

/** Scroll offset under which the list counts as at the top. */
const NEAR_TOP_OFFSET_PX = 4;

/** Skeleton rows when the device or network is constrained. */
const CONSTRAINED_SKELETON_COUNT = 2;

/** FlatList window: rows rendered up front and screens kept mounted. */
const LIST_WINDOW = {
  default: { initialNumToRender: 6, windowSize: 5 },
  low: { initialNumToRender: 4, windowSize: 3 },
} as const;

interface ScrollContext extends Record<string, unknown> {
  nearTop?: boolean;
}

const noop = () => undefined;

const keyExtractor = (post: SocialV1FeedPost) =>
  post.position?.positionId ?? post.id;

/**
 * The feed as its own virtualized list, for full-screen tabs. Fetches only
 * while focused and online, streams posts in when `realtime` is set, and
 * scales its render window and entrances to the device.
 */
const SocialFeedVirtualized: React.FC<SocialFeedVirtualizedProps> = ({
  source,
  location,
  title,
  renderHeader,
  filterPost,
  realtime = false,
  paused = false,
  onScroll,
  pageRef,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  testID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const livePrices = useSocialLivePrices();
  const { isEntryHidden } = useSocialEntryModeration();
  const listRef = useRef<Animated.FlatList<SocialV1FeedPost>>(null);
  const [nearTop, setNearTop] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scheduleEntryDelay = useMemo(() => createFeedItemEntryScheduler(), []);

  const isLowHardware = hardwareTier === 'LOW';
  const isOffline = networkTier === 'NONE';
  const listWindow = isLowHardware ? LIST_WINDOW.low : LIST_WINDOW.default;

  const {
    posts,
    isLoading,
    isFetchingNextPage,
    loadMore,
    error,
    refresh,
    dataUpdatedAt,
    realtime: live,
  } = useSocialFeed(source, {
    enabled: isFocused && !isOffline,
    realtime,
    paused,
    nearTop,
    holdNewPosts: networkTier === 'SLOW_CELLULAR',
    filterPost,
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
  const state = getSocialFeedListState({
    postCount: visiblePosts.length,
    // Offline, the query is off: placeholders until a first page exists,
    // rather than claiming there are no trades.
    isLoading: isLoading || (isOffline && dataUpdatedAt === undefined),
    error,
  });

  const setNearTopFromScroll = useCallback((value: boolean) => {
    setNearTop(value);
  }, []);
  const nearTopHandler = useAnimatedScrollHandler<ScrollContext>(
    {
      onScroll: (event, context) => {
        const nextNearTop = event.contentOffset.y <= NEAR_TOP_OFFSET_PX;
        if (context.nearTop !== nextNearTop) {
          context.nearTop = nextNearTop;
          scheduleOnRN(setNearTopFromScroll, nextNearTop);
        }
      },
    },
    [setNearTopFromScroll],
  );
  const scrollHandler = useComposedEventHandler([
    onScroll ?? null,
    nearTopHandler,
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

  const revealPending = live?.revealPending;
  const handleRevealPending = useCallback(async () => {
    if (!revealPending) {
      return;
    }
    setNearTop(true);
    revealPending();
    await refresh();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refresh, revealPending]);

  const handleScrollSettled = useCallback(() => {
    livePrices?.requestVisibilityCheck();
  }, [livePrices]);

  const entrances = live?.entrances;
  const renderItem = useCallback(
    ({ item, index }: { item: SocialV1FeedPost; index: number }) => (
      <SocialFeedRow
        post={item}
        dividerTestID={
          index > 0
            ? getSocialV1FeedEntryDividerTestId(
                `${location}-${keyExtractor(item)}`,
              )
            : undefined
        }
        entrances={entrances}
        scheduleEntryDelay={scheduleEntryDelay}
        reducedMotion={isLowHardware}
        onAuthorPress={onAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={onPositionPress}
      />
    ),
    [
      entrances,
      isLowHardware,
      location,
      onAuthorPress,
      onCopyTrade,
      onPositionPress,
      scheduleEntryDelay,
    ],
  );

  const pendingNewCount = live?.pendingNewCount ?? 0;
  const header = (
    <>
      {title ? (
        <Box twClassName="px-4">
          <Text variant={TextVariant.HeadingSm}>{title}</Text>
        </Box>
      ) : null}
      {renderHeader?.({
        pendingNewCount,
        onRevealPending: live ? handleRevealPending : noop,
      })}
    </>
  );

  return (
    <SocialFeedSurfaceProvider location={location}>
      <Box twClassName="flex-1 bg-default" testID={testID}>
        <Animated.FlatList
          ref={listRef}
          data={visiblePosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow pb-8')}
          showsVerticalScrollIndicator={false}
          initialNumToRender={listWindow.initialNumToRender}
          maxToRenderPerBatch={listWindow.initialNumToRender}
          windowSize={listWindow.windowSize}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollSettled}
          onScrollEndDrag={handleScrollSettled}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={header}
          ListEmptyComponent={
            <SocialFeedPlaceholder
              state={state}
              skeletonCount={
                isLowHardware || isOffline
                  ? CONSTRAINED_SKELETON_COUNT
                  : undefined
              }
            />
          }
          ListFooterComponent={
            <SocialFeedFooter
              state={state}
              isFetchingNextPage={isFetchingNextPage}
              onRetry={() => refresh()}
            />
          }
          testID={scrollTestID}
        />
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default SocialFeedVirtualized;
