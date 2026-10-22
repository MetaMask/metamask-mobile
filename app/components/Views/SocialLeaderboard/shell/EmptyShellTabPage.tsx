import {
  Box,
  BoxAlignItems,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
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
} from 'react-native';
import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
} from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';
import { playSelection } from '../../../../util/haptics';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useTheme } from '../../../../util/theme';
import { type QuickBuyTarget } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import { useMyProfile } from '../MyProfileView/hooks';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { HotTokensCarousel } from '../SocialV1View/feed/components';
import PopularTradersCarousel from '../SocialV1View/feed/components/PopularTradersCarousel';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedError from '../../../UI/SocialFeed/components/SocialFeedError';
import SocialFeedSkeleton from '../../../UI/SocialFeed/components/SocialFeedSkeleton';
import { useSocialLivePrices } from '../../../UI/SocialFeed/live/SocialLivePricesContext';
import { getSocialV1FeedEntryDividerTestId } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import {
  DEFAULT_FEED_SORT,
  FeedSortFilterSelector,
  FeedSortFilterSheet,
  type FeedSort,
} from '../components/Filters';
import { useSocialEntryModeration } from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import { useSocialFeed } from '../../../UI/SocialFeed/data/useSocialFeed';
import { socialFeedSourceFromAsset } from '../../../UI/SocialFeed/data/socialFeedSource';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { getSocialV1HotTokenId } from '../SocialV1View/feed/utils/rankFeedHotTokens';
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
import type {
  SocialV1FeedTab,
  SocialV1HotToken,
} from '../SocialV1View/feed/types';
import { chainNameToId } from '../../../UI/SocialFeed/utils/chainMapping';
import {
  SOCIAL_TRACE_TABS,
  type SocialPerformanceContext,
} from '../../../../util/social/socialPerformance';
import { useSocialTabFirstContentTrace } from '../SocialV1View/performance/useSocialTabFirstContentTrace';

/** Insert the Popular traders rail after this many Trending posts. */
export const TRENDING_POPULAR_TRADERS_INSERT_AFTER = 3;

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

/** Pixels of list drawn past the viewport. LOW devices keep a short window. */
const LOW_LIST_DRAW_DISTANCE = 80;

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

type FeedListItem =
  | {
      key: string;
      kind: 'post';
      post: SocialV1FeedPost;
      dividerTestId?: string;
    }
  | {
      key: string;
      kind: 'popularTraders';
      dividerTestId?: string;
    };

const FeedFlashList = React.forwardRef<
  FlashListRef<FeedListItem>,
  FlashListProps<FeedListItem>
>((props, ref) => <FlashList ref={ref} {...props} />);

const AnimatedFeedList = Animated.createAnimatedComponent(FeedFlashList);

const buildFeedListItems = (
  posts: SocialV1FeedPost[],
  showPopularTraders: boolean,
): FeedListItem[] => {
  const leading = showPopularTraders
    ? posts.slice(0, TRENDING_POPULAR_TRADERS_INSERT_AFTER)
    : posts;
  const trailing = showPopularTraders
    ? posts.slice(TRENDING_POPULAR_TRADERS_INSERT_AFTER)
    : [];
  const items: FeedListItem[] = [];

  leading.forEach((post, index) => {
    items.push({
      key: post.id,
      kind: 'post',
      post,
      dividerTestId:
        index > 0
          ? getSocialV1FeedEntryDividerTestId(`leading-${index}`)
          : undefined,
    });
  });

  if (showPopularTraders) {
    items.push({
      key: 'popular-traders',
      kind: 'popularTraders',
      dividerTestId:
        items.length > 0
          ? getSocialV1FeedEntryDividerTestId('block-popular-traders')
          : undefined,
    });
  }

  trailing.forEach((post, index) => {
    items.push({
      key: `trailing-${post.id}`,
      kind: 'post',
      post,
      dividerTestId:
        index === 0
          ? getSocialV1FeedEntryDividerTestId('block-trailing')
          : getSocialV1FeedEntryDividerTestId(`trailing-${index}`),
    });
  });

  return items;
};

