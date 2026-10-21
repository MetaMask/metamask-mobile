import {
  Box,
  BoxAlignItems,
  ButtonBase,
  ButtonBaseSize,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import Animated, {
  type ScrollHandlerProcessed,
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { selectFollowingProfileIds } from '../../../../selectors/socialController';
import { playSelection } from '../../../../util/haptics';
import { strings } from '../../../../../locales/i18n';
import { useSocialEntryModeration } from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import SocialFeedError from '../../../UI/SocialFeed/components/SocialFeedError';
import SocialFeedPostShell from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../shell/filters/types';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import LiveStreamStatusDot from './components/LiveStreamStatusDot';
import { LiveViewSelectorsIDs } from './LiveView.testIds';
import FeedItemEntryAnimation, {
  createFeedItemEntryScheduler,
} from '../FeedView/components/FeedItemEntryAnimation';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { useLiveFeed } from './useLiveFeed';
import { filterSocialV1FeedPosts } from '../shell/filters/filterSocialV1FeedPosts';
import { useMyProfile } from '../MyProfileView/hooks';

type AnimatedScrollHandler = ScrollHandlerProcessed;

interface LiveScrollContext {
  nearTop?: boolean;
}

const LIVE_FEED_INITIAL_RENDER_COUNT = 6;
const LIVE_FEED_MAX_RENDER_PER_BATCH = 6;
const LIVE_FEED_WINDOW_SIZE = 5;
const LIVE_FEED_NEAR_TOP_THRESHOLD_PX = 48;

type LiveStreamState = 'paused' | 'live';

export interface LiveViewProps {
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  appliedFilters?: SocialShellFilters;
}

/**
 * Social Bundle V1 Live feed: the shared feed-all snapshot plus realtime
 * revisions, rendered with the same post shell as the other feed tabs.
 */
const LiveView: React.FC<LiveViewProps> = ({
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  appliedFilters = DEFAULT_FILTERS,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const listRef = useRef<Animated.FlatList<SocialV1FeedPost>>(null);
  const { profile: myProfile } = useMyProfile();
  const [streamState, setStreamState] = useState<LiveStreamState>('live');
  const [nearTop, setNearTop] = useState(true);
  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const { isEntryHidden } = useSocialEntryModeration();
  const [refreshing, setRefreshing] = useState(false);
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    loadMore,
    error,
    refresh,
    realtimeEventIds,
    markRealtimeEventAnimated,
    pendingNewCount,
  } = useLiveFeed({
    paused: streamState === 'paused',
    nearTop,
  });
  const visiblePosts = useMemo(
    () =>
      filterSocialV1FeedPosts(
        posts.filter(
          (post) =>
            !isEntryHidden({
              postId: post.id,
              authorId: post.item.author.id,
              authorHandle: post.authorHandle,
            }),
        ),
        appliedFilters,
      ).filter(
        (post) =>
          appliedFilters.traderCohort !== 'following' ||
          followingProfileIds.includes(post.item.author.id),
      ),
    [appliedFilters, followingProfileIds, isEntryHidden, posts],
  );

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        listRef.current?.scrollToOffset({ offset, animated });
      },
    }),
    [],
  );

  const isLive = streamState === 'live';
  const streamLabel = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  const handleStreamToggle = useCallback(() => {
    setStreamState((prev) => (prev === 'live' ? 'paused' : 'live'));
  }, []);

  const handleRevealPending = useCallback(async () => {
    setStreamState('live');
    setNearTop(true);
    await refresh();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refresh]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const setNearTopFromScroll = useCallback((value: boolean) => {
    setNearTop(value);
  }, []);

  const liveScrollHandler = useAnimatedScrollHandler<LiveScrollContext>(
    {
      onScroll: (event, context) => {
        const nextNearTop =
          event.contentOffset.y <= LIVE_FEED_NEAR_TOP_THRESHOLD_PX;
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
    liveScrollHandler,
  ]);

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

  const scheduleEntryDelay = useMemo(() => createFeedItemEntryScheduler(), []);

  const renderPost = useCallback(
    ({ item, index }: { item: SocialV1FeedPost; index: number }) => {
      const eventId = realtimeEventIds.get(item.id);
      return (
        <React.Fragment>
          {index > 0 ? <Box twClassName="h-px bg-muted" /> : null}
          <FeedItemEntryAnimation
            eventId={eventId}
            scheduleEntryDelay={scheduleEntryDelay}
            onAnimationComplete={markRealtimeEventAnimated}
          >
            <Box twClassName="px-4">
              <SocialFeedPostShell
                post={item}
                onAuthorPress={handleAuthorPress}
                onPositionPress={
                  item.position ? handlePositionPress : undefined
                }
              />
            </Box>
          </FeedItemEntryAnimation>
        </React.Fragment>
      );
    },
    [
      handleAuthorPress,
      handlePositionPress,
      markRealtimeEventAnimated,
      realtimeEventIds,
      scheduleEntryDelay,
    ],
  );

  return (
    <SocialFeedSurfaceProvider location="social_live">
      <Box
        twClassName="flex-1 bg-default"
        testID={LiveViewSelectorsIDs.CONTAINER}
      >
        <Animated.FlatList
          ref={listRef}
          data={visiblePosts}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow pb-8')}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LIVE_FEED_INITIAL_RENDER_COUNT}
          maxToRenderPerBatch={LIVE_FEED_MAX_RENDER_PER_BATCH}
          windowSize={LIVE_FEED_WINDOW_SIZE}
          onScroll={composedScrollHandler}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {pendingNewCount > 0 ? (
                <Box alignItems={BoxAlignItems.Center} twClassName="py-2">
                  <ButtonBase
                    size={ButtonBaseSize.Sm}
                    onPress={handleRevealPending}
                  >
                    {pendingNewCount > 60
                      ? '60+ new posts'
                      : `${pendingNewCount} new post${pendingNewCount === 1 ? '' : 's'}`}
                  </ButtonBase>
                </Box>
              ) : null}
              <SocialTabFilterBar
                onOpenFilters={onOpenFilters}
                isFilterActive={isFilterActive}
                filterTestID={LiveViewSelectorsIDs.FILTER_BUTTON}
              >
                <FilterButton
                  isSelected
                  variant={FilterButtonVariant.Primary}
                  size={FilterButtonSize.Md}
                  onPress={handleStreamToggle}
                  testID={LiveViewSelectorsIDs.STREAM_BUTTON}
                  accessibilityLabel={streamLabel}
                  startAccessory={
                    <LiveStreamStatusDot isLive={isLive} onPrimaryButton />
                  }
                >
                  {streamLabel}
                </FilterButton>
              </SocialTabFilterBar>
            </>
          }
          ListEmptyComponent={
            isLoading ? null : <SocialV1FeedEmptyState tab="live" />
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
          renderItem={renderPost}
          keyExtractor={(item) => item.position?.positionId ?? item.id}
          testID={LiveViewSelectorsIDs.SCROLL_VIEW}
        />
      </Box>
    </SocialFeedSurfaceProvider>
  );
};

export default LiveView;
