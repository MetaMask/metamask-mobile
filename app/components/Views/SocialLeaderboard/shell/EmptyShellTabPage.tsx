import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import { HotTokensCarousel } from '../SocialV1View/feed/components';
import PopularTradersCarousel from '../SocialV1View/feed/components/PopularTradersCarousel';
import SocialFeedPostShell from '../SocialV1View/feed/components/SocialFeedPostShell';
import SocialFeedPostSkeleton from '../SocialV1View/feed/components/SocialFeedPostSkeleton';
import SocialV1FeedPostList from '../SocialV1View/feed/components/SocialV1FeedPostList';
import { getSocialV1FeedEntryDividerTestId } from '../SocialV1View/feed/components/SocialV1FeedPostList.testIds';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialFeedPostingBanner from '../SocialV1View/feed/components/SocialFeedPostingBanner';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import {
  DEFAULT_FEED_SORT,
  FeedSortFilterSelector,
  FeedSortFilterSheet,
  type FeedSort,
} from '../components/Filters';
import SocialTabFilterBar from './filters/SocialTabFilterBar';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import type {
  SocialV1FeedPost,
  SocialV1FeedTab,
} from '../SocialV1View/feed/types';

/** Insert the Popular traders rail after this many Trending posts. */
export const TRENDING_POPULAR_TRADERS_INSERT_AFTER = 3;

export const SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID =
  'social-v1-feed-footer-loading';
export const SOCIAL_V1_FEED_ERROR_TEST_ID = 'social-v1-feed-error';
export const SOCIAL_V1_FEED_RETRY_TEST_ID = 'social-v1-feed-retry';

/** Placeholder rows while the first feed page loads (matches V0 feed). */
const INITIAL_FEED_SKELETON_COUNT = 4;
const INITIAL_FEED_SKELETON_KEYS = Array.from(
  { length: INITIAL_FEED_SKELETON_COUNT },
  (_, index) => `social-v1-feed-skeleton-${index}`,
);

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
}) => {
  const tw = useTailwind();
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

  const { colors } = useTheme();
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
  }, [refresh]);

  /**
   * Pagination rides `onMomentumScrollEnd` / `onScrollEndDrag` rather than
   * `onScroll`, which `SocialV1View` owns for the collapsing header -- layering
   * a JS callback onto that reanimated handler would mean composing a worklet
   * with a non-worklet. The trade-off is that a page is requested when the
   * scroll settles rather than continuously, so the threshold is generous.
   */
  const handleScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    [hasNextPage, loadMore],
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

  const showPopularTraders = tab === 'trending';
  const showFollowingChrome = tab === 'following';
  const showHotTokens = tab === 'trending';

  const sortedPosts = useMemo(() => {
    if (tab !== 'following' || feedSort === 'most_recent') {
      return posts;
    }
    return [...posts].sort((left, right) => {
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
  }, [feedSort, posts, tab]);

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
  }, [sortedPosts, showPopularTraders]);

  const renderPost = useCallback(
    (post: SocialV1FeedPost) => (
      <SocialFeedPostEntrance animate={!seenPostIds.has(post.id)}>
        <SocialFeedPostShell post={post} />
      </SocialFeedPostEntrance>
    ),
    [seenPostIds],
  );

  const showInitialFeedSkeletons = isLoading && posts.length === 0;

  return (
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
            {showHotTokens ? <HotTokensCarousel /> : null}
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
              <>
                {INITIAL_FEED_SKELETON_KEYS.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? (
                      <SectionDivider
                        marginVertical={1}
                        testID={getSocialV1FeedEntryDividerTestId(
                          `loading-${index}`,
                        )}
                      />
                    ) : null}
                    <Box twClassName="px-4">
                      <SocialFeedPostSkeleton index={index} />
                    </Box>
                  </Fragment>
                ))}
              </>
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
            {isFetchingNextPage ? (
              <Box
                alignItems={BoxAlignItems.Center}
                twClassName="px-4"
                testID={SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID}
              >
                <ActivityIndicator size="small" />
              </Box>
            ) : null}
            {error && posts.length === 0 ? (
              <Box
                alignItems={BoxAlignItems.Center}
                twClassName="px-4 py-16 gap-3"
                testID={SOCIAL_V1_FEED_ERROR_TEST_ID}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('social_leaderboard.feed.error.title')}
                </Text>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Sm}
                  onPress={refresh}
                  testID={SOCIAL_V1_FEED_RETRY_TEST_ID}
                >
                  {strings('social_leaderboard.feed.error.retry')}
                </Button>
              </Box>
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
  );
};

export default EmptyShellTabPage;