export type SocialFeedShellTab = SocialV1FeedTab;

const FEED_TRACE_TABS = {
  trending: SOCIAL_TRACE_TABS.Trending,
  following: SOCIAL_TRACE_TABS.Following,
} as const satisfies Record<SocialFeedShellTab, 'trending' | 'following'>;

export interface EmptyShellTabPageProps {
  tab: SocialFeedShellTab;
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
  isActive = true,
  performance,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
  onOpenFilters,
  isFilterActive = false,
  appliedFilters = DEFAULT_FILTERS,
  onQuickBuy,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const livePrices = useSocialLivePrices();
  const listRef = useRef<FlashListRef<FeedListItem>>(null);
  const hardwareTier = getHardwareTier();
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<SocialV1HotToken | null>(
    null,
  );
  const assetSource = useMemo(
    () =>
      selectedToken
        ? socialFeedSourceFromAsset({
            chain: selectedToken.chain ?? selectedToken.avatar.chain,
            tokenAddress:
              selectedToken.contractAddress ??
              selectedToken.avatar.tokenAddress,
            tokenSymbol: selectedToken.symbol,
          })
        : null,
    [selectedToken],
  );
  const assetFeed = useSocialFeed(assetSource);
  const [feedSort, setFeedSort] = useState<FeedSort>(DEFAULT_FEED_SORT);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  const activeHotTokenId = selectedToken?.id ?? null;
  // A selected chip loads that asset's server feed, including perp markets.
  // A chip we cannot turn into a source falls back to filtering loaded posts.
  const showingAssetFeed = selectedToken != null && assetSource != null;

  const filteredPosts = useMemo(() => {
    if (!selectedToken) {
      return shellFilteredPosts;
    }
    const sourcePosts = showingAssetFeed ? assetFeed.posts : shellFilteredPosts;
    return sourcePosts.filter((post) => {
      if (
        isEntryHidden({
          postId: post.id,
          authorId: post.item.author.id,
          authorHandle: post.authorHandle,
        })
      ) {
        return false;
      }
      if (showingAssetFeed) {
        return true;
      }
      return getSocialV1HotTokenId(post.item) === selectedToken.id;
    });
  }, [
    assetFeed.posts,
    isEntryHidden,
    selectedToken,
    showingAssetFeed,
    shellFilteredPosts,
  ]);

