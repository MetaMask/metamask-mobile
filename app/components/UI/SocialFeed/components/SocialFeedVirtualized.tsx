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
import useInterval from '../../../hooks/useInterval';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import { useSocialFeed } from '../data/useSocialFeed';
import { useSocialLivePrices } from '../live/SocialLivePricesContext';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
import { useSocialFeedScreenView } from '../socialFeedTracking';
import type { SocialV1FeedPost } from '../types';
import { getSocialFeedListState } from '../utils/getSocialFeedListState';
import {
  FEED_ROW_LAYOUT_TRANSITION,
  FEED_ROW_LAYOUT_TRANSITION_LOW,
  createFeedItemEntryScheduler,
} from './FeedItemEntryAnimation';
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

/** How often relative post ages ("3m ago") are recomputed. */
const AGE_TICK_MS = 60_000;

/** Skeleton rows when the device or network is constrained. */
const CONSTRAINED_SKELETON_COUNT = 2;

/** FlatList window: rows rendered up front and screens kept mounted. */
const LIST_WINDOW = {
  default: { initialNumToRender: 6, windowSize: 5 },
  low: { initialNumToRender: 4, windowSize: 3 },
} as const;

/**
 * Rows FlatList adds per render pass. A post inserted at the top leaves the
 * row that drops out of the window with a stale measurement, and the list
 * renders one extra batch past its window until the rows are re-measured, then
 * unmounts it. One row keeps that churn to a single card per insertion.
 */
const MAX_TO_RENDER_PER_BATCH = 1;

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
  scope,
  chains,
  assetIds,
  profileId,
  commentedOnly,
  location,
  analyticsSource,
  isActive,
  title,
  renderHeader,
  filterPost,
  emptyState,
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
  const [clock, setClock] = useState(() => Date.now());
  useInterval(() => setClock(Date.now()), { delay: AGE_TICK_MS });
  const scheduleEntryDelay = useMemo(() => createFeedItemEntryScheduler(), []);

  const isLowHardware = hardwareTier === 'LOW';
  const isOffline = networkTier === 'NONE';
  const listWindow = isLowHardware ? LIST_WINDOW.low : LIST_WINDOW.default;

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
    loadMore,
    error,
    refresh,
    dataUpdatedAt,
    realtime: live,
  } = useSocialFeed(query, {
    enabled: isFocused && !isOffline,
    realtime,
    paused,
    nearTop,
    holdNewPosts: networkTier === 'SLOW_CELLULAR',
    filterPost,
  });
  // A disabled query (offline, locked) reports not loading and no error.
  // That is not an empty feed; wait until a fetch has settled.
  const awaitingResult =
    dataUpdatedAt === undefined && !error && posts.length === 0;
  useSocialFeedScreenView(
    location,
    analyticsSource,
    [isLoading || awaitingResult, Boolean(error), posts.length > 0],
    isActive,
  );

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
  const lastIndex = visiblePosts.length - 1;
  const renderItem = useCallback(
    ({ item, index }: { item: SocialV1FeedPost; index: number }) => (
      <SocialFeedRow
        post={item}
        dividerTestID={
          index < lastIndex
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
        now={clock}
      />
    ),
    [
      clock,
      entrances,
      isLowHardware,
      lastIndex,
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
    <SocialFeedSurfaceProvider
      location={location}
      analyticsSource={analyticsSource}
    >
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
          maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
          windowSize={listWindow.windowSize}
          itemLayoutAnimation={
            isLowHardware
              ? FEED_ROW_LAYOUT_TRANSITION_LOW
              : FEED_ROW_LAYOUT_TRANSITION
          }
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
              emptyState={emptyState}
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
