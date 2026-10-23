import { Box, TextColor } from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { selectFollowingProfileIds } from '../../../../selectors/socialController';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../util/haptics';
import SocialFilterEmptyState from '../shared/SocialFilterEmptyState';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import SocialFeed, {
  type SocialFeedHeaderProps,
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
import type {
  SocialFeedPageHandle,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { matchesLivePost } from '../shell/filters/matchesLivePost';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import type { SocialShellFilters } from '../shell/filters/types';
import LiveButton from './components/LiveButton';
import PendingPostsButton from './components/PendingPostsButton';
import { LiveViewSelectorsIDs } from './LiveView.testIds';
import { useSocialFeedPostNavigation } from '../hooks/useSocialFeedPostNavigation';
import {
  SocialEvent,
  type SocialEventSource,
  useSocialInteraction,
} from '../analytics';

const { Filter, Interaction, Screen, StreamState, Tab } = SocialEvent;

type LiveStreamState = 'paused' | 'live';

export interface LiveViewProps {
  isActive?: boolean;
  source?: SocialEventSource;
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  /** Clears the applied Live filters. */
  onClearFilters?: () => void;
  /** Filters committed in the Live filter sheet. */
  appliedFilters?: SocialShellFilters;
  onCopyTrade?: SocialFeedProps['onCopyTrade'];
}

const LiveView: React.FC<LiveViewProps> = ({
  isActive = true,
  source,
  onScroll,
  pageRef,
  onOpenFilters,
  isFilterActive = false,
  onClearFilters,
  appliedFilters = DEFAULT_FILTERS,
  onCopyTrade,
}) => {
  const { onAuthorPress, onPositionPress } = useSocialFeedPostNavigation();
  const followingProfileIds = useSelector(selectFollowingProfileIds);
  const [streamState, setStreamState] = useState<LiveStreamState>('live');
  const feedPageRef = useRef<SocialFeedPageHandle>(null);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        feedPageRef.current?.scrollToOffset(offset, animated);
      },
    }),
    [],
  );

  const followingProfileIdSet = useMemo(
    () => new Set(followingProfileIds),
    [followingProfileIds],
  );
  const filterPost = useCallback(
    (post: SocialV1FeedPost) =>
      matchesLivePost(post, appliedFilters, followingProfileIdSet),
    [appliedFilters, followingProfileIdSet],
  );

  const previousFiltersRef = useRef(appliedFilters);
  const trackInteraction = useSocialInteraction(
    Screen.LIVE_TRADES,
    { tab_name: Tab.LIVE_TRADES, source },
    isActive,
  );
  useEffect(() => {
    if (previousFiltersRef.current === appliedFilters) {
      return;
    }
    previousFiltersRef.current = appliedFilters;
    feedPageRef.current?.scrollToOffset(0, false);
  }, [appliedFilters]);

  const handleLiveToggle = useCallback(
    (onRevealPending: () => void, pendingNewCount: number) => {
      const isResuming = streamState === 'paused';
      if (isResuming && pendingNewCount > 0) {
        // Resuming with held posts reloads the feed, like a pull-to-refresh commit.
        playImpact(ImpactMoment.PullToRefresh).catch(() => undefined);
      } else {
        playSelection().catch(() => undefined);
      }
      if (isResuming) {
        onRevealPending();
      }
      const next = streamState === 'live' ? 'paused' : 'live';
      setStreamState(next);
      trackInteraction(Interaction.STREAM_TOGGLED, {
        filter_name: Filter.STREAM_STATE,
        filter_value: next === 'live' ? StreamState.LIVE : StreamState.PAUSED,
        previous_filter_value:
          streamState === 'live' ? StreamState.LIVE : StreamState.PAUSED,
      });
    },
    [streamState, trackInteraction],
  );

  const handlePendingPostsPress = useCallback((onRevealPending: () => void) => {
    playSelection().catch(() => undefined);
    onRevealPending();
  }, []);

  const isLive = streamState === 'live';

  const renderHeader = useCallback(
    ({ pendingNewCount, onRevealPending }: SocialFeedHeaderProps) => (
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterTestID={LiveViewSelectorsIDs.FILTER_BUTTON}
        testID={LiveViewSelectorsIDs.FILTER_BAR}
        twClassName="px-4 pt-4 pb-2"
      >
        <Box twClassName="flex-row items-center gap-2">
          <LiveButton
            isLive={isLive}
            onPress={() => handleLiveToggle(onRevealPending, pendingNewCount)}
          />
          <PendingPostsButton
            pendingNewCount={pendingNewCount}
            onPress={() => handlePendingPostsPress(onRevealPending)}
            textColor={TextColor.SuccessDefault}
          />
        </Box>
      </SocialTabFilterBar>
    ),
    [
      handleLiveToggle,
      handlePendingPostsPress,
      isFilterActive,
      isLive,
      onOpenFilters,
    ],
  );

  const liveEmpty = (
    <Box twClassName="-mt-2">
      {isFilterActive ? (
        <SocialFilterEmptyState onClear={onClearFilters ?? (() => undefined)} />
      ) : (
        <SocialV1FeedEmptyState tab="live" />
      )}
    </Box>
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SocialFeed
        scope="all"
        location="social_live"
        analyticsSource={source}
        isActive={isActive}
        scrollMode="virtualized"
        realtime={isActive}
        paused={!isLive}
        filterPost={filterPost}
        emptyState={liveEmpty}
        renderHeader={renderHeader}
        onScroll={onScroll}
        pageRef={feedPageRef}
        onAuthorPress={onAuthorPress}
        onCopyTrade={onCopyTrade}
        onPositionPress={onPositionPress}
        testID={LiveViewSelectorsIDs.CONTAINER}
        scrollTestID={LiveViewSelectorsIDs.SCROLL_VIEW}
      />
    </Box>
  );
};

export default LiveView;
