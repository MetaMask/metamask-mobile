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
import SocialFeed, {
  type SocialFeedInlineRow,
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
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
import { useSocialFeedPostNavigation } from '../hooks/useSocialFeedPostNavigation';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { HotTokensCarousel } from '../SocialV1View/feed/components';
import PopularTradersCarousel from '../SocialV1View/feed/components/PopularTradersCarousel';
import SocialV1FeedEmptyState from '../SocialV1View/feed/components/SocialV1FeedEmptyState';
import type { SocialV1HotToken } from '../SocialV1View/feed/types';
import SocialFilterEmptyState from '../shared/SocialFilterEmptyState';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { filterSocialV1FeedPosts } from '../shell/filters/filterSocialV1FeedPosts';
import TrendingFilterRail from '../shell/filters/TrendingFilterRail';
import type { SocialShellFilters } from '../shell/filters/types';
import { useTrendingHotTokens } from './hooks/useTrendingHotTokens';

const { Interaction, Screen, Tab } = SocialEvent;

/** The trending feed. The hot-token rail ranks the same query, unfiltered. */
export const TRENDING_FEED_QUERY: SocialFeedQuery = { scope: 'trending' };

/** Insert the Popular traders rail after this many Trending posts. */
export const TRENDING_POPULAR_TRADERS_INSERT_AFTER = 3;

const TRENDING_INLINE_ROWS: readonly SocialFeedInlineRow[] = [
  {
    key: 'popular-traders',
    afterIndex: TRENDING_POPULAR_TRADERS_INSERT_AFTER,
    render: () => (
      // The rail pulls itself 16px up and the header has no vertical padding,
      // so 8px sits above the title. With the divider's 4px margin, that reads
      // as 12px, the same gap a post keeps above its content.
      <Box twClassName="pt-6 pb-2">
        <PopularTradersCarousel />
      </Box>
    ),
  },
];

// Cancels the padding above the slot so the copy starts 48px under the tabs.
const TRENDING_EMPTY_STATE = (
  <Box twClassName="-mt-4">
    <SocialV1FeedEmptyState tab="trending" />
  </Box>
);

export interface TrendingViewProps {
  isActive?: boolean;
  source?: SocialEventSource;
  performance?: SocialPerformanceContext;
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onCopyTrade?: SocialFeedProps['onCopyTrade'];
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
  /** Clears the applied Trending filters. */
  onClearFilters?: () => void;
  appliedFilters?: SocialShellFilters;
  testID?: string;
  scrollTestID?: string;
}

/**
 * Social V1 Trending: the trending feed, streamed while the tab is open, under
 * a hot-token rail. A chip narrows the feed to that asset on the server, which
 * pauses the stream; Custom filters narrow it further on the client. Popular
 * traders sits after the third post while no chip is selected.
 */
const TrendingView: React.FC<TrendingViewProps> = ({
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
  const { onAuthorPress, onPositionPress } = useSocialFeedPostNavigation();
  const feedPageRef = useRef<SocialFeedPageHandle>(null);
  // The pager mounts every page up front: hold the feed back until Trending
  // is first opened.
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [selectedToken, setSelectedToken] = useState<SocialV1HotToken | null>(
    null,
  );
  const selectedTokenId = selectedToken?.id ?? null;
  const hotTokens = useTrendingHotTokens(TRENDING_FEED_QUERY, {
    hasBeenActive,
    selectedTokenId,
  });

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

  const handleTokenPress = useCallback((token: SocialV1HotToken) => {
    setSelectedToken((current) => (current?.id === token.id ? null : token));
    feedPageRef.current?.scrollToOffset(0, true);
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
    Screen.TRENDING,
    { tab_name: Tab.TRENDING, source },
    isActive,
  );
  const handleRefresh = useCallback(() => {
    trackInteraction(Interaction.REFRESH);
  }, [trackInteraction]);

  const feedPerformance = useMemo(
    () =>
      performance
        ? { tab: SOCIAL_TRACE_TABS.Trending, context: performance }
        : undefined,
    [performance],
  );

  const { tokens, isLoading: isRailLoading } = hotTokens;
  const renderHeader = useCallback(
    () => (
      // The filter rail cancels 16px of the space under it, which leaves 8px
      // above the first post's own 8px.
      <Box twClassName="pt-4 pb-6">
        <TrendingFilterRail
          onOpenFilters={onOpenFilters}
          isFilterActive={isFilterActive}
          testID={SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON}
        >
          <HotTokensCarousel
            tokens={tokens}
            isLoading={isRailLoading}
            selectedTokenId={selectedTokenId}
            onTokenPress={handleTokenPress}
            isActive={isActive}
          />
        </TrendingFilterRail>
      </Box>
    ),
    [
      handleTokenPress,
      isActive,
      isFilterActive,
      isRailLoading,
      onOpenFilters,
      selectedTokenId,
      tokens,
    ],
  );

  const emptyState = useMemo(() => {
    if (isFilterActive) {
      return (
        <Box twClassName="-mt-4">
          <SocialFilterEmptyState
            onClear={onClearFilters ?? (() => undefined)}
          />
        </Box>
      );
    }
    return selectedToken ? undefined : TRENDING_EMPTY_STATE;
  }, [isFilterActive, onClearFilters, selectedToken]);

  return (
    <Box twClassName="flex-1 bg-default">
      {hasBeenActive ? (
        <SocialFeed
          {...TRENDING_FEED_QUERY}
          assetIds={selectedToken?.assetIds}
          location="social_trending"
          analyticsSource={source}
          showMockedFields
          isActive={isActive}
          scrollMode="virtualized"
          realtime={isActive}
          renderHeader={renderHeader}
          filterPost={filterPost}
          inlineRows={selectedToken ? undefined : TRENDING_INLINE_ROWS}
          emptyState={emptyState}
          onRefresh={handleRefresh}
          performance={feedPerformance}
          onScroll={onScroll}
          pageRef={feedPageRef}
          onAuthorPress={onAuthorPress}
          onCopyTrade={onCopyTrade}
          onPositionPress={onPositionPress}
          testID={testID}
          scrollTestID={scrollTestID}
        />
      ) : null}
    </Box>
  );
};

export default TrendingView;
