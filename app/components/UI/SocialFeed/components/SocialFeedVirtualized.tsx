import {
  Box,
  SectionDivider,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useIsFocused } from '@react-navigation/native';
import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
  type ListRenderItemInfo,
} from '@shopify/flash-list';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, type View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { SocialContentState } from '../../../../util/social/socialPerformance';
import { useSocialProfileId } from '../../../../util/social/useSocialProfileId';
import { useTheme } from '../../../../util/theme';
import { usePendingPostsOverlay } from '../../../Views/SocialLeaderboard/pendingPosts/usePendingPostsOverlay';
import { useSocialTabFirstContentTrace } from '../../../Views/SocialLeaderboard/SocialV1View/performance/useSocialTabFirstContentTrace';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import { SOCIAL_FEED_REVEAL_BATCH_SIZE } from '../data/socialFeedRealtime';
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
  createFeedItemEntryScheduler,
  FEED_ITEM_ENTRY_DURATION_MS,
  FEED_ROW_SLIDE_MS_LOW,
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

/** Scroll offset under which the list counts as at the top. */
const NEAR_TOP_OFFSET_PX = 4;

/** Hold the refresh spinner for a beat so a fast refetch does not flicker. */
export const REFRESH_MIN_DURATION_MS = 1000;

/** Skeleton rows when the device or network is constrained. */
const CONSTRAINED_SKELETON_COUNT = 2;

const LIST_DRAW_DISTANCE = {
  default: 400,
  low: 200,
} as const;

const MAINTAIN_VISIBLE_CONTENT_POSITION = { disabled: true } as const;

const FeedCellSlideDurationContext = createContext(FEED_ITEM_ENTRY_DURATION_MS);

export const shouldSlideFeedCell = (
  indexDelta: number,
  topDelta: number,
): boolean => indexDelta <= SOCIAL_FEED_REVEAL_BATCH_SIZE && topDelta > 0.5;

const FeedFlashListCell = React.forwardRef<
  View,
  React.PropsWithChildren<{ index: number; style?: ViewStyle }>
>(({ index, style, children, ...rest }, ref) => {
  const duration = useContext(FeedCellSlideDurationContext);
  const { top: layoutTop, ...cellStyle } = style ?? {};
  const targetTop = typeof layoutTop === 'number' ? layoutTop : 0;
  const top = useSharedValue(targetTop);
  const placedRef = useRef(false);
  const previousIndexRef = useRef(index);

  useLayoutEffect(() => {
    const indexDelta = Math.abs(index - previousIndexRef.current);
    const topDelta = Math.abs(targetTop - top.value);
    previousIndexRef.current = index;
    if (!placedRef.current) {
      placedRef.current = true;
      top.value = targetTop;
      return;
    }
    top.value = shouldSlideFeedCell(indexDelta, topDelta)
      ? withSpring(targetTop, { duration, dampingRatio: 1 })
      : targetTop;
  }, [duration, index, targetTop, top]);

  const animatedPosition = useAnimatedStyle(() => ({ top: top.value }));

  return (
    <Animated.View ref={ref} {...rest} style={[cellStyle, animatedPosition]}>
      {children}
    </Animated.View>
  );
});

FeedFlashListCell.displayName = 'FeedFlashListCell';

const NO_INLINE_ROWS: readonly SocialFeedInlineRow[] = [];
const NO_LIST_ITEMS: SocialFeedListItem[] = [];

type SocialFeedFlashListProps = FlashListProps<SocialFeedListItem> & {
  ref?: React.Ref<FlashListRef<SocialFeedListItem>>;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<SocialFeedFlashListProps>,
) as unknown as React.ComponentType<SocialFeedFlashListProps>;

