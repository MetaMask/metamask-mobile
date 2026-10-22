import {
  Box,
  BoxAlignItems,
  ButtonIconVariant,
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
import SocialFeedPostShell, {
  type SocialFeedPostShellProps,
} from '../../../UI/SocialFeed/components/SocialFeedPostShell';
import SocialFeedCanonical, {
  type SocialFeedCanonicalHeaderProps,
} from '../../../UI/SocialFeed/components/SocialFeedCanonical';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../shell/filters/types';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import LiveStreamControls from './components/LiveStreamControls';
import { LiveViewSelectorsIDs } from './LiveView.testIds';
import FeedItemEntryAnimation, {
  createFeedItemEntryScheduler,
} from '../FeedView/components/FeedItemEntryAnimation';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { useSocialFeedCanonical } from '../../../UI/SocialFeed/data/useSocialFeedCanonical';
import {
  useSocialFeedEntranceEventId,
  type SocialFeedEntrances,
} from '../../../UI/SocialFeed/data/socialFeedEntrances';
import { filterSocialV1FeedPosts } from '../shell/filters/filterSocialV1FeedPosts';
import { useMyProfile } from '../MyProfileView/hooks';

type AnimatedScrollHandler = ScrollHandlerProcessed;

interface LiveScrollContext extends Record<string, unknown> {
  nearTop?: boolean;
}

const LIVE_FEED_INITIAL_RENDER_COUNT = 6;
const LIVE_FEED_MAX_RENDER_PER_BATCH = 6;
const LIVE_FEED_WINDOW_SIZE = 5;
const LIVE_FEED_NEAR_TOP_THRESHOLD_PX = 4;

type LiveStreamState = 'paused' | 'live';

interface LiveFeedListItemProps {
  entrances: SocialFeedEntrances;
  isFirst: boolean;
  onAuthorPress: (post: SocialV1FeedPost) => void;
  onPositionPress: (post: SocialV1FeedPost) => void;
  post: SocialV1FeedPost;
  scheduleEntryDelay: () => number;
}

const areReactionsEqual = (
  previous: SocialV1FeedPost['reactions'],
  next: SocialV1FeedPost['reactions'],
): boolean =>
  previous.length === next.length &&
  previous.every(
    (reaction, index) =>
      reaction.emotion === next[index]?.emotion &&
      reaction.count === next[index]?.count,
  );

const areLiveFeedListItemPropsEqual = (
  previous: LiveFeedListItemProps,
  next: LiveFeedListItemProps,
): boolean => {
  const previousPost = previous.post;
  const nextPost = next.post;

  return (
    previous.entrances === next.entrances &&
    previous.isFirst === next.isFirst &&
    previous.onAuthorPress === next.onAuthorPress &&
    previous.onPositionPress === next.onPositionPress &&
    previous.scheduleEntryDelay === next.scheduleEntryDelay &&
    previousPost.id === nextPost.id &&
    previousPost.realtimeEventId === nextPost.realtimeEventId &&
    previousPost.authorHandle === nextPost.authorHandle &&
    previousPost.authorImageUrl === nextPost.authorImageUrl &&
    previousPost.timestampMs === nextPost.timestampMs &&
    previousPost.commentId === nextPost.commentId &&
    previousPost.copyCount === nextPost.copyCount &&
    previousPost.gifUri === nextPost.gifUri &&
    previousPost.userReaction === nextPost.userReaction &&
    areReactionsEqual(previousPost.reactions, nextPost.reactions) &&
    previousPost.item.timestamp === nextPost.item.timestamp
  );
};

const LiveFeedListItem = React.memo(
  ({
    entrances,
    isFirst,
    onAuthorPress,
    onPositionPress,
    post,
    scheduleEntryDelay,
  }: LiveFeedListItemProps) => {
    const eventId = useSocialFeedEntranceEventId(
      entrances,
      post.realtimeEventId,
    );
    return (
      <FeedItemEntryAnimation
        eventId={eventId}
        scheduleEntryDelay={scheduleEntryDelay}
        onAnimationComplete={entrances.markPlayed}
      >
        <>
          {!isFirst ? <Box twClassName="h-px bg-muted" /> : null}
          <Box twClassName="px-4">
            <SocialFeedPostShell
              post={post}
              onAuthorPress={onAuthorPress}
              onPositionPress={post.position ? onPositionPress : undefined}
            />
          </Box>
        </>
      </FeedItemEntryAnimation>
    );
  },
  areLiveFeedListItemPropsEqual,
);

export interface LiveViewProps {
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  appliedFilters?: SocialShellFilters;
}

/**
 * Social Bundle V1 Live feed: the shared feed-all snapshot plus realtime
 * revisions, rendered with the same post shell as the other feed tabs.
 */
const LegacyLiveView: React.FC<LiveViewProps> = ({
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
    entrances,
    pendingNewCount,
    revealPending,
  } = useSocialFeedCanonical({
    paused: streamState === 'paused',
    nearTop,
    realtime: true,
    scope: 'all',
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
    setNearTop(true);
    revealPending();
    await refresh();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refresh, revealPending]);

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
    ({ item, index }: { item: SocialV1FeedPost; index: number }) => (
      <LiveFeedListItem
        entrances={entrances}
        isFirst={index === 0}
        onAuthorPress={handleAuthorPress}
        onPositionPress={handlePositionPress}
        post={item}
        scheduleEntryDelay={scheduleEntryDelay}
      />
    ),
    [entrances, handleAuthorPress, handlePositionPress, scheduleEntryDelay],
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
                  textProps={isLive ? undefined : { twClassName: 'text-muted' }}
                  startAccessory={
                    <LiveStreamControls isLive={isLive} onPrimaryButton />
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

const LiveView: React.FC<LiveViewProps> = ({
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  onCopyTrade,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { profile: myProfile } = useMyProfile();
  const [streamState, setStreamState] = useState<LiveStreamState>('live');

  const handleStreamToggle = useCallback(() => {
    setStreamState((previous) => (previous === 'live' ? 'paused' : 'live'));
  }, []);

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

  const isLive = streamState === 'live';
  const streamLabel = strings(
    isLive
      ? 'social_leaderboard.feed.live_stream.live'
      : 'social_leaderboard.feed.live_stream.paused',
  );

  const renderHeader = useCallback(
    ({ pendingNewCount, onRevealPending }: SocialFeedCanonicalHeaderProps) => (
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterButtonClassName="bg-background-muted-hover"
        filterButtonVariant={ButtonIconVariant.Filled}
        filterTestID={LiveViewSelectorsIDs.FILTER_BUTTON}
        twClassName="px-4 py-4"
      >
        <Box twClassName="flex-row items-center gap-2">
          <FilterButton
            isSelected
            variant={FilterButtonVariant.Secondary}
            size={FilterButtonSize.Sm}
            onPress={handleStreamToggle}
            testID={LiveViewSelectorsIDs.STREAM_BUTTON}
            accessibilityLabel={streamLabel}
            textProps={isLive ? undefined : { twClassName: 'text-muted' }}
            startAccessory={<LiveStreamControls isLive={isLive} />}
          >
            {streamLabel}
          </FilterButton>
          {pendingNewCount > 0 ? (
            <ButtonBase
              size={ButtonBaseSize.Sm}
              onPress={onRevealPending}
              textProps={{ twClassName: 'text-success-default' }}
            >
              {pendingNewCount > 60
                ? '60+ new posts'
                : `${pendingNewCount} new post${pendingNewCount === 1 ? '' : 's'}`}
            </ButtonBase>
          ) : null}
        </Box>
      </SocialTabFilterBar>
    ),
    [handleStreamToggle, isFilterActive, isLive, onOpenFilters, streamLabel],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SocialFeedCanonical
        scope="all"
        scrollMode="virtualized"
        realtime
        paused={streamState === 'paused'}
        renderHeader={renderHeader}
        location="social_live"
        onScroll={onScroll}
        pageRef={pageRef}
        onAuthorPress={handleAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={handlePositionPress}
      />
    </Box>
  );
};

export default LiveView;
