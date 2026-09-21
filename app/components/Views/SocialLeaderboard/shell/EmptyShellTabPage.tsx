import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
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
import SocialFeedPostShell from '../SocialV1View/feed/components/SocialFeedPostShell';
import SocialFeedPostEntrance from '../SocialV1View/feed/components/SocialFeedPostEntrance';
import SocialFeedPostingBanner from '../SocialV1View/feed/components/SocialFeedPostingBanner';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import type { SocialV1FeedTab } from '../SocialV1View/feed/types';

export const SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID =
  'social-v1-feed-footer-loading';
export const SOCIAL_V1_FEED_ERROR_TEST_ID = 'social-v1-feed-error';
export const SOCIAL_V1_FEED_RETRY_TEST_ID = 'social-v1-feed-retry';

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
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const {
    posts,
    pendingPost,
    pendingStartedAtMs,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialV1Feed(tab);

  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

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
        {hasBeenActive ? (
          // No top padding: `SocialV1View` already offsets the pager from the
          // tabs bar by 16, and adding another 16 here is what made the space
          // above the carousel twice the `gap-4` below it. The carousel bleeds
          // to both screen edges, so the horizontal padding sits on the posts
          // rather than on the page.
          <Box twClassName="pb-8 gap-4">
            <HotTokensCarousel />
            <Box twClassName="px-4 gap-6">
              {pendingPost ? (
                <SocialFeedPostingBanner
                  authorHandle={pendingPost.authorHandle}
                  authorImageUrl={pendingPost.authorImageUrl}
                  startedAtMs={pendingStartedAtMs}
                />
              ) : null}
              {posts.map((post) => (
                <SocialFeedPostEntrance
                  key={post.id}
                  animate={!seenPostIds.has(post.id)}
                >
                  <SocialFeedPostShell post={post} />
                </SocialFeedPostEntrance>
              ))}
              {isFetchingNextPage ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  testID={SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID}
                >
                  <ActivityIndicator size="small" />
                </Box>
              ) : null}
              {error && posts.length === 0 ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  twClassName="py-16 gap-3"
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
          </Box>
        ) : null}
      </Animated.ScrollView>
    </Box>
  );
};

export default EmptyShellTabPage;
