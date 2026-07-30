import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RefreshControl, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  selectSocialLeaderboardEnabled,
  selectSocialLeaderboardPerpsEnabled,
} from '../../../../selectors/featureFlagController/socialLeaderboard';
import Logger from '../../../../util/Logger';
import NotificationService from '../../../../util/notifications/services/NotificationService';
import { buildSocialLoggerErrorOptions } from '../../../../util/social/socialServiceTelemetry';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import { useTheme } from '../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';
import { useNotificationPreferences } from '../NotificationPreferences/hooks';
import { areTradingSignalsChannelsDisabled } from '../NotificationPreferences/hooks/tradingSignalsChannels';
import { useOpenTradingSignalsSetup } from '../hooks/useOpenTradingSignalsSetup';
import {
  TraderRow,
  TraderRowSkeleton,
  // eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
} from '../../Homepage/Sections/TopTraders/components';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { TRADER_ROW_HEIGHT } from '../../Homepage/Sections/TopTraders/components/TraderRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import {
  ALL_CHAINS,
  PERP_CHAINS,
  SPOT_CHAINS,
} from '../../shared/top-traders-constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
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
 * Tab the leaderboard lands on. Spot tokens are the broadest surface most users
 * come here for, so perps and the mixed "all" ranking are opt-in.
 */
const DEFAULT_TYPE_TAB: TabFilter = 'tokens';

/** Enables just the landing tab's query; the rest are switched on lazily. */
const buildQueryEnabledTabs = (
  landingTab: TabFilter,
): Record<TabFilter, boolean> => ({
  all: landingTab === 'all',
  tokens: landingTab === 'tokens',
  perps: landingTab === 'perps',
});

// How long the post-onboarding "turn on notifications" nudge stays up before it
// auto-dismisses (ms). Long enough to notice and act on after landing here, but
// still transient so it never becomes permanent chrome.
const NOTIFICATIONS_BANNER_AUTO_DISMISS_MS = 20000;

