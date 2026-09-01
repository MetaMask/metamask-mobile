/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  RefreshControl,
  useWindowDimensions,
  type FlatList,
  type ScrollView,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import Routes from '../../../../constants/navigation/Routes';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  selectSocialLeaderboardEnabled,
  selectSocialLeaderboardPerpsEnabled,
} from '../../../../selectors/featureFlagController/socialLeaderboard';
import Logger from '../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../util/theme';
import { useFollowWithNotificationSetup } from '../hooks/useFollowWithNotificationSetup';
import { useTraderMuteActions } from '../hooks/useTraderMuteActions';
import {
  TraderRow,
  TraderRowSkeleton,
} from '../../Homepage/Sections/TopTraders/components';
import {
  TRADER_ROW_HEIGHT,
  type TraderRowMetric,
} from '../../Homepage/Sections/TopTraders/components/TraderRow';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../shared/top-traders-constants';
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import { getTraderMetricDisplay, rankTradersByMetric } from './traderMetric';
import {
  DEFAULT_LEADERBOARD_SORT,
  DEFAULT_TIMEFRAME,
  SortFilterSelector,
  SortFilterSheet,
  TimeframeFilterSelector,
  TimeframeFilterSheet,
  TYPE_FILTER_OPTIONS,
  TypeFilterSelector,
  TypeFilterSheet,
  type LeaderboardSort,
  type SocialTimeframe,
  type SocialTypeFilter,
} from '../components/Filters';

type TabFilter = SocialTypeFilter;

/**
 * A ranked trader with its display metric precomputed. Attaching the metric to
 * the item (rather than deriving it per render in `renderItem`) keeps the value
 * stable across renders so `TraderRow`'s `React.memo` can skip rows whose data
 * hasn't changed.
 */
type RankedTrader = TopTrader & { displayMetric: TraderRowMetric };

/**
 * Tab the leaderboard lands on. Spot tokens are the broadest surface most users
 * come here for, so perps and the mixed "all" ranking are opt-in.
 */
const DEFAULT_TYPE_TAB: TabFilter = 'tokens';

/**
 * Enables just one tab's query; the rest are switched on lazily. Used both for
 * the landing state and whenever the sort changes, since sort is part of the
 * query key and would otherwise refetch every enabled tab at once.
 */
const buildQueryEnabledTabs = (
  activeTab: TabFilter,
): Record<TabFilter, boolean> => ({
  all: activeTab === 'all',
  tokens: activeTab === 'tokens',
  perps: activeTab === 'perps',
});

const LEADERBOARD_LIMIT = 50;
const INITIAL_TRADER_ROWS_TO_RENDER = 6;
const SECONDARY_TAB_PREFETCH_IDLE_TIMEOUT_MS = 1000;

