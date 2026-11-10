import {
  Box,
  SectionDivider,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useIsFocused } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useComposedEventHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import useInterval from '../../../hooks/useInterval';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { SocialContentState } from '../../../../util/social/socialPerformance';
import { useSocialProfileId } from '../../../../util/social/useSocialProfileId';
import { useTheme } from '../../../../util/theme';
import { useSocialTabFirstContentTrace } from '../../../Views/SocialLeaderboard/SocialV1View/performance/useSocialTabFirstContentTrace';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import { useSocialFeed } from '../data/useSocialFeed';
import { useSocialLivePrices } from '../live/SocialLivePricesContext';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
import { useSocialFeedScreenView } from '../socialFeedTracking';
import type { SocialV1FeedPost } from '../types';
import {
  buildSocialFeedListItems,
  getSocialFeedListItemKey,
  type SocialFeedListItem,
} from '../utils/buildSocialFeedListItems';
import { getFeedItemId } from '../utils/feedItemId';
import { getSocialFeedListState } from '../utils/getSocialFeedListState';
import {
  FEED_ROW_LAYOUT_TRANSITION,
  FEED_ROW_LAYOUT_TRANSITION_LOW,
  createFeedItemEntryScheduler,
} from './FeedItemEntryAnimation';
import { useSocialEntryModeration } from './SocialEntryOptionsBottomSheet';
import type {
  SocialFeedInlineRow,
  SocialFeedVirtualizedProps,
} from './SocialFeed.types';
import {
  SocialFeedFooter,
  SocialFeedPlaceholder,
} from './SocialFeedListStates';
import PendingPostsButton from './SocialFeedRealtime/PendingPostsButton';
import {
  SocialFeedRealtimeContext,
  type SocialFeedRealtimeContextValue,
} from './SocialFeedRealtime/SocialFeedRealtimeContext';
import SocialFeedRow from './SocialFeedRow';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

/**
 * Extra offset, past the list header, that still counts as the top.
 * A profile header is the avatar and stats, so the posts start further down.
 */
const NEAR_TOP_OFFSET_PX = 4;

/** How often relative post ages ("3 min ago") are recomputed. */
const AGE_TICK_MS = 60_000;

/** Hold the refresh spinner for a beat so a fast refetch does not flicker. */
export const REFRESH_MIN_DURATION_MS = 1000;

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

const NO_INLINE_ROWS: readonly SocialFeedInlineRow[] = [];

interface ScrollContext extends Record<string, unknown> {
  nearTop?: boolean;
}

const waitForMinimumRefresh = () =>
  new Promise<void>((resolve) => setTimeout(resolve, REFRESH_MIN_DURATION_MS));

/** A host row, with the same divider rhythm as a post. */
const SocialFeedInlineRowItem: React.FC<{
  row: SocialFeedInlineRow;
  dividerTestID?: string;
}> = ({ row, dividerTestID }) => (
  <Box>
    {row.render()}
    {dividerTestID ? (
      <SectionDivider marginVertical={1} testID={dividerTestID} />
    ) : null}
  </Box>
);

/** Times a Social V1 tab's first content. Renders nothing. */
const SocialFeedFirstContentTrace: React.FC<
  Parameters<typeof useSocialTabFirstContentTrace>[0]
