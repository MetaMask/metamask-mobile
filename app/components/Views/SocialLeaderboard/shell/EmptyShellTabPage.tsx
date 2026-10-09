import {
  Box,
  BoxAlignItems,
  SectionDivider,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, {
  Fragment,
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
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';
import { playSelection } from '../../../../util/haptics';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import { type QuickBuyTarget } from '../../../UI/QuickBuy';
import { useMyProfile } from '../MyProfileView/hooks';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { HotTokensCarousel } from '../SocialV1View/feed/components';
import PopularTradersCarousel from '../SocialV1View/feed/components/PopularTradersCarousel';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import SocialFeedError from '../../../UI/SocialFeed/components/SocialFeedError';
import SocialFeedSkeleton from '../../../UI/SocialFeed/components/SocialFeedSkeleton';
import SocialV1FeedPostList from '../../../UI/SocialFeed/components/SocialV1FeedPostList';
import { getSocialV1FeedEntryDividerTestId } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialFeedPostingBanner from '../SocialV1View/feed/components/SocialFeedPostingBanner';
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

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

export type SocialFeedShellTab = SocialV1FeedTab;

export interface EmptyShellTabPageProps {
  tab: SocialFeedShellTab;
  /**
   * The pager mounts every page up front. Hold the mock list back until the
   * tab is first opened so Trending and Following don't duplicate testIDs.
   */
  isActive?: boolean;
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
   */
  onQuickBuy?: (target: QuickBuyTarget) => void;
}

/**
 * Social Bundle V1 Trending / Following page: mocked position cards until the
 * API supplies post/comment fields. Trending also shows locally composed posts.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  tab,
  isActive = true,
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
  const scrollRef = useRef<ScrollView>(null);
  const {
    posts,
    pendingPost,
    pendingStartedAtMs,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialV1Feed(tab);
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
    scrollRef.current?.scrollTo({ y: 0, animated: true });
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
    [visibleAssetFeed, hasNextPage, loadMore],
  );
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!pendingPost) {
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [pendingPost]);

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
  }, [posts, seenPostIds]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  const showPopularTraders = tab === 'trending' && activeHotTokenId === null;
  const showFollowingChrome = tab === 'following';
  const showHotTokens = tab === 'trending';

  const sortedPosts = useMemo(() => {
    if (tab !== 'following' || feedSort === 'most_recent') {
      return filteredPosts;
    }
    return [...filteredPosts].sort((left, right) => {
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
  }, [feedSort, filteredPosts, tab]);

  type FeedBlock =
    | { key: string; kind: 'posts'; posts: SocialV1FeedPost[] }
    | { key: string; kind: 'popularTraders' };

  const feedBlocks = useMemo((): FeedBlock[] => {
    const leadingPosts = showPopularTraders
      ? sortedPosts.slice(0, TRENDING_POPULAR_TRADERS_INSERT_AFTER)
      : sortedPosts;
    const trailingPosts = showPopularTraders
      ? sortedPosts.slice(TRENDING_POPULAR_TRADERS_INSERT_AFTER)
      : [];

    const blocks: FeedBlock[] = [
      { key: 'leading', kind: 'posts', posts: leadingPosts },
    ];
    if (showPopularTraders) {
      blocks.push({ key: 'popular-traders', kind: 'popularTraders' });
    }
    if (trailingPosts.length > 0) {
      blocks.push({ key: 'trailing', kind: 'posts', posts: trailingPosts });
    }
    return blocks;
  }, [showPopularTraders, sortedPosts]);

  const handleCopyTrade = useCallback(
    (item: SocialV1FeedItem) => {
      if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
        return;
      }

      const chain = chainNameToId(item.asset.avatar.chain);
      const tokenAddress = item.asset.avatar.tokenAddress.trim();
      if (!chain || !tokenAddress) {
        return;
      }

      onQuickBuy?.({
        tokenAddress,
        tokenSymbol: item.asset.symbol,
        tokenName: item.asset.name ?? item.asset.symbol,
        chain,
      });
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

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostEntrance animate={!seenPostIds.has(post.id)}>
        <SocialFeedPostShell
          post={post}
          onCopyTrade={handleCopyTrade}
          onAuthorPress={handleAuthorPress}
        />
      </SocialFeedPostEntrance>
    ),
    [handleAuthorPress, handleCopyTrade, seenPostIds],
  );

  const showInitialFeedSkeletons = visibleAssetFeed
    ? visibleAssetFeed.isLoading && visibleAssetFeed.posts.length === 0
    : isLoading && posts.length === 0;
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

  return (
    <SocialFeedSurfaceProvider
      location={tab === 'trending' ? 'social_trending' : 'social_following'}
      showMockedFields
    >
      <Box twClassName="flex-1 bg-default" testID={containerTestID}>
        <Animated.ScrollView
          ref={scrollRef}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow')}
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
            >
              <FeedSortFilterSelector
                value={feedSort}
                onPress={() => setIsSortSheetOpen(true)}
              />
            </SocialTabFilterBar>
          ) : null}
          {hasBeenActive ? (
            // No top padding: `SocialV1View` already offsets the pager from the
            // tabs bar by 16, and adding another 16 here is what made the space
            // above the carousel twice the `gap-4` below it. The carousel bleeds
            // to both screen edges, so the horizontal padding sits on the posts
            // rather than on the page.
            <Box twClassName="pb-8 gap-6">
              {showHotTokens ? (
                <HotTokensCarousel
                  posts={visiblePosts}
                  isLoading={isLoading}
                  selectedTokenId={activeHotTokenId}
                  onTokenPress={handleHotTokenPress}
                />
              ) : null}
              {pendingPost ? (
                <Box twClassName="px-4">
                  <SocialFeedPostingBanner
                    authorHandle={pendingPost.authorHandle}
                    authorImageUrl={pendingPost.authorImageUrl}
                    startedAtMs={pendingStartedAtMs}
                  />
                </Box>
              ) : null}
              {showInitialFeedSkeletons ? (
                <SocialFeedSkeleton />
              ) : (
                feedBlocks.map((block, blockIndex) => (
                  <Fragment key={block.key}>
                    {blockIndex > 0 ? (
                      <SectionDivider
                        marginVertical={1}
                        testID={getSocialV1FeedEntryDividerTestId(
                          `block-${block.key}`,
                        )}
                      />
                    ) : null}
                    {block.kind === 'posts' ? (
                      <SocialV1FeedPostList
                        posts={block.posts}
                        dividerKeyPrefix={block.key}
                        renderPost={renderPost}
                      />
                    ) : (
                      <PopularTradersCarousel />
                    )}
                  </Fragment>
                ))
              )}
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
          ) : null}
        </Animated.ScrollView>
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