interface IdleCallbackGlobals {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

/**
 * Defers a low-priority task until the JS thread is idle so it doesn't contend
 * with scrolling/taps right after the active tab paints. Falls back to a
 * macrotask where `requestIdleCallback` is unavailable. Returns a cancel
 * function to tear the pending task down on unmount / dependency change.
 */
const scheduleIdleTask = (task: () => void): (() => void) => {
  const idleGlobals = globalThis as typeof globalThis & IdleCallbackGlobals;

  if (idleGlobals.requestIdleCallback) {
    const idleCallbackId = idleGlobals.requestIdleCallback(task, {
      timeout: SECONDARY_TAB_PREFETCH_IDLE_TIMEOUT_MS,
    });
    return () => idleGlobals.cancelIdleCallback?.(idleCallbackId);
  }

  const timeoutId = setTimeout(task, 0);
  return () => clearTimeout(timeoutId);
};

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.FlatList
>['onScroll'];

export interface TopTradersViewProps {
  /**
   * Scroll handler forwarded by the tabs container so the page's scroll drives
   * the parent's collapsing title.
   */
  onScroll?: AnimatedScrollHandler;
  /**
   * Lets the tabs container drive this page's scroll offset so the collapsing
   * title stays put when the user switches tabs.
   */
  pageRef?: React.Ref<SocialTabPageHandle>;
  /**
   * Fires once the visible leaderboard query is no longer in flight (success
   * or error). The parent uses this to start feed prefetch only after the
   * landing list has loaded, so those requests never contend with it.
   */
  onVisibleLeaderboardSettled?: () => void;
}

/**
 * Leaderboard page inside the Follow Trading Leaderboard | Feed tabs. Renders
 * the filter row and ranked list; the parent owns the collapsing title, header,
 * and notification bell.
 */
const TopTradersView: React.FC<TopTradersViewProps> = ({
  onScroll,
  pageRef,
  onVisibleLeaderboardSettled,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TopTradersView'>>();
  const tw = useTailwind();
  const floatingTabBarInset = useFloatingTabBarInset();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const { showMuteChip, isChipMuted, onMutePress } = useTraderMuteActions();
  const { followWithSetup } = useFollowWithNotificationSetup();
  const { track } = useSocialLeaderboardAnalytics();
  const source = route.params?.source ?? 'nav_tab';

  const [renderedTab, setRenderedTab] = useState<TabFilter>(DEFAULT_TYPE_TAB);
  // Only the landing tab's query starts enabled; the others are switched on
  // when the user picks them, or by the idle prefetch below. Perps being off
  // pins the whole screen to the spot-only "all" query.
  const [queryEnabledTabs, setQueryEnabledTabs] = useState<
    Record<TabFilter, boolean>
  >(() => buildQueryEnabledTabs(isPerpsEnabled ? DEFAULT_TYPE_TAB : 'all'));
  const [timeframe, setTimeframe] =
    useState<SocialTimeframe>(DEFAULT_TIMEFRAME);
  const [sort, setSort] = useState<LeaderboardSort>(DEFAULT_LEADERBOARD_SORT);
  const [, startTabTransition] = useTransition();
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [isTimeframeSheetOpen, setIsTimeframeSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Tracks whether we've already emitted the screen-viewed event this mount.
  // Avoids re-firing if the user changes filters or refreshes.
  const hasFiredScreenViewedRef = useRef(false);
  const selectedTabRef = useRef<TabFilter>(DEFAULT_TYPE_TAB);
  // Tracks whether the user has explicitly chosen a tab. Once they have, late
  // feature-flag hydration must not override their selection with the default.
  const hasUserSelectedTabRef = useRef(false);

  // Only one of these is mounted at a time (skeletons vs. loaded rows), so the
  // handle forwards the offset to both and lets the unmounted one no-op.
  const skeletonScrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList<RankedTrader>>(null);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        listRef.current?.scrollToOffset({ offset, animated });
        skeletonScrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  // Render enough skeleton rows to cover the visible list area. Add a couple of
  // extras so users can see the shimmer continue past the fold while scrolling.
  const skeletonKeys = useMemo(() => {
    const count = Math.ceil(windowHeight / TRADER_ROW_HEIGHT) + 2;
    return Array.from({ length: count }, (_, i) => `top-trader-skeleton-${i}`);
  }, [windowHeight]);

  const allChains = isPerpsEnabled ? ALL_CHAINS : SPOT_CHAINS;

  const allResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: allChains,
    sort,
    timeframe,
    enabled: isEnabled && queryEnabledTabs.all,
  });
  const tokensResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: SPOT_CHAINS,
    sort,
    timeframe,
    enabled: isEnabled && isPerpsEnabled && queryEnabledTabs.tokens,
  });
  const perpsResult = useTopTraders({
    limit: LEADERBOARD_LIMIT,
    chains: PERP_CHAINS,
    sort,
    timeframe,
    enabled: isEnabled && isPerpsEnabled && queryEnabledTabs.perps,
  });

  const resultsByTab = useMemo(
    () => ({
      all: allResult,
      tokens: tokensResult,
      perps: perpsResult,
    }),
    [allResult, tokensResult, perpsResult],
  );

  const activeTab = isPerpsEnabled ? renderedTab : 'all';
  const activeResult = resultsByTab[activeTab];
  const { traders: loadedTraders, isLoading, toggleFollow } = activeResult;
  // The API ranks on its own (30-day) window, so the selected time frame is
  // only honoured once the loaded page is re-ranked here.
  const traders = useMemo<RankedTrader[]>(
    () =>
      rankTradersByMetric(loadedTraders, sort).map((trader) => ({
        ...trader,
        displayMetric: getTraderMetricDisplay(trader, sort),
      })),
    [loadedTraders, sort],
  );
  // The visible tab always fetches alone first; the other two are prefetched
  // behind it so switching pills is instant. Gate on `isFetching` rather than
  // `isLoading`: arriving with a warm cache (the homepage carousel shares the
  // Tokens query key) leaves `isLoading` false while the tab still revalidates,
  // which would let the secondary fetches ride along instead of waiting.
  const shouldPrefetchSecondaryTabs =
    isEnabled &&
    isPerpsEnabled &&
    !activeResult.isFetching &&
    TYPE_FILTER_OPTIONS.some((tab) => !queryEnabledTabs[tab]);
  // Gate on `isFetching` (not `isLoading`) for the same warm-cache reason as
  // secondary-tab prefetch: a homepage-warmed Tokens query paints immediately
  // but still revalidates, and feed fetches must wait until that finishes.
  const isVisibleLeaderboardSettled =
    !activeResult.isFetching && activeResult.hasFetched;
  const shouldRefreshAll = queryEnabledTabs.all;
  const shouldRefreshTokens = isPerpsEnabled && queryEnabledTabs.tokens;
  const shouldRefreshPerps = isPerpsEnabled && queryEnabledTabs.perps;

  useEffect(() => {
    if (!isEnabled) {
      navigation.goBack();
    }
  }, [isEnabled, navigation]);

  useEffect(() => {
    if (!isPerpsEnabled) {
      if (selectedTabRef.current !== 'all') {
        selectedTabRef.current = 'all';
        setRenderedTab('all');
        setQueryEnabledTabs((current) =>
          current.all ? current : { ...current, all: true },
        );
      }
      return;
    }
    // Remote flags can hydrate `false -> true` after mount. With perps off the
    // landing state (and the query map) was pinned to the spot-only "all" tab,
    // so once perps turn on restore the intended `DEFAULT_TYPE_TAB` landing and
    // enable its query — otherwise the screen stays on "all" with the default
    // tab's query never switched on. Skip this if the user already picked a tab.
    if (
      !hasUserSelectedTabRef.current &&
      selectedTabRef.current !== DEFAULT_TYPE_TAB
    ) {
      selectedTabRef.current = DEFAULT_TYPE_TAB;
      setRenderedTab(DEFAULT_TYPE_TAB);
      setQueryEnabledTabs(buildQueryEnabledTabs(DEFAULT_TYPE_TAB));
    }
  }, [isPerpsEnabled]);

  useEffect(() => {
    if (!isEnabled || hasFiredScreenViewedRef.current) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED, {
      [SocialLeaderboardEventProperties.SOURCE]: source,
      [SocialLeaderboardEventProperties.CHAIN_FILTER]: activeTab,
    });
  }, [activeTab, isEnabled, source, track]);

  useEffect(() => {
    if (!shouldPrefetchSecondaryTabs) {
      return undefined;
    }

    // Defer the two extra fetches (and their state updates) to idle so they
    // don't contend with scrolling or taps right after the active tab paints.
    return scheduleIdleTask(() => {
      setQueryEnabledTabs({ all: true, tokens: true, perps: true });
    });
  }, [shouldPrefetchSecondaryTabs]);

  useEffect(() => {
    if (!isVisibleLeaderboardSettled) {
      return;
    }
    onVisibleLeaderboardSettled?.();
  }, [isVisibleLeaderboardSettled, onVisibleLeaderboardSettled]);

  const handleTabPress = useCallback(
    (next: TabFilter) => {
      if (!isPerpsEnabled && next !== 'all') return;
      const previousTab = selectedTabRef.current;
      if (previousTab === next) return;
      hasUserSelectedTabRef.current = true;
      selectedTabRef.current = next;
      track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_CHAIN_FILTER_CHANGED, {
        [SocialLeaderboardEventProperties.CHAIN_FILTER]: next,
        [SocialLeaderboardEventProperties.PREVIOUS_CHAIN_FILTER]: previousTab,
      });
      startTabTransition(() => {
        setQueryEnabledTabs((current) =>
          current[next] ? current : { ...current, [next]: true },
        );
        setRenderedTab(next);
      });
    },
    [isPerpsEnabled, startTabTransition, track],
  );

  // Sort is part of the query key, so a change invalidates every tab at once.
  // Narrow back down to the visible tab in the same update that applies the sort
  // and let the prefetch re-warm the others once that tab has settled.
  const handleSortChange = useCallback(
    (next: LeaderboardSort) => {
      setSort(next);
      setQueryEnabledTabs(
        buildQueryEnabledTabs(isPerpsEnabled ? selectedTabRef.current : 'all'),
      );
    },
    [isPerpsEnabled],
  );

  const openTypeSheet = useCallback(() => setIsTypeSheetOpen(true), []);
  const closeTypeSheet = useCallback(() => setIsTypeSheetOpen(false), []);
  const openTimeframeSheet = useCallback(
    () => setIsTimeframeSheetOpen(true),
    [],
  );
  const closeTimeframeSheet = useCallback(
    () => setIsTimeframeSheetOpen(false),
    [],
  );
  const openSortSheet = useCallback(() => setIsSortSheetOpen(true), []);
  const closeSortSheet = useCallback(() => setIsSortSheetOpen(false), []);

  const handleFollowPress = useCallback(
    async (traderId: string) => {
      const trader = traders.find((t) => t.id === traderId);
      await followWithSetup(trader?.isFollowing ?? false, () =>
        toggleFollow(traderId, {
          source: 'leaderboard',
          traderAddress: trader?.address ?? '',
          traderUsername: trader?.username,
          traderRank: trader?.rank,
          traderAvatarUri: trader?.avatarUri,
        }),
      );
    },
    [traders, toggleFollow, followWithSetup],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, 1000),
      );
      await Promise.all([
        ...(shouldRefreshAll ? [allResult.refresh()] : []),
        ...(shouldRefreshTokens ? [tokensResult.refresh()] : []),
        ...(shouldRefreshPerps ? [perpsResult.refresh()] : []),
        minDuration,
      ]);
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'top_traders',
          operation: 'pull_to_refresh',
          extraMessage: 'Top traders pull-to-refresh failed',
          source: 'TopTradersView',
          error: err,
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    allResult,
    tokensResult,
    perpsResult,
    shouldRefreshAll,
    shouldRefreshTokens,
    shouldRefreshPerps,
  ]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      const trader = traders.find((t) => t.id === traderId);
      if (trader) {
        track(MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED, {
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]: trader.address,
          [SocialLeaderboardEventProperties.TRADER_USERNAME]: trader.username,
          [SocialLeaderboardEventProperties.TRADER_RANK]: trader.rank,
          [SocialLeaderboardEventProperties.CHAIN_FILTER]: activeTab,
        });
      }
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
        traderAddress: trader?.address,
        source: 'leaderboard',
        traderRank: trader?.rank,
      });
    },
    [navigation, traders, activeTab, track],
  );

  const renderTraderRow = useCallback(
    ({ item }: { item: RankedTrader }) => (
      <TraderRow
        trader={item}
        metric={item.displayMetric}
        onFollowPress={handleFollowPress}
        onTraderPress={handleTraderPress}
        showMute={showMuteChip}
        isMuted={isChipMuted(item.id)}
        onMuteToggle={onMutePress}
      />
    ),
    [
      handleFollowPress,
      handleTraderPress,
      showMuteChip,
      isChipMuted,
      onMutePress,
    ],
  );

  // Filters ride in the list header so they scroll away with the rows; the
  // parent tabs container owns the collapsing title and pinned tabs bar.
  const listHeader = useMemo(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-4 pb-4"
      >
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          {isPerpsEnabled && (
            <TypeFilterSelector
              value={activeTab}
              onPress={openTypeSheet}
              testID={TopTradersViewSelectorsIDs.TYPE_SELECTOR}
            />
          )}
          <TimeframeFilterSelector
            value={timeframe}
            onPress={openTimeframeSheet}
            testID={TopTradersViewSelectorsIDs.TIMEFRAME_SELECTOR}
          />
        </Box>
        <SortFilterSelector
          value={sort}
          onPress={openSortSheet}
          testID={TopTradersViewSelectorsIDs.SORT_SELECTOR}
        />
      </Box>
    ),
    [
      activeTab,
      isPerpsEnabled,
      openSortSheet,
      openTimeframeSheet,
      openTypeSheet,
      sort,
      timeframe,
    ],
  );

  const contentContainerStyle = tw.style(`pb-[${24 + floatingTabBarInset}px]`);

  return (
    <Box twClassName="flex-1">
      {isLoading && traders.length === 0 ? (
        <Animated.ScrollView
          ref={skeletonScrollRef}
          // `flex-1` matches FlatList's default behavior so the list area sits
          // directly under the filters and skeletons render top-aligned.
          style={tw.style('flex-1')}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {listHeader}
          {skeletonKeys.map((key) => (
            <TraderRowSkeleton key={key} />
          ))}
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList<RankedTrader>
          ref={listRef}
          data={traders}
          keyExtractor={(item) => item.id}
          renderItem={renderTraderRow}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
          testID={TopTradersViewSelectorsIDs.TRADER_LIST}
          initialNumToRender={INITIAL_TRADER_ROWS_TO_RENDER}
          maxToRenderPerBatch={INITIAL_TRADER_ROWS_TO_RENDER}
          windowSize={5}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}

      <TypeFilterSheet
        isOpen={isTypeSheetOpen}
        value={activeTab}
        onChange={handleTabPress}
        onClose={closeTypeSheet}
      />

      <TimeframeFilterSheet
        isOpen={isTimeframeSheetOpen}
        value={timeframe}
        onChange={setTimeframe}
        onClose={closeTimeframeSheet}
      />

      <SortFilterSheet
        isOpen={isSortSheetOpen}
        value={sort}
        onChange={handleSortChange}
        onClose={closeSortSheet}
      />
    </Box>
  );
};

export default TopTradersView;
