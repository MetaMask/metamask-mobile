import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import { type QuickBuyTarget } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import { useMyProfile } from '../MyProfileView/hooks';
import { useSocialFeedPostNavigation } from '../hooks/useSocialFeedPostNavigation';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedError from '../../../UI/SocialFeed/components/SocialFeedError';
import SocialFeedSkeleton from '../../../UI/SocialFeed/components/SocialFeedSkeleton';
import { useSocialLivePrices } from '../../../UI/SocialFeed/live/SocialLivePricesContext';
import SocialV1FeedPostList from '../../../UI/SocialFeed/components/SocialV1FeedPostList';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialFilterEmptyState from '../shared/SocialFilterEmptyState';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import {
  DEFAULT_FEED_SORT,
  FeedSortFilterSelector,
  FeedSortFilterSheet,
  type FeedSort,
} from '../components/Filters';
import { useSocialEntryModeration } from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import SocialTabFilterBar from './filters/SocialTabFilterBar';
import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { DEFAULT_FILTERS } from './filters/filterDefaults';
import { filterSocialV1FeedPosts } from './filters/filterSocialV1FeedPosts';
import type { SocialShellFilters } from './filters/types';
import type { SocialV1FeedTab } from '../SocialV1View/feed/types';
import { chainNameToId } from '../../../UI/SocialFeed/utils/chainMapping';
import {
  SocialEvent,
  type SocialEventSource,
  useSocialScreenAnalytics,
} from '../analytics';
import {
  SOCIAL_TRACE_TABS,
  type SocialPerformanceContext,
} from '../../../../util/social/socialPerformance';
import { useSocialTabFirstContentTrace } from '../SocialV1View/performance/useSocialTabFirstContentTrace';

const { FeedSort, Filter, Interaction, Screen, Tab } = SocialEvent;

export const SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID =
  'social-v1-feed-footer-loading';

/**
 * Hold the refresh spinner for a beat so a fast refetch does not flicker.
 * Matches V0's feed.
 */
const REFRESH_MIN_DURATION_MS = 1000;

/**
 * How close to the bottom a settled scroll must land to pull the next page.
 * Generous because this fires on scroll end rather than continuously.
 */
const END_REACHED_THRESHOLD_PX = 600;

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export type SocialFeedShellTab = SocialV1FeedTab;

const FEED_TRACE_TABS = {
  trending: SOCIAL_TRACE_TABS.Trending,
  following: SOCIAL_TRACE_TABS.Following,
} as const satisfies Record<SocialFeedShellTab, 'trending' | 'following'>;

export interface EmptyShellTabPageProps {
  tab: SocialFeedShellTab;
  source?: SocialEventSource;
  /**
   * The pager mounts every page up front. Hold the mock list back until the
   * tab is first opened so Trending and Following don't duplicate testIDs.
   */
  isActive?: boolean;
  performance?: SocialPerformanceContext;
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
  scrollTestID: string;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  /** Clears the applied Following filters. */
  onClearFilters?: () => void;
  appliedFilters?: SocialShellFilters;
  /**
   * Requests the spot QuickBuy sheet for a copy-traded post. The sheet is
   * hosted by the parent view, outside the pager — see `SocialV1View`.
   * `copyTradeOrigin` is set when the post has a comment to attribute to.
   */
  onQuickBuy?: (
    target: QuickBuyTarget,
    copyTradeOrigin?: CopyTradeOrigin,
  ) => void;
}

