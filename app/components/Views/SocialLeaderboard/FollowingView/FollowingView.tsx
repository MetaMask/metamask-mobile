import { Box } from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ScrollHandlerProcessed } from 'react-native-reanimated';
import {
  SOCIAL_TRACE_TABS,
  type SocialPerformanceContext,
} from '../../../../util/social/socialPerformance';
import { reportSocialServiceFailure } from '../../../../util/social/socialServiceTelemetry';
import SocialFeed, {
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
import { invalidateFollowingFeed } from '../../../UI/SocialFeed/data/socialFeedQueries';
import type { SocialFeedQuery } from '../../../UI/SocialFeed/data/socialFeedSource';
import type {
  SocialFeedPageHandle,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import {
  SocialEvent,
  type SocialEventSource,
  useSocialInteraction,
} from '../analytics';
import {
  DEFAULT_FEED_SORT,
  FeedSortFilterSelector,
  FeedSortFilterSheet,
  type FeedSort,
} from '../components/Filters';
import { useSocialFeedPostNavigation } from '../hooks/useSocialFeedPostNavigation';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { useFollowedTraders } from '../NotificationPreferences/hooks/useFollowedTraders';
import SocialFilterEmptyState from '../shared/SocialFilterEmptyState';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { filterSocialV1FeedPosts } from '../shell/filters/filterSocialV1FeedPosts';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import type { SocialShellFilters } from '../shell/filters/types';
import FollowingEmptyContent, {
  type FollowingEmptyMode,
} from './components/FollowingEmptyContent';

const { Filter, Interaction, Screen, Tab } = SocialEvent;

/** The viewer's follow graph, in the shape of the all feed. */
export const FOLLOWING_FEED_QUERY: SocialFeedQuery = { scope: 'following_v1' };

const totalReactions = (post: SocialV1FeedPost): number =>
  post.reactions.reduce((sum, reaction) => sum + reaction.count, 0);

const byMostReactions = (
  left: SocialV1FeedPost,
  right: SocialV1FeedPost,
): number => totalReactions(right) - totalReactions(left);

export interface FollowingViewProps {
  isActive?: boolean;
  source?: SocialEventSource;
  performance?: SocialPerformanceContext;
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onCopyTrade?: SocialFeedProps['onCopyTrade'];
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  /** Clears the applied Following filters. */
  onClearFilters?: () => void;
  appliedFilters?: SocialShellFilters;
  testID?: string;
  scrollTestID?: string;
}

/**
 * Social V1 Following: the posts of the traders the viewer follows, newest
 * first or by reactions. The server leaves the viewer's own posts out; they
 * stay on their Posts tab. There is no socket channel for this feed. A
 * follow leaves the loaded pages in place so suggested traders stay on
 * screen. The feed reloads when this tab is opened again, or on pull.
 */
const FollowingView: React.FC<FollowingViewProps> = ({
  isActive = true,
  source,
  performance,
  onScroll,
  pageRef,
  onCopyTrade,
  onOpenFilters,
  isFilterActive = false,
  onClearFilters,
  appliedFilters = DEFAULT_FILTERS,
  testID,
  scrollTestID,
}) => {
  const { onAuthorPress, onPositionPress } =
    useSocialFeedPostNavigation('social_following');
  const feedPageRef = useRef<SocialFeedPageHandle>(null);
  // The pager mounts every page up front: hold the feed back until Following
  // is first opened.
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [feedSort, setFeedSort] = useState<FeedSort>(DEFAULT_FEED_SORT);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isFeedEmpty, setIsFeedEmpty] = useState(false);
  // Suggestions stay up after a follow until the feed itself reloads.
  const [holdSuggestions, setHoldSuggestions] = useState(false);
  const leftFollowingRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      if (hasBeenActive) {
        leftFollowingRef.current = true;
      }
      return;
    }
    if (!leftFollowingRef.current) {
      return;
    }
    leftFollowingRef.current = false;
    let cancelled = false;
    invalidateFollowingFeed()
      .then(() => {
        if (!cancelled) {
          setHoldSuggestions(false);
        }
      })
      .catch((err: unknown) => {
        reportSocialServiceFailure(
          err,
          {
            surface: 'follow',
            operation: 'invalidate_following_feed',
            extraMessage: 'Following feed refresh failed',
            source: 'FollowingView',
            endpoint: 'feed',
          },
          { breadcrumb: false },
        );
      });
    return () => {
      cancelled = true;
      leftFollowingRef.current = true;
    };
  }, [hasBeenActive, isActive]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        feedPageRef.current?.scrollToOffset(offset, animated);
      },
    }),
    [],
  );

  const resolveFollows = hasBeenActive && isFeedEmpty && !isFilterActive;
  const {
    traders: followedTraders,
    isLoading: followsLoading,
    error: followsError,
  } = useFollowedTraders({ enabled: resolveFollows });
  const followsNobody =
    resolveFollows &&
    !followsLoading &&
    !followsError &&
    followedTraders.length === 0;
  const showSuggestions =
    resolveFollows &&
    !followsLoading &&
    !followsError &&
    (holdSuggestions || followedTraders.length === 0);
  useEffect(() => {
    if (followsNobody) {
      setHoldSuggestions(true);
    }
  }, [followsNobody]);
  const emptyMode: FollowingEmptyMode = (() => {
    if (!resolveFollows) {
      return 'no-posts';
    }
    if (followsLoading) {
      return 'loading';
    }
    if (followsError || !showSuggestions) {
      return 'no-posts';
    }
    return 'suggestions';
  })();
  const handleListStateChange = useCallback((state: { showEmpty: boolean }) => {
    setIsFeedEmpty(state.showEmpty);
  }, []);

  const filterPost = useCallback(
    (post: SocialV1FeedPost) =>
      filterSocialV1FeedPosts([post], appliedFilters).length > 0,
    [appliedFilters],
  );
  const previousFiltersRef = useRef(appliedFilters);
  useEffect(() => {
    if (previousFiltersRef.current === appliedFilters) {
      return;
    }
    previousFiltersRef.current = appliedFilters;
    feedPageRef.current?.scrollToOffset(0, false);
  }, [appliedFilters]);

  const trackInteraction = useSocialInteraction(
    Screen.FOLLOWING,
    { tab_name: Tab.FOLLOWING, source },
    isActive,
  );
  const prepareRefresh = useCallback(() => invalidateFollowingFeed(), []);
  const handleRefresh = useCallback(() => {
    trackInteraction(Interaction.REFRESH);
    setHoldSuggestions(false);
  }, [trackInteraction]);
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
      feedPageRef.current?.scrollToOffset(0, false);
    },
    [feedSort, trackInteraction],
  );
  const openSortSheet = useCallback(() => setIsSortSheetOpen(true), []);
  const closeSortSheet = useCallback(() => setIsSortSheetOpen(false), []);

  const feedPerformance = useMemo(
    () =>
      performance
        ? { tab: SOCIAL_TRACE_TABS.Following, context: performance }
        : undefined,
    [performance],
  );

  const renderHeader = useCallback(() => {
    if (showSuggestions) {
      return null;
    }
    return (
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterTestID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON}
        testID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR}
        twClassName="px-4 pt-4 pb-2"
      >
        <FeedSortFilterSelector value={feedSort} onPress={openSortSheet} />
      </SocialTabFilterBar>
    );
  }, [feedSort, isFilterActive, onOpenFilters, openSortSheet, showSuggestions]);

  const emptyState = useMemo(
    () =>
      isFilterActive ? (
        <Box twClassName="-mt-2">
          <SocialFilterEmptyState
            onClear={onClearFilters ?? (() => undefined)}
          />
        </Box>
      ) : (
        <FollowingEmptyContent mode={emptyMode} />
      ),
    [emptyMode, isFilterActive, onClearFilters],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      {hasBeenActive ? (
        <SocialFeed
          {...FOLLOWING_FEED_QUERY}
          location="social_following"
          analyticsSource={source}
          showMockedFields
          isActive={isActive}
          scrollMode="virtualized"
          renderHeader={renderHeader}
          onListStateChange={handleListStateChange}
          filterPost={filterPost}
          comparePosts={feedSort === 'popular' ? byMostReactions : undefined}
          emptyState={emptyState}
          prepareRefresh={prepareRefresh}
          onRefresh={handleRefresh}
          performance={feedPerformance}
          onScroll={onScroll}
          pageRef={feedPageRef}
          onAuthorPress={onAuthorPress}
          onCopyTrade={onCopyTrade}
          onPositionPress={onPositionPress}
          requireSocialProfile
          testID={testID}
          scrollTestID={scrollTestID}
        />
      ) : null}
      <FeedSortFilterSheet
        isOpen={isSortSheetOpen}
        value={feedSort}
        onChange={handleFeedSortChange}
        onClose={closeSortSheet}
      />
    </Box>
  );
};

export default FollowingView;