  const handleHotTokenPress = useCallback((token: SocialV1HotToken) => {
    setSelectedToken((current) => (current?.id === token.id ? null : token));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  /**
   * Pull-to-refresh, and the only recovery path once a later fetch fails:
   * `useTraderFeed` clears `hasNextPage` on error, so paging cannot get the
   * user unstuck and the inline retry only renders on an empty feed.
   */
  const visibleAssetFeed = showingAssetFeed ? assetFeed : null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, REFRESH_MIN_DURATION_MS),
      );
      const refreshVisible = visibleAssetFeed
        ? visibleAssetFeed.refresh()
        : refresh();
      await Promise.all([refreshVisible, minDuration]);
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
  }, [visibleAssetFeed, refresh]);

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
      const pageHasNext = visibleAssetFeed
        ? visibleAssetFeed.hasNextPage
        : hasNextPage;
      if (!pageHasNext) {
        return;
      }
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd <= END_REACHED_THRESHOLD_PX) {
        if (visibleAssetFeed) {
          visibleAssetFeed.loadMore();
        } else {
          loadMore();
        }
      }
    },
    [livePrices, visibleAssetFeed, hasNextPage, loadMore],
  );
  const newestPinnedPostId = visiblePinnedPosts[0]?.id;
  useEffect(() => {
    if (!newestPinnedPostId) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
        listRef.current?.scrollToOffset({ offset, animated });
      },
    }),
    [],
  );

  const showPopularTraders = tab === 'trending' && activeHotTokenId === null;
  const showFollowingChrome = tab === 'following';
  const showHotTokens = tab === 'trending';

  const sortedPosts = useMemo(() => {
    if (tab !== 'following' || feedSort === 'most_recent') {
      return [...visiblePinnedPosts, ...filteredPosts];
    }
    const byReactions = [...filteredPosts].sort((left, right) => {
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
  }, [feedSort, filteredPosts, tab, visiblePinnedPosts]);

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

  const handleAuthorPress = useCallback(
    (post: SocialV1FeedPost) => {
      playSelection().catch(() => undefined);
      navigateToSocialV1Profile(navigation, {
        traderId: post.item.author.id,
        traderName: post.authorHandle,
        traderAddress: post.item.author.address,
        traderAvatarUri:
          post.authorImageUrl ?? post.item.author.avatarUri ?? undefined,
        source: 'trader_feed',
        viewerProfileId: myProfile?.profileId ?? undefined,
        viewerAddress: myProfile?.linkedAccountAddress ?? undefined,
      });
    },
    [myProfile, navigation],
  );

  const handlePositionPress = useCallback(
    (post: SocialV1FeedPost) => {
      if (!post.position) {
        return;
      }
      playSelection().catch(() => undefined);
      navigation.navigate(Routes.SOCIAL.POSITION_SHEET, {
        positionId: post.position.positionId,
        position: post.position,
        author: post.item.author,
        comment: post.item.comment,
        isClosed:
          post.item.variant === 'perpsClosed' ||
          post.item.variant === 'spotClosed',
      });
    },
    [navigation],
  );

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostEntrance
        key={post.id}
        animate={!seenPostIds.has(post.id)}
      >
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

  const showInitialFeedSkeletons = visibleAssetFeed
    ? visibleAssetFeed.isLoading && visibleAssetFeed.posts.length === 0
    : isLoading && posts.length === 0;
  // Posting opens Following, often before its first page has loaded: the
  // viewer's pinned post stays on screen above the skeletons meanwhile.
  const showPinnedPostsWhileLoading =
    showInitialFeedSkeletons &&
    !visibleAssetFeed &&
    visiblePinnedPosts.length > 0;
  // The tab feed itself came back empty. A selected token, Following filters,
  // or hidden posts can also leave the list blank; those stay quiet.
  const showTrueEmptyFeed =
    !isLoading &&
    error == null &&
    posts.length === 0 &&
    pinnedPosts.length === 0;
  const visibleError = visibleAssetFeed ? visibleAssetFeed.error : error;
  const visibleFeedEmpty = visibleAssetFeed
    ? visibleAssetFeed.posts.length === 0
    : posts.length === 0;
  const retryVisibleFeed = visibleAssetFeed
    ? visibleAssetFeed.refresh
    : refresh;
  const showNextPageSpinner = visibleAssetFeed
    ? visibleAssetFeed.isFetchingNextPage
    : isFetchingNextPage;
  const firstContentState = !hasBeenActive
    ? null
    : sortedPosts.length > 0
      ? 'content'
      : visibleError && visibleFeedEmpty
        ? 'error'
        : showTrueEmptyFeed
          ? 'empty'
          : null;

  useSocialTabFirstContentTrace({
    tab: FEED_TRACE_TABS[tab],
    contentState: firstContentState,
    hasUsableData: dataUpdatedAt !== undefined,
    performance,
  });

  // Prefetch can fill `posts` before the tab is opened. Keep those rows out of
  // the list until the first visit so Yoga does not lay out a hidden page.
  // While Following is still loading, the viewer's pinned post stays in the
  // list and the skeleton renders under it.
  const listItems = useMemo(
    () =>
      hasBeenActive &&
      (!showInitialFeedSkeletons || showPinnedPostsWhileLoading)
        ? buildFeedListItems(
            showPinnedPostsWhileLoading ? visiblePinnedPosts : sortedPosts,
            showPopularTraders && !showPinnedPostsWhileLoading,
          )
        : [],
    [
      hasBeenActive,
      showInitialFeedSkeletons,
      showPinnedPostsWhileLoading,
      showPopularTraders,
      sortedPosts,
      visiblePinnedPosts,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      // The post above Popular traders already clears the section. The
      // cards sit closer to the next divider than that post does, so the
      // post below uses 48px before its divider to match, then 24px
      // between the divider and the post.
      const isPopularTraders = item.kind === 'popularTraders';
      const isPostAfterPopularTraders =
        item.dividerTestId?.endsWith('-block-trailing') === true;
      return (
        <Box
          twClassName={
            isPopularTraders
              ? 'gap-6'
              : isPostAfterPopularTraders
                ? 'pt-6'
                : undefined
          }
        >
          {item.dividerTestId ? (
            <SectionDivider marginVertical={1} testID={item.dividerTestId} />
          ) : null}
          {item.kind === 'post' ? (
            <Box twClassName="px-4">{renderPost(item.post)}</Box>
          ) : (
            <PopularTradersCarousel />
          )}
        </Box>
      );
    },
    [renderPost],
  );

  // `pb-6` preserves the marquee-to-first-row gap. Following owns its spacing
  // in the filter bar, so these paddings must not stack.
  const headerSitsAboveRows =
    listItems.length > 0 && hasBeenActive && showHotTokens;

  const listHeader = (
    <Box twClassName={headerSitsAboveRows ? 'gap-6 pb-6' : 'gap-6'}>
      {showFollowingChrome ? (
        <SocialTabFilterBar
          onOpenFilters={onOpenFilters}
          isFilterActive={isFilterActive}
          filterTestID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON}
          twClassName="px-4 pb-4"
        >
          <FeedSortFilterSelector
            value={feedSort}
            onPress={() => setIsSortSheetOpen(true)}
          />
        </SocialTabFilterBar>
      ) : null}
      {hasBeenActive ? (
        <>
          {showHotTokens ? (
            <HotTokensCarousel
              posts={visiblePosts}
              isLoading={isLoading}
              selectedTokenId={activeHotTokenId}
              onTokenPress={handleHotTokenPress}
            />
          ) : null}
          {showInitialFeedSkeletons && !showPinnedPostsWhileLoading ? (
            <SocialFeedSkeleton />
          ) : null}
          {!showInitialFeedSkeletons && showTrueEmptyFeed ? (
            <SocialV1FeedEmptyState tab={tab} />
          ) : null}
        </>
      ) : null}
    </Box>
  );

  const listFooter =
    hasBeenActive &&
    (showPinnedPostsWhileLoading ||
      showNextPageSpinner ||
      (visibleError && visibleFeedEmpty)) ? (
      <Box twClassName="gap-6 pb-8">
        {showPinnedPostsWhileLoading ? <SocialFeedSkeleton /> : null}
        {showNextPageSpinner ? (
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="px-4"
            testID={SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID}
          >
            <ActivityIndicator size="small" />
          </Box>
        ) : null}
        {visibleError && visibleFeedEmpty ? (
          <SocialFeedError onRetry={retryVisibleFeed} />
        ) : null}
      </Box>
    ) : (
      <Box twClassName="pb-8" />
    );

  return (
    <SocialFeedSurfaceProvider
      location={tab === 'trending' ? 'social_trending' : 'social_following'}
      showMockedFields
    >
      <Box twClassName="flex-1 bg-default" testID={containerTestID}>
        <AnimatedFeedList
          ref={listRef}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow pt-[12px]')}
          data={listItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item?.kind ?? 'post'}
          drawDistance={
            hardwareTier === 'LOW' ? LOW_LIST_DRAW_DISTANCE : undefined
          }
          extraData={listItems}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
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
        />
        {showFollowingChrome ? (
          <FeedSortFilterSheet
            isOpen={isSortSheetOpen}
            value={feedSort}
            onChange={setFeedSort}
            onClose={() => setIsSortSheetOpen(false)}
          />
        ) : null}
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default EmptyShellTabPage;