/**
 * Social Bundle V1 Trending / Following page: mocked position cards until the
 * API supplies post/comment fields. Following also pins the viewer's own new
 * posts until the feed returns them.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  tab,
  source,
  isActive = true,
  performance,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
  onOpenFilters,
  isFilterActive = false,
  onClearFilters,
  appliedFilters = DEFAULT_FILTERS,
  onQuickBuy,
}) => {
  const tw = useTailwind();
  const { profile: myProfile } = useMyProfile();
  const {
    onAuthorPress: handleAuthorPress,
    onPositionPress: handlePositionPress,
  } = useSocialFeedPostNavigation();
  const livePrices = useSocialLivePrices();
  const scrollRef = useRef<ScrollView>(null);
  const {
    posts,
    pinnedPosts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
    dataUpdatedAt,
  } = useSocialV1Feed(tab, {
    ownerProfileId: myProfile?.profileId,
    isActive,
  });
  const { isEntryHidden } = useSocialEntryModeration();
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
  const visiblePinnedPosts = useMemo(
    () =>
      pinnedPosts.filter(
        (post) =>
          !isEntryHidden({
            postId: post.id,
            authorId: post.item.author.id,
            authorHandle: post.authorHandle,
            commentId: post.commentId,
          }),
      ),
    [isEntryHidden, pinnedPosts],
  );
  const shellFilteredPosts = useMemo(
    () =>
      tab === 'following'
        ? filterSocialV1FeedPosts(visiblePosts, appliedFilters)
        : visiblePosts,
    [appliedFilters, tab, visiblePosts],
  );

  const { colors } = useTheme();
  const screenName = tab === 'trending' ? Screen.TRENDING : Screen.FOLLOWING;
  const tabName = tab === 'trending' ? Tab.TRENDING : Tab.FOLLOWING;
  const trackInteraction = useSocialScreenAnalytics(screenName, {
    tabName,
    source,
    state: [
      isLoading,
      Boolean(error),
      posts.length > 0 || pinnedPosts.length > 0,
    ],
    isActive,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [feedSort, setFeedSort] = useState<FeedSort>(DEFAULT_FEED_SORT);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  /**
   * Pull-to-refresh, and the only recovery path once a later fetch fails:
   * `useTraderFeed` clears `hasNextPage` on error, so paging cannot get the
   * user unstuck and the inline retry only renders on an empty feed.
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    trackInteraction(Interaction.REFRESH);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, REFRESH_MIN_DURATION_MS),
      );
      await Promise.all([refresh(), minDuration]);
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'trader_feed',
          operation: 'pull_to_refresh',
          extraMessage: 'Social V1 feed pull-to-refresh failed',
          source: 'EmptyShellTabPage',
          error: err,
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [refresh, trackInteraction]);

  /**
   * Pagination rides `onMomentumScrollEnd` / `onScrollEndDrag` rather than
   * `onScroll`, which `SocialV1View` owns for the collapsing header -- layering
   * a JS callback onto that reanimated handler would mean composing a worklet
   * with a non-worklet. The trade-off is that a page is requested when the
   * scroll settles rather than continuously, so the threshold is generous.
   */
  const handleScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      livePrices?.requestVisibilityCheck();
      if (!hasNextPage) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd <= END_REACHED_THRESHOLD_PX) {
        loadMore();
      }
    },
    [livePrices, hasNextPage, loadMore],
  );
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  const newestPinnedPostId = visiblePinnedPosts[0]?.id;
  useEffect(() => {
    if (!newestPinnedPostId) {
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [newestPinnedPostId]);

  // Posts present on the first render are pre-existing feed content and must
  // render at rest; anything that shows up later is a freshly committed
  // composed post and gets the entrance animation. The ref is only written in
  // an effect so a double-render never marks a new post as already seen.
  const seenPostIdsRef = useRef<Set<string> | null>(null);
  if (seenPostIdsRef.current === null) {
    seenPostIdsRef.current = new Set(posts.map((post) => post.id));
  }
  const seenPostIds = seenPostIdsRef.current;

  useEffect(() => {
    posts.forEach((post) => seenPostIds.add(post.id));
    pinnedPosts.forEach((post) => seenPostIds.add(post.id));
  }, [pinnedPosts, posts, seenPostIds]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  const showFollowingChrome = tab === 'following';

  const sortedPosts = useMemo(() => {
    if (tab !== 'following' || feedSort === 'most_recent') {
      return [...visiblePinnedPosts, ...shellFilteredPosts];
    }
    const byReactions = [...shellFilteredPosts].sort((left, right) => {
      const leftTotal = left.reactions.reduce(
        (sum, reaction) => sum + reaction.count,
        0,
      );
      const rightTotal = right.reactions.reduce(
        (sum, reaction) => sum + reaction.count,
        0,
      );
      return rightTotal - leftTotal;
    });
    return [...visiblePinnedPosts, ...byReactions];
  }, [feedSort, shellFilteredPosts, tab, visiblePinnedPosts]);

  const handleCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
        return;
      }

      const chain = chainNameToId(item.asset.avatar.chain);
      const tokenAddress = item.asset.avatar.tokenAddress.trim();
      if (!chain || !tokenAddress) {
        return;
      }

      onQuickBuy?.(
        {
          tokenAddress,
          tokenSymbol: item.asset.symbol,
          tokenName: item.asset.name ?? item.asset.symbol,
          chain,
        },
        commentId ? { commentId } : undefined,
      );
    },
    [onQuickBuy],
  );

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostEntrance animate={!seenPostIds.has(post.id)}>
        <SocialFeedPostShell
          post={post}
          onCopyTrade={handleCopyTrade}
          onAuthorPress={handleAuthorPress}
          onPositionPress={post.position ? handlePositionPress : undefined}
        />
      </SocialFeedPostEntrance>
    ),
    [handleAuthorPress, handleCopyTrade, handlePositionPress, seenPostIds],
  );

  const showInitialFeedSkeletons = isLoading && posts.length === 0;
  // Posting opens Following, often before its first page has loaded: the
  // viewer's pinned post stays on screen above the skeletons meanwhile.
  const showPinnedPostsWhileLoading =
    showInitialFeedSkeletons && visiblePinnedPosts.length > 0;
  // The tab feed itself came back empty. Hidden posts can also leave the list
  // blank; those stay quiet. Following filters that remove every post get
  // their own empty state.
  const showFilteredEmpty =
    tab === 'following' &&
    isFilterActive &&
    !isLoading &&
    error == null &&
    sortedPosts.length === 0;
  const showTrueEmptyFeed =
    !showFilteredEmpty &&
    !isLoading &&
    error == null &&
    posts.length === 0 &&
    pinnedPosts.length === 0;
  const feedIsEmpty = posts.length === 0;
  const handleFeedSortChange = useCallback(
    (nextSort: FeedSort) => {
      if (nextSort === feedSort) {
        return;
      }
      trackInteraction(Interaction.SORT_APPLIED, {
        filter_name: Filter.FEED_SORT,
        previous_filter_value: feedSort,
        filter_value: nextSort,
      });
      setFeedSort(nextSort);
    },
    [feedSort, trackInteraction],
  );
  const firstContentState = !hasBeenActive
    ? null
    : sortedPosts.length > 0
      ? 'content'
      : error && feedIsEmpty
        ? 'error'
        : showFilteredEmpty || showTrueEmptyFeed
          ? 'empty'
          : null;

  useSocialTabFirstContentTrace({
    tab: FEED_TRACE_TABS[tab],
    contentState: firstContentState,
    hasUsableData: dataUpdatedAt !== undefined,
    performance,
  });

  return (
    <SocialFeedSurfaceProvider
      location={tab === 'trending' ? 'social_trending' : 'social_following'}
      analyticsSource={source}
      showMockedFields
    >
      <Box twClassName="flex-1 bg-default" testID={containerTestID}>
        <Animated.ScrollView
          ref={scrollRef}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow pt-4')}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={handleScrollSettled}
          onScrollEndDrag={handleScrollSettled}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          testID={scrollTestID}
        >
          {showFollowingChrome ? (
            <SocialTabFilterBar
              onOpenFilters={onOpenFilters}
              isFilterActive={isFilterActive}
              filterTestID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON}
              testID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR}
              twClassName="px-4 pb-2"
            >
              <FeedSortFilterSelector
                value={feedSort}
                onPress={() => setIsSortSheetOpen(true)}
              />
            </SocialTabFilterBar>
          ) : null}
          {hasBeenActive ? (
            // The 16px gap under the tabs lives on the scroll content, so it
            // scrolls away and the feed still clips at the tab underline.
            <Box twClassName="pb-8 gap-6">
              {showInitialFeedSkeletons && !showPinnedPostsWhileLoading ? (
                <SocialFeedSkeleton />
              ) : (
                <>
                  {showFilteredEmpty || showTrueEmptyFeed ? (
                    // Cancel the padding above this slot so the copy starts
                    // 48px under the tabs, or under the filter row.
                    <Box twClassName={showFollowingChrome ? '-mt-2' : '-mt-4'}>
                      {showFilteredEmpty ? (
                        <SocialFilterEmptyState
                          onClear={onClearFilters ?? (() => undefined)}
                        />
                      ) : (
                        <SocialV1FeedEmptyState tab={tab} />
                      )}
                    </Box>
                  ) : null}
                  <SocialV1FeedPostList
                    posts={sortedPosts}
                    dividerKeyPrefix="leading"
                    renderPost={renderPost}
                  />
                  {showPinnedPostsWhileLoading ? <SocialFeedSkeleton /> : null}
                </>
              )}
              {isFetchingNextPage ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  twClassName="px-4"
                  testID={SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID}
                >
                  <ActivityIndicator size="small" />
                </Box>
              ) : null}
              {error && feedIsEmpty ? (
                <SocialFeedError onRetry={refresh} />
              ) : null}
            </Box>
          ) : null}
        </Animated.ScrollView>
        {showFollowingChrome ? (
          <FeedSortFilterSheet
            isOpen={isSortSheetOpen}
            value={feedSort}
            onChange={handleFeedSortChange}
            onClose={() => setIsSortSheetOpen(false)}
          />
        ) : null}
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default EmptyShellTabPage;
