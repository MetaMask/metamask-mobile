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
  type SocialFeedFilters,
  type SocialFeedInlineRow,
  type SocialFeedProps,
} from '../../../UI/SocialFeed/components/SocialFeed';
import type { SocialFeedSource } from '../../../UI/SocialFeed/data/socialFeedSource';
import type { SocialFeedPageHandle } from '../../../UI/SocialFeed/types';
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
import { useTrendingHotTokens } from './hooks/useTrendingHotTokens';

const { Interaction, Screen, Tab } = SocialEvent;

/** Every leaderboard trader's activity. The hot-token rail ranks the same feed. */
export const TRENDING_FEED_SOURCE: SocialFeedSource = {
  kind: 'all',
  audience: 'all',
};

/** Insert the Popular traders rail after this many Trending posts. */
export const TRENDING_POPULAR_TRADERS_INSERT_AFTER = 3;

const TRENDING_INLINE_ROWS: readonly SocialFeedInlineRow[] = [
  {
    key: 'popular-traders',
    afterIndex: TRENDING_POPULAR_TRADERS_INSERT_AFTER,
    render: () => (
      // The rail pulls itself 16px up; this leaves 8px above its header, the
      // same gap a post keeps between its card and the divider.
      <Box twClassName="pt-6 pb-2">
        <PopularTradersCarousel />
      </Box>
    ),
  },
];

const renderTrendingEmpty = () => <SocialV1FeedEmptyState tab="trending" />;

export interface TrendingViewProps {
  isActive?: boolean;
  source?: SocialEventSource;
  performance?: SocialPerformanceContext;
  onScroll?: ScrollHandlerProcessed;
  pageRef?: React.Ref<SocialTabPageHandle>;
  onCopyTrade?: SocialFeedProps['onCopyTrade'];
  testID?: string;
  scrollTestID?: string;
}

/**
 * Social V1 Trending: the leaderboard traders' feed under a hot-token rail.
 * A chip narrows the feed to that asset on the server; Popular traders sits
 * after the third post while no chip is selected.
 */
const TrendingView: React.FC<TrendingViewProps> = ({
  isActive = true,
  source,
  performance,
  onScroll,
  pageRef,
  onCopyTrade,
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
  const hotTokens = useTrendingHotTokens(TRENDING_FEED_SOURCE, {
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

  const filters = useMemo(
    (): SocialFeedFilters | undefined =>
      selectedToken ? { assetIds: selectedToken.assetIds } : undefined,
    [selectedToken],
  );

  const handleTokenPress = useCallback((token: SocialV1HotToken) => {
    setSelectedToken((current) => (current?.id === token.id ? null : token));
    feedPageRef.current?.scrollToOffset(0, true);
  }, []);

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
  const showsRail =
    isRailLoading || tokens.length > 0 || selectedToken !== null;
  const renderHeader = useCallback(
    () => (
      // The rail cancels 16px of the space under it, which leaves 8px above
      // the first post's own 8px. Without a rail, the posts start 16px down.
      <Box twClassName={showsRail ? 'pt-4 pb-6' : 'pt-4'}>
        <HotTokensCarousel
          tokens={tokens}
          isLoading={isRailLoading}
          selectedTokenId={selectedTokenId}
          onTokenPress={handleTokenPress}
          isActive={isActive}
        />
      </Box>
    ),
    [
      handleTokenPress,
      isActive,
      isRailLoading,
      selectedTokenId,
      showsRail,
      tokens,
    ],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      {hasBeenActive ? (
        <SocialFeed
          source={TRENDING_FEED_SOURCE}
          filters={filters}
          location="social_trending"
          analyticsSource={source}
          showMockedFields
          isActive={isActive}
          scrollMode="virtualized"
          renderHeader={renderHeader}
          inlineRows={selectedToken ? undefined : TRENDING_INLINE_ROWS}
          renderEmpty={selectedToken ? undefined : renderTrendingEmpty}
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