export const getSocialFeedListItemType = (item: SocialFeedListItem): string => {
  switch (item.kind) {
    case 'post':
      return `post-${item.post.item.variant}`;
    case 'inline':
      return `inline-${item.row.key}`;
    case 'placeholder':
      return 'placeholder';
    default:
      return item satisfies never;
  }
};

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
  analyticsEnabled,
  showMockedFields,
  isActive,
  title,
  renderHeader,
  renderFooter,
  filterPost,
  emptyState,
  realtime = false,
  paused = false,
  pendingPostsSurface,
  comparePosts,
  inlineRows = NO_INLINE_ROWS,
  onRefresh,
  onListStateChange,
  performance,
  onScroll,
  enabled = true,
  refreshProgressViewOffset,
  pageRef,
  onAuthorPress,
  onCopyTrade,
  onPositionPress,
  requireSocialProfile,
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
  const listRef = useRef<FlashListRef<SocialFeedListItem>>(null);
  const [nearTop, setNearTop] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scheduleEntryDelay = useMemo(() => createFeedItemEntryScheduler(), []);

  const isLowHardware = hardwareTier === 'LOW';
  const isOffline = networkTier === 'NONE';
  const drawDistance = isLowHardware
    ? LIST_DRAW_DISTANCE.low
    : LIST_DRAW_DISTANCE.default;

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
    enabled: isFocused && !isOffline && enabled,
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

  // The socket brings the post in, so this feed never polls for it. A feed
  // without a pending surface passes its posts through (Following pins none).
  const pendingOverlay = usePendingPostsOverlay({
    surface: pendingPostsSurface ?? 'following',
    ownerProfileId: pendingPostsSurface ? viewerProfileId : undefined,
    serverPosts: posts,
    refetch: refresh,
    isActive,
    refetchUntilServed: false,
  });
  const { pinnedPosts, refresh: refreshWithPendingPosts } = pendingOverlay;
  const overlaidPosts = pendingOverlay.posts;
  // Pinned posts stay on top; only the feed's own posts are reordered.
  const visiblePosts = useMemo(() => {
    const isShown = (post: SocialV1FeedPost) =>
      !isEntryHidden({
        postId: post.id,
        authorId: post.item.author.id,
        authorHandle: post.authorHandle,
        commentId: post.commentId,
      });
    const shownPinned = (
      filterPost ? pinnedPosts.filter(filterPost) : pinnedPosts
    ).filter(isShown);
    const shown = overlaidPosts.filter(isShown);
    return [
      ...shownPinned,
      ...(comparePosts ? shown.sort(comparePosts) : shown),
    ];
  }, [comparePosts, filterPost, isEntryHidden, overlaidPosts, pinnedPosts]);
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
  useEffect(() => {
    onListStateChange?.(state);
  }, [onListStateChange, state]);

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
      onRefresh?.();
      await Promise.all([
        enabled ? refreshWithPendingPosts() : undefined,
        waitForMinimumRefresh(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, onRefresh, refreshWithPendingPosts]);

  const revealPending = live?.revealPending;
  const handleRevealPending = useCallback(async () => {
    if (!revealPending) {
      return;
    }
    setNearTop(true);
    revealPending();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
    ({ item, index }: ListRenderItemInfo<SocialFeedListItem>) => {
      const itemKey = getSocialFeedListItemKey(item);
      const dividerTestID =
        index < lastIndex
          ? getSocialV1FeedEntryDividerTestId(`${location}-${itemKey}`)
          : undefined;
      switch (item.kind) {
        case 'post':
          return (
            <SocialFeedRow
              post={item.post}
              requireSocialTerms
              requireSocialProfile={requireSocialProfile}
              dividerTestID={dividerTestID}
              entrances={entrances}
              scheduleEntryDelay={scheduleEntryDelay}
              reducedMotion={isLowHardware}
              onAuthorPress={onAuthorPress}
              onCopyTrade={onCopyTrade}
              onPositionPress={handlePositionPress}
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
      emptyState,
      entrances,
      isLowHardware,
      lastIndex,
      location,
      onAuthorPress,
      onCopyTrade,
      handlePositionPress,
      requireSocialProfile,
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
    <>
      {title ? (
        <Box twClassName="px-4">
          <Text variant={TextVariant.HeadingSm}>{title}</Text>
        </Box>
      ) : null}
      {renderHeader?.()}
    </>
  );

  return (
    <SocialFeedSurfaceProvider
      location={location}
      analyticsSource={analyticsSource}
      analyticsEnabled={analyticsEnabled}
      showMockedFields={showMockedFields}
    >
      <SocialFeedRealtimeContext.Provider value={realtimeState}>
        <Box twClassName="flex-1 bg-default" testID={testID}>
          {performance ? (
            <SocialFeedFirstContentTrace
              tab={performance.tab}
              contentState={firstContentState}
              hasUsableData={dataUpdatedAt !== undefined}
              performance={performance.context}
            />
          ) : null}
          <FeedCellSlideDurationContext.Provider
            value={
              isLowHardware
                ? FEED_ROW_SLIDE_MS_LOW
                : FEED_ITEM_ENTRY_DURATION_MS
            }
          >
            <AnimatedFlashList
              ref={listRef}
              data={enabled ? listItems : NO_LIST_ITEMS}
              renderItem={renderItem}
              keyExtractor={getSocialFeedListItemKey}
              CellRendererComponent={FeedFlashListCell}
              getItemType={getSocialFeedListItemType}
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style('flex-grow pb-8')}
              showsVerticalScrollIndicator={false}
              drawDistance={drawDistance}
              maintainVisibleContentPosition={MAINTAIN_VISIBLE_CONTENT_POSITION}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleScrollSettled}
              onScrollEndDrag={handleScrollSettled}
              onEndReached={enabled ? loadMore : undefined}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  colors={[colors.primary.default]}
                  tintColor={colors.icon.default}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  progressViewOffset={refreshProgressViewOffset}
                />
              }
              ListHeaderComponent={header}
              ListEmptyComponent={
                enabled ? (
                  <SocialFeedPlaceholder
                    state={state}
                    skeletonCount={
                      isLowHardware || isOffline
                        ? CONSTRAINED_SKELETON_COUNT
                        : undefined
                    }
                    emptyState={emptyState}
                  />
                ) : null
              }
              ListFooterComponent={
                enabled || renderFooter ? (
                  <>
                    {enabled ? (
                      <SocialFeedFooter
                        state={state}
                        isFetchingNextPage={isFetchingNextPage}
                        onRetry={() => refresh()}
                      />
                    ) : null}
                    {renderFooter?.()}
                  </>
                ) : null
              }
              testID={scrollTestID}
            />
          </FeedCellSlideDurationContext.Provider>
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
