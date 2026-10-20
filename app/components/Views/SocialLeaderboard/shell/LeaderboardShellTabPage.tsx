import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, type ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import {
  SocialLeaderboard,
  type SocialLeaderboardFilters,
  type SocialLeaderboardHandle,
  type SocialLeaderboardSource,
} from '../../../UI/SocialLeaderboard';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import {
  DEFAULT_V1_LEADERBOARD_RANKING,
  RankingFilterSelector,
  RankingFilterSheet,
  type V1LeaderboardRanking,
} from '../components/Filters';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { TopTradersViewSelectorsIDs } from '../TopTradersView/TopTradersView.testIds';
import {
  DEFAULT_FILTERS,
  SocialTabFilterBar,
  toLeaderboardTimeframe,
  toLeaderboardTypeFilter,
  type SocialShellFilters,
} from './filters';

/** Keeps the refresh spinner up long enough to read as a refresh. */
const MIN_REFRESH_DURATION_MS = 1000;

export interface LeaderboardShellTabPageProps {
  /**
   * Whether this page is the visible tab. The pager mounts every page up
   * front, so the list is held back until the tab is first opened — otherwise
   * opening the home would fetch the leaderboard and emit its screen-viewed
   * event while the user is still on Trending. Defaults to `true` for standalone
   * use.
   */
  isActive?: boolean;
  /**
   * Scroll handler forwarded by the tabs container so the page's scroll drives
   * the parent's collapsing title.
   */
  onScroll?: React.ComponentProps<typeof Animated.ScrollView>['onScroll'];
  /**
   * Lets the tabs container drive this page's scroll offset so the collapsing
   * title stays put when the user switches tabs.
   */
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
  appliedFilters?: SocialShellFilters;
  onOpenFilters?: () => void;
  isFilterActive?: boolean;
}

/**
 * Leaderboard tab page for Social Bundle V1: the ranking chip and Custom
 * filters button above the shared `SocialLeaderboard`, inside this page's own
 * scroll so the tabs container can drive the collapsing title.
 */
const LeaderboardShellTabPage: React.FC<LeaderboardShellTabPageProps> = ({
  isActive = true,
  onScroll,
  pageRef,
  containerTestID,
  appliedFilters = DEFAULT_FILTERS,
  onOpenFilters,
  isFilterActive = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const floatingTabBarInset = useFloatingTabBarInset();
  const route = useRoute<RouteProp<RootStackParamList, 'SocialV0View'>>();
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const { track } = useSocialLeaderboardAnalytics();

  // Latches on: once the list has loaded, leaving the tab must not tear it down
  // and refetch on the way back.
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [ranking, setRanking] = useState<V1LeaderboardRanking>(
    DEFAULT_V1_LEADERBOARD_RANKING,
  );
  const [isRankingSheetOpen, setIsRankingSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const leaderboardRef = useRef<SocialLeaderboardHandle>(null);
  const hasFiredScreenViewedRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  // With perps off the tab only ever shows the combined (spot) ranking.
  const assetClass = isPerpsEnabled
    ? toLeaderboardTypeFilter(appliedFilters.type)
    : 'all';
  const source = useMemo(
    (): SocialLeaderboardSource => ({ kind: 'all', assetClass }),
    [assetClass],
  );
  const filters = useMemo(
    (): SocialLeaderboardFilters => ({
      timeframe: toLeaderboardTimeframe(appliedFilters.timeframe),
      ranking,
      cohort: appliedFilters.traderCohort,
    }),
    [appliedFilters.timeframe, appliedFilters.traderCohort, ranking],
  );

  useEffect(() => {
    if (!hasBeenActive || hasFiredScreenViewedRef.current) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.SOURCE]:
        route.params?.source ?? 'nav_tab',
      [SocialLeaderboardEventProperties.CHAIN_FILTER]: assetClass,
    });
  }, [assetClass, hasBeenActive, route.params?.source, track]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        leaderboardRef.current?.refresh(),
        new Promise<void>((resolve) =>
          setTimeout(resolve, MIN_REFRESH_DURATION_MS),
        ),
      ]);
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'top_traders',
          operation: 'pull_to_refresh',
          extraMessage: 'Top traders pull-to-refresh failed',
          source: 'LeaderboardShellTabPage',
          error: err,
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openRankingSheet = useCallback(() => setIsRankingSheetOpen(true), []);
  const closeRankingSheet = useCallback(() => setIsRankingSheetOpen(false), []);

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      {hasBeenActive && (
        <>
          <Animated.ScrollView
            ref={scrollRef}
            style={tw.style('flex-1')}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style(
              `pb-[${24 + floatingTabBarInset}px]`,
            )}
            onScroll={onScroll}
            scrollEventThrottle={16}
            testID={TopTradersViewSelectorsIDs.TRADER_LIST}
            refreshControl={
              <RefreshControl
                colors={[colors.primary.default]}
                tintColor={colors.icon.default}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            <SocialTabFilterBar
              onOpenFilters={onOpenFilters}
              isFilterActive={isFilterActive}
              filterTestID={TopTradersViewSelectorsIDs.FILTER_BUTTON}
            >
              <RankingFilterSelector
                value={ranking}
                onPress={openRankingSheet}
                testID={TopTradersViewSelectorsIDs.RANKING_SELECTOR}
              />
            </SocialTabFilterBar>
            <SocialFeedSurfaceProvider showMockedFields>
              <SocialLeaderboard
                ref={leaderboardRef}
                source={source}
                location="social_leaderboard"
                filters={filters}
                showViewerRow
              />
            </SocialFeedSurfaceProvider>
          </Animated.ScrollView>
          <RankingFilterSheet
            isOpen={isRankingSheetOpen}
            value={ranking}
            onChange={setRanking}
            onClose={closeRankingSheet}
          />
        </>
      )}
    </Box>
  );
};

export default LeaderboardShellTabPage;
