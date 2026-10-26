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
import SocialFeed, {
  type SocialFeedHeaderProps,
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
import type { SocialFeedSource } from '../../../UI/SocialFeed/data/socialFeedSource';
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

const LIVE_FEED_SOURCE: SocialFeedSource = {
  kind: 'all',
  audience: 'all',
  scope: 'all',
};

type LiveStreamState = 'paused' | 'live';

export interface LiveViewProps {
  isActive?: boolean;
  source?: SocialEventSource;
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
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
    (onRevealPending: () => void) => {
      if (streamState === 'paused') {
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
            onPress={() => handleLiveToggle(onRevealPending)}
          />
          <PendingPostsButton
            pendingNewCount={pendingNewCount}
            onPress={onRevealPending}
            textColor={TextColor.SuccessDefault}
          />
        </Box>
      </SocialTabFilterBar>
    ),
    [handleLiveToggle, isFilterActive, isLive, onOpenFilters],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SocialFeed
        source={LIVE_FEED_SOURCE}
        location="social_live"
        analyticsSource={source}
        isActive={isActive}
        scrollMode="virtualized"
        realtime={isActive}
        paused={!isLive}
        filterPost={filterPost}
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
