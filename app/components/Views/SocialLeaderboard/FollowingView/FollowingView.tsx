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
import { useSocialProfileId } from '../../../../util/social/useSocialProfileId';
import SocialFeed, {
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
import type { SocialFeedQuery } from '../../../UI/SocialFeed/data/socialFeedSource';
import type {
  SocialFeedPageHandle,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { isViewerSocialAuthor } from '../../../UI/SocialFeed/utils/isViewerSocialAuthor';
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
import SocialFilterEmptyState from '../shared/SocialFilterEmptyState';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { filterSocialV1FeedPosts } from '../shell/filters/filterSocialV1FeedPosts';
import SocialTabFilterBar from '../shell/filters/SocialTabFilterBar';
import type { SocialShellFilters } from '../shell/filters/types';

const { Filter, Interaction, Screen, Tab } = SocialEvent;

/** The viewer's follow graph and own items, in the shape of the all feed. */
export const FOLLOWING_FEED_QUERY: SocialFeedQuery = { scope: 'following_v1' };

const totalReactions = (post: SocialV1FeedPost): number =>
  post.reactions.reduce((sum, reaction) => sum + reaction.count, 0);

const byMostReactions = (
  left: SocialV1FeedPost,
  right: SocialV1FeedPost,
): number => totalReactions(right) - totalReactions(left);

// Cancels the padding above the slot so the copy starts 48px under the
// filter row.
const FOLLOWING_EMPTY_STATE = (
  <Box twClassName="-mt-2">
    <SocialV1FeedEmptyState tab="following" />
  </Box>
);

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
 * first or by reactions. The viewer's own posts stay on their Posts tab. There
 * is no socket channel for this feed, so it refreshes on pull and after a
 * follow or unfollow.
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
  const { profileId: viewerProfileId } = useSocialProfileId();
  const feedPageRef = useRef<SocialFeedPageHandle>(null);
  // The pager mounts every page up front: hold the feed back until Following
  // is first opened.
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [feedSort, setFeedSort] = useState<FeedSort>(DEFAULT_FEED_SORT);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        feedPageRef.current?.scrollToOffset(offset, animated);
      },
    }),
    [],
  );

  const filterPost = useCallback(
    (post: SocialV1FeedPost) =>
      !isViewerSocialAuthor(post.item.author.id, viewerProfileId) &&
      filterSocialV1FeedPosts([post], appliedFilters).length > 0,
    [appliedFilters, viewerProfileId],
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
  const handleRefresh = useCallback(() => {
    trackInteraction(Interaction.REFRESH);
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

  const renderHeader = useCallback(
    () => (
      <SocialTabFilterBar
        onOpenFilters={onOpenFilters}
        isFilterActive={isFilterActive}
        filterTestID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON}
        testID={SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR}
        twClassName="px-4 pt-4 pb-2"
      >
        <FeedSortFilterSelector value={feedSort} onPress={openSortSheet} />
      </SocialTabFilterBar>
    ),
    [feedSort, isFilterActive, onOpenFilters, openSortSheet],
  );

  const emptyState = useMemo(
    () =>
      isFilterActive ? (
        <Box twClassName="-mt-2">
          <SocialFilterEmptyState
            onClear={onClearFilters ?? (() => undefined)}
          />
        </Box>
      ) : (
        FOLLOWING_EMPTY_STATE
      ),
    [isFilterActive, onClearFilters],
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
          filterPost={filterPost}
          comparePosts={feedSort === 'popular' ? byMostReactions : undefined}
          emptyState={emptyState}
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