interface IdleCallbackGlobals {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const LEADERBOARD_LIMIT = 50;
const INITIAL_TRADER_ROWS_TO_RENDER = 6;
const SECONDARY_TAB_PREFETCH_IDLE_TIMEOUT_MS = 1000;

const scheduleIdleTask = (task: () => void) => {
  const idleGlobals = globalThis as typeof globalThis & IdleCallbackGlobals;

  if (!idleGlobals.requestIdleCallback) {
    return undefined;
  }

  const idleCallbackId = idleGlobals.requestIdleCallback(task, {
    timeout: SECONDARY_TAB_PREFETCH_IDLE_TIMEOUT_MS,
  });

  return () => {
    idleGlobals.cancelIdleCallback?.(idleCallbackId);
  };
};

export interface TopTradersViewProps {
  /**
   * When true, renders only the leaderboard body (filter row + list) without
   * its own SafeAreaView, animated header, large title, or pinned filter bar,
   * so it can be embedded as a page inside the Leaderboard | Feed tabs.
   */
  embeddedInTabs?: boolean;
}

const TopTradersView: React.FC<TopTradersViewProps> = ({
  embeddedInTabs = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TopTradersView'>>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const {
    hasNotificationPreferences,
    isLoading: isLoadingNotificationPreferences,
  } = useNotificationStoragePreferences();
  const {
    preferences: notificationPreferences,
    hasNotificationPreferences: hasSocialAiPreferences,
    isTraderNotificationEnabled,
    toggleTraderNotification,
  } = useNotificationPreferences();
  const showMuteChip = hasSocialAiPreferences;
  const needsNotificationSetup =
    hasSocialAiPreferences &&
    areTradingSignalsChannelsDisabled(notificationPreferences);
  const { openSetupIfNeeded } = useOpenTradingSignalsSetup();
  const { track } = useSocialLeaderboardAnalytics();
  const source = route.params?.source ?? 'nav_tab';
  const title = strings('social_leaderboard.top_traders_view.title');

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
  // One-shot nudge shown when onboarding reports the user tapped "Allow
  // notifications" but the OS denied it. Seeded from the route param so it only
  // appears on that hand-off, never on normal tab visits.
  const [showNotificationsBanner, setShowNotificationsBanner] = useState(
    Boolean(route.params?.showNotificationsBanner),
  );
  // Tracks whether we've already emitted the screen-viewed event this mount.
  // Avoids re-firing if the user changes filters or refreshes.
  const hasFiredScreenViewedRef = useRef(false);
  const selectedTabRef = useRef<TabFilter>(DEFAULT_TYPE_TAB);

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
  const traders = useMemo(
    () => rankTradersByMetric(loadedTraders, sort),
    [loadedTraders, sort],
  );
  const shouldPrefetchSecondaryTabs =
    isEnabled &&
    isPerpsEnabled &&
    !activeResult.isLoading &&
    TYPE_FILTER_OPTIONS.some((tab) => !queryEnabledTabs[tab]);
  const shouldRefreshAll = queryEnabledTabs.all;
  const shouldRefreshTokens = isPerpsEnabled && queryEnabledTabs.tokens;
  const shouldRefreshPerps = isPerpsEnabled && queryEnabledTabs.perps;

  useEffect(() => {
    if (!isEnabled) {
      navigation.goBack();
    }
  }, [isEnabled, navigation]);

  useEffect(() => {
    if (!isPerpsEnabled && selectedTabRef.current !== 'all') {
      selectedTabRef.current = 'all';
      setRenderedTab('all');
      setQueryEnabledTabs((current) =>
        current.all ? current : { ...current, all: true },
      );
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

    return scheduleIdleTask(() => {
      setQueryEnabledTabs({ all: true, tokens: true, perps: true });
    });
  }, [shouldPrefetchSecondaryTabs]);

  const handleTabPress = useCallback(
    (next: TabFilter) => {
      if (!isPerpsEnabled && next !== 'all') return;
      const previousTab = selectedTabRef.current;
      if (previousTab === next) return;
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
      const wasFollowing = trader?.isFollowing ?? false;
      const performFollow = () =>
        toggleFollow(traderId, {
          source: 'leaderboard',
          traderAddress: trader?.address ?? '',
          traderUsername: trader?.username,
          traderRank: trader?.rank,
          traderAvatarUri: trader?.avatarUri,
        });
      if (!wasFollowing && openSetupIfNeeded(performFollow)) {
        return;
      }
      await performFollow();
    },
    [traders, toggleFollow, openSetupIfNeeded],
  );

  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();
  const [isFilterBarPinned, setIsFilterBarPinned] = useState(false);

  useAnimatedReaction(
    () =>
      titleSectionHeightSv.value > 0 &&
      scrollYShared.value >= titleSectionHeightSv.value,
    (pinned, previous) => {
      if (previous !== null && pinned !== previous) {
        runOnJS(setIsFilterBarPinned)(pinned);
      }
    },
  );

  const pinnedFilterStyle = useAnimatedStyle(() => {
    const titleHeight = titleSectionHeightSv.value;
    return {
      opacity: titleHeight > 0 && scrollYShared.value >= titleHeight ? 1 : 0,
    };
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Auto-dismiss the notifications nudge after a fixed window so it never lingers
  // as permanent chrome. Cleared on manual close/unmount via the effect cleanup.
  useEffect(() => {
    if (!showNotificationsBanner) {
      return undefined;
    }
    const timeoutId = setTimeout(
      () => setShowNotificationsBanner(false),
      NOTIFICATIONS_BANNER_AUTO_DISMISS_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [showNotificationsBanner]);

  const handleDismissNotificationsBanner = useCallback(() => {
    setShowNotificationsBanner(false);
  }, []);

  const handleOpenNotificationSettings = useCallback(() => {
    setShowNotificationsBanner(false);
    NotificationService.openSystemSettings();
  }, []);

  const handleNotificationPreferencesPress = useCallback(() => {
    if (isLoadingNotificationPreferences) {
      return;
    }

    if (!hasNotificationPreferences) {
      navigation.navigate(Routes.SETTINGS_VIEW, {
        screen: Routes.SETTINGS.NOTIFICATIONS,
      });
      return;
    }

    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: {
        type: 'socialAI',
        title: strings('app_settings.notifications_opts.social_ai_title'),
        description: strings('app_settings.notifications_opts.social_ai_desc'),
      },
    });
  }, [
    hasNotificationPreferences,
    isLoadingNotificationPreferences,
    navigation,
  ]);

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

  const handleMuteToggle = useCallback(
    (traderId: string) => {
      // Tapping a bell that only looks disabled because notifications are off
      // means "enable"; forward an idempotent unmute rather than a toggle.
      const ensureUnmuted = () => {
        if (!isTraderNotificationEnabled(traderId)) {
          // Symmetric with the Follow button: same Light impact on any real toggle.
          playImpact(ImpactMoment.FollowToggle);
          toggleTraderNotification(traderId);
        }
      };
      if (openSetupIfNeeded(ensureUnmuted)) {
        return;
      }
      playImpact(ImpactMoment.FollowToggle);
      toggleTraderNotification(traderId);
    },
    [openSetupIfNeeded, toggleTraderNotification, isTraderNotificationEnabled],
  );

  const renderTraderRow = useCallback(
    ({ item }: { item: TopTrader }) => (
      <TraderRow
        trader={item}
        metric={getTraderMetricDisplay(item, sort)}
        onFollowPress={handleFollowPress}
        onTraderPress={handleTraderPress}
        showMute={showMuteChip}
        isMuted={
          !isTraderNotificationEnabled(item.id) || needsNotificationSetup
        }
        onMuteToggle={handleMuteToggle}
      />
    ),
    [
      handleFollowPress,
      handleTraderPress,
      showMuteChip,
      needsNotificationSetup,
      isTraderNotificationEnabled,
      handleMuteToggle,
      sort,
    ],
  );

  // Standalone mode renders this twice (inline in the list header and in the
  // bar that pins to the top on scroll), so every selector takes its testID
  // from the caller to keep the two copies addressable apart.
  const renderFilterBar = useCallback(
    (testIDs: { type: string; timeframe: string; sort: string }) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-3 pb-3"
      >
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          {isPerpsEnabled && (
            <TypeFilterSelector
              value={activeTab}
              onPress={openTypeSheet}
              testID={testIDs.type}
            />
          )}
          <TimeframeFilterSelector
            value={timeframe}
            onPress={openTimeframeSheet}
            testID={testIDs.timeframe}
          />
        </Box>
        <SortFilterSelector
          value={sort}
          onPress={openSortSheet}
          testID={testIDs.sort}
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

  const filterBar = useMemo(
    () =>
      renderFilterBar({
        type: TopTradersViewSelectorsIDs.TYPE_SELECTOR,
        timeframe: TopTradersViewSelectorsIDs.TIMEFRAME_SELECTOR,
        sort: TopTradersViewSelectorsIDs.SORT_SELECTOR,
      }),
    [renderFilterBar],
  );

  // Inside the tabs the filters sit above the list so they stay put while the
  // rows scroll, matching the feed tab. Standalone keeps them in the list
  // header (under the large title) and re-shows them in the pinned bar instead.
  const listHeader = useMemo(
    () =>
      embeddedInTabs ? null : (
        <>
          <Box
            twClassName="px-4 pt-2 pb-3"
            testID={TopTradersViewSelectorsIDs.TITLE_SECTION_WRAPPER}
            onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
          >
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              testID={TopTradersViewSelectorsIDs.TITLE}
            >
              {title}
            </Text>
          </Box>

          {filterBar}
        </>
      ),
    [embeddedInTabs, filterBar, setTitleSectionHeight, title],
  );

  const listBody = (
    <Box twClassName="flex-1">
      {embeddedInTabs && filterBar}

      {isLoading && traders.length === 0 ? (
        <Animated.ScrollView
          // `flex-1` matches FlatList's default behavior so the list area sits
          // directly under the filters and skeletons render top-aligned.
          style={tw.style('flex-1')}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
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
        <Animated.FlatList<TopTrader>
          data={traders}
          keyExtractor={(item) => item.id}
          renderItem={renderTraderRow}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
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

      {!embeddedInTabs && (
        <Animated.View
          pointerEvents={isFilterBarPinned ? 'auto' : 'none'}
          accessibilityElementsHidden={!isFilterBarPinned}
          importantForAccessibility={
            isFilterBarPinned ? 'auto' : 'no-hide-descendants'
          }
          style={[
            tw.style(
              'absolute top-0 left-0 right-0 z-10 border-b border-muted bg-default',
            ),
            pinnedFilterStyle,
          ]}
          testID={TopTradersViewSelectorsIDs.PINNED_FILTER_BAR}
        >
          {renderFilterBar({
            type: TopTradersViewSelectorsIDs.PINNED_TYPE_SELECTOR,
            timeframe: TopTradersViewSelectorsIDs.PINNED_TIMEFRAME_SELECTOR,
            sort: TopTradersViewSelectorsIDs.PINNED_SORT_SELECTOR,
          })}
        </Animated.View>
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
        onChange={setSort}
        onClose={closeSortSheet}
      />
    </Box>
  );

  if (embeddedInTabs) {
    return listBody;
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardAnimated
        scrollY={scrollYShared}
        titleSectionHeight={titleSectionHeightSv}
        title={title}
        titleProps={{ testID: TopTradersViewSelectorsIDs.HEADER_TITLE }}
        onBack={handleBack}
        backButtonProps={{
          testID: TopTradersViewSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Notification,
            onPress: handleNotificationPreferencesPress,
            testID: TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON,
          },
        ]}
        testID={TopTradersViewSelectorsIDs.HEADER}
      />

      {showNotificationsBanner && (
        <Box twClassName="px-4 pt-2">
          <BannerAlert
            severity={BannerAlertSeverity.Info}
            description={strings(
              'social_leaderboard.top_traders_view.notifications_banner.description',
            )}
            actionButtonLabel={strings(
              'social_leaderboard.top_traders_view.notifications_banner.open_settings',
            )}
            actionButtonOnPress={handleOpenNotificationSettings}
            onClose={handleDismissNotificationsBanner}
            testID={TopTradersViewSelectorsIDs.NOTIFICATIONS_BANNER}
          />
        </Box>
      )}

      {listBody}
    </SafeAreaView>
  );
};

export default TopTradersView;