> = (options) => {
  useSocialTabFirstContentTrace(options);
  return null;
};

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
  showMockedFields,
  isActive,
  title,
  renderHeader,
  filterPost,
  emptyState,
  realtime = false,
  paused = false,
  inlineRows = NO_INLINE_ROWS,
  onRefresh,
  performance,
  onScroll,
  pageRef,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  requireSocialProfile,
  showCopyTrade,
  testID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const { profileId: viewerProfileId } = useSocialProfileId();
  const livePrices = useSocialLivePrices();
  const { isEntryHidden } = useSocialEntryModeration();
  const listRef = useRef<Animated.FlatList<SocialFeedListItem>>(null);
  const headerHeightSv = useSharedValue(0);
  const headerHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const scrollOffsetSv = useSharedValue(0);
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

  const performanceTab = performance?.tab;
  const isPerformanceEnabled = performance?.context.enabled === true;
  const fetchPerformance = useMemo(
    () =>
      performanceTab && isPerformanceEnabled
        ? { tab: performanceTab }
        : undefined,
    [isPerformanceEnabled, performanceTab],
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
    performance: fetchPerformance,
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
            commentId: post.commentId,
          }),
      ),
    [isEntryHidden, posts],
  );
  const firstPostId = visiblePosts[0]?.id;
  const previousFirstPostIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previousId = previousFirstPostIdRef.current;
    previousFirstPostIdRef.current = firstPostId;
    if (
      !realtime ||
      !nearTop ||
      !previousId ||
      !firstPostId ||
      previousId === firstPostId ||
      !visiblePosts.some((post) => post.id === previousId)
    ) {
      return;
    }
    const headerHeight = headerHeightRef.current;
    const viewportHeight = viewportHeightRef.current;
    const offset = scrollOffsetSv.value;
    const firstPostIsInView =
      headerHeight >= offset - NEAR_TOP_OFFSET_PX &&
      headerHeight < offset + viewportHeight;
    if (
      headerHeight <= 0 ||
      viewportHeight <= 0 ||
      firstPostIsInView ||
      offset > headerHeight + NEAR_TOP_OFFSET_PX
    ) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: headerHeight, animated: true });
  }, [firstPostId, nearTop, realtime, scrollOffsetSv, visiblePosts]);
  const { showSkeleton, showEmpty, showRetry } = getSocialFeedListState({
    postCount: visiblePosts.length,
    // Offline, the query is off: placeholders until a first page exists,
    // rather than claiming there are no trades.
    isLoading: isLoading || (isOffline && dataUpdatedAt === undefined),
    error,
  });
  const state = useMemo(
    () => ({ showSkeleton, showEmpty, showRetry }),
    [showEmpty, showRetry, showSkeleton],
  );

  const firstPageSettled = dataUpdatedAt !== undefined || Boolean(error);
  const showInlineRows =
    !showSkeleton && (visiblePosts.length > 0 || firstPageSettled);
  const listItems = useMemo(
    () =>
      buildSocialFeedListItems(
        visiblePosts,
        showInlineRows ? inlineRows : NO_INLINE_ROWS,
      ),
    [inlineRows, showInlineRows, visiblePosts],
  );

  const firstContentState: SocialContentState | null =
    visiblePosts.length > 0
      ? 'content'
      : error
        ? 'error'
        : !isLoading && dataUpdatedAt !== undefined
          ? 'empty'
          : null;

  const setNearTopFromScroll = useCallback((value: boolean) => {
    setNearTop(value);
  }, []);
  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      headerHeightRef.current = height;
      headerHeightSv.value = height;
      setNearTop(scrollOffsetSv.value <= height + NEAR_TOP_OFFSET_PX);
    },
    [headerHeightSv, scrollOffsetSv],
  );
  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);
  const nearTopHandler = useAnimatedScrollHandler<ScrollContext>(
    {
      onScroll: (event, context) => {
        scrollOffsetSv.value = event.contentOffset.y;
        const nextNearTop =
          event.contentOffset.y <= headerHeightSv.value + NEAR_TOP_OFFSET_PX;
        if (context.nearTop !== nextNearTop) {
          context.nearTop = nextNearTop;
          scheduleOnRN(setNearTopFromScroll, nextNearTop);
        }
      },
    },
    [headerHeightSv, scrollOffsetSv, setNearTopFromScroll],
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
      onRefresh?.();
      await Promise.all([refresh(), waitForMinimumRefresh()]);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refresh]);

  const revealPending = live?.revealPending;
  const handleRevealPending = useCallback(async () => {
    if (!revealPending) {
      return;
    }
    setNearTop(true);
    revealPending();
    listRef.current?.scrollToOffset({
      offset: headerHeightRef.current,
      animated: true,
    });
    await refresh();
  }, [refresh, revealPending]);

  const wasPausedRef = useRef(paused);
  useEffect(() => {
    if (wasPausedRef.current && !paused) {
      handleRevealPending().catch(() => undefined);
    }
    wasPausedRef.current = paused;
  }, [handleRevealPending, paused]);

  const handleScrollSettled = useCallback(() => {
    livePrices?.requestVisibilityCheck();
  }, [livePrices]);

  // Read at tap time so the row callback stays stable across socket updates.
  // A post held behind the pill (paused, or scrolled away from the top) shows
  // an older copy than the socket already sent.
  const liveRef = useRef(live);
  liveRef.current = live;
  const handlePositionPress = useMemo(
    () =>
      onPositionPress
        ? (post: SocialV1FeedPost) => {
            const current = liveRef.current;
            const feedItemId = post.position
              ? getFeedItemId(post.position)
              : undefined;
            onPositionPress(post, {
              isSnapshotLive: Boolean(
                current && feedItemId && !current.hasPendingUpdate(feedItemId),
              ),
            });
          }
        : undefined,
    [onPositionPress],
  );

  const entrances = live?.entrances;
  const lastIndex = listItems.length - 1;
  const renderItem = useCallback(
    ({ item, index }: { item: SocialFeedListItem; index: number }) => {
      const dividerTestID =
        index < lastIndex
          ? getSocialV1FeedEntryDividerTestId(
              `${location}-${getSocialFeedListItemKey(item)}`,
            )
          : undefined;
      switch (item.kind) {
        case 'post':
          return (
            <SocialFeedRow
              post={item.post}
              requireSocialTerms
              requireSocialProfile={requireSocialProfile}
              showCopyTrade={showCopyTrade}
              dividerTestID={dividerTestID}
              entrances={entrances}
              scheduleEntryDelay={scheduleEntryDelay}
              reducedMotion={isLowHardware}
              onAuthorPress={onAuthorPress}
              onCopyTrade={onCopyTrade}
              onPositionPress={handlePositionPress}
              now={clock}
              viewerProfileId={viewerProfileId}
            />
          );
        case 'inline':
          return (
            <SocialFeedInlineRowItem
              row={item.row}
              dividerTestID={dividerTestID}
            />
          );
        case 'placeholder':
          return (
            <SocialFeedPlaceholder state={state} emptyState={emptyState} />
          );
        default:
          return item satisfies never;
      }
    },
    [
      clock,
      emptyState,
      entrances,
      isLowHardware,
      lastIndex,
      location,
      onAuthorPress,
      onCopyTrade,
      handlePositionPress,
      requireSocialProfile,
      showCopyTrade,
      scheduleEntryDelay,
      state,
      viewerProfileId,
    ],
  );

  const pendingNewCount = live?.pendingNewCount ?? 0;
  const realtimeState = useMemo<SocialFeedRealtimeContextValue>(
    () => ({ paused, pendingNewCount }),
    [paused, pendingNewCount],
  );
  const header = (
    <Box onLayout={handleHeaderLayout}>
      {title ? (
        <Box twClassName="px-4">
          <Text variant={TextVariant.HeadingSm}>{title}</Text>
        </Box>
      ) : null}
      {renderHeader?.()}
    </Box>
  );

  return (
    <SocialFeedSurfaceProvider
      location={location}
      analyticsSource={analyticsSource}
      showMockedFields={showMockedFields}
    >
      <SocialFeedRealtimeContext.Provider value={realtimeState}>
        <Box
          twClassName="flex-1 bg-default"
          testID={testID}
          onLayout={handleViewportLayout}
        >
          {performance ? (
            <SocialFeedFirstContentTrace
              tab={performance.tab}
              contentState={firstContentState}
              hasUsableData={dataUpdatedAt !== undefined}
              performance={performance.context}
            />
          ) : null}
          <Animated.FlatList
            ref={listRef}
            data={listItems}
            renderItem={renderItem}
            keyExtractor={getSocialFeedListItemKey}
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
              <RefreshControl
                colors={[colors.primary.default]}
                tintColor={colors.icon.default}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
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
          <Box
            pointerEvents="box-none"
            twClassName="absolute top-5 left-0 right-0 items-center"
          >
            <PendingPostsButton
              pendingNewCount={pendingNewCount}
              onPress={handleRevealPending}
            />
          </Box>
        </Box>
      </SocialFeedRealtimeContext.Provider>
    </SocialFeedSurfaceProvider>
  );
};

export default SocialFeedVirtualized;
