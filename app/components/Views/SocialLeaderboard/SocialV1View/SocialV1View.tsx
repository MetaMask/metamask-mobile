import {
  AvatarAccount,
  AvatarAccountSize,
  BannerAlert,
  BannerAlertSeverity,
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { TabView } from 'react-native-tab-view';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { playSelection } from '../../../../util/haptics';
import NotificationService from '../../../../util/notifications/services/NotificationService';
import {
  getSocialEventSource,
  SocialEvent,
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
  useSocialInteraction,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import {
  TabViewBar,
  TAB_VIEW_INITIAL_LAYOUT,
  usePageActivation,
  type TabViewBarProps,
  type TabViewRoute,
} from '../../../../component-library/components-temp/Tabs';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import { useSocialV1Exposure } from '../../../../hooks/useSocialV1Exposure';
import FollowingView from '../FollowingView';
import LeaderboardShellTabPage from '../shell/LeaderboardShellTabPage';
import {
  SOCIAL_V1_TAB_ORDER,
  SOCIAL_SHELL_TAB_CONFIG,
} from '../shell/tabConfig';
import type { SocialShellTab } from '../shell/types';
import {
  SocialFiltersBottomSheet,
  useSocialShellFilters,
} from '../shell/filters';
import LiveView from '../LiveView';
import TrendingView from '../TrendingView';
import { SocialEntryOptionsProvider } from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import { SocialFeedPageActiveContext } from '../../../UI/SocialFeed/components/SocialFeedPageActiveContext';
import { SocialFeedWindowOffsetContext } from '../../../UI/SocialFeed/components/SocialFeedWindowOffsetContext';
import { TraderStatRotationContext } from '../../../UI/SocialFeed/components/TraderStatRotationContext';
import SocialLivePricesProvider from '../../../UI/SocialFeed/live/SocialLivePricesProvider';
import { useSocialLivePrices } from '../../../UI/SocialFeed/live/SocialLivePricesContext';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import { useHeaderGlassInset } from '../../../../component-library/components-temp/HeaderGlass';
import HeaderStandardAnimatedGlass from '../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
import { useScreenTransitionComplete } from '../../../hooks/useScreenTransitionComplete';
import Routes from '../../../../constants/navigation/Routes';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { useMyProfile } from '../MyProfileView/hooks';
import { useOpenSocialPostComposer } from '../hooks/useOpenSocialPostComposer';
import { markSocialTabVisited } from '../utils/socialTabVisit';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import { toSpotCopyTradeTarget } from '../../../UI/SocialFeed/utils/copyTrade';
import {
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
  type QuickBuyTradeMode,
} from '../../../UI/QuickBuy';
import type { QuickBuySheetSource } from '../../../UI/QuickBuy/analytics';
import { useQuickBuySheet } from '../../../UI/QuickBuy/QuickBuySheetHost';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  PostTradeShareOwner,
  usePostTradeShareReopen,
} from '../PostTradeShareBottomSheet';
import { useQuoteTokensQuery } from '../PostTradeShareBottomSheet/useQuoteTokensQuery';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type { SocialPerformanceContext } from '../../../../util/social/socialPerformance';

const { Filter, Interaction, Screen, Tab } = SocialEvent;
const LANDING_INDEX = 0;

const getLandingIndex = (initialTab: SocialShellTab | undefined) => {
  const index = initialTab ? SOCIAL_V1_TAB_ORDER.indexOf(initialTab) : -1;
  return index === -1 ? LANDING_INDEX : index;
};

const PAGE_TEST_IDS: Record<
  SocialShellTab,
  {
    page: string;
    container: string;
    scroll: string;
  }
> = {
  trending: {
    page: SocialV1ViewSelectorsIDs.TRENDING_PAGE,
    container: `${SocialV1ViewSelectorsIDs.TRENDING_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.TRENDING_PAGE}-scroll`,
  },
  following: {
    page: SocialV1ViewSelectorsIDs.FOLLOWING_PAGE,
    container: `${SocialV1ViewSelectorsIDs.FOLLOWING_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.FOLLOWING_PAGE}-scroll`,
  },
  live: {
    page: SocialV1ViewSelectorsIDs.LIVE_PAGE,
    container: `${SocialV1ViewSelectorsIDs.LIVE_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.LIVE_PAGE}-scroll`,
  },
  leaderboard: {
    page: SocialV1ViewSelectorsIDs.LEADERBOARD_PAGE,
    container: `${SocialV1ViewSelectorsIDs.LEADERBOARD_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.LEADERBOARD_PAGE}-scroll`,
  },
};

// How long the post-onboarding "turn on notifications" nudge stays up before it
// auto-dismisses (ms). Long enough to notice and act on after landing here, but
// still transient so it never becomes permanent chrome.
const NOTIFICATIONS_BANNER_AUTO_DISMISS_MS = 20000;

/** Lets the pager finish sliding before live prices re-measure visible cards. */
const TAB_CHANGE_VISIBILITY_DELAY_MS = 400;

/**
 * Seeded height of the floating tabs bar (`pt-4` + `TabViewBar`) so the first
 * frame clears it before `onLayout` refines the exact measurement.
 */
const DEFAULT_TABS_HEIGHT = 48;

const getTabAnalyticsValue = (tab: SocialShellTab) => {
  switch (tab) {
    case 'trending':
      return SocialLeaderboardEventValues.TAB.TRENDING;
    case 'following':
      return SocialLeaderboardEventValues.TAB.FOLLOWING;
    case 'live':
      return SocialLeaderboardEventValues.TAB.LIVE;
    case 'leaderboard':
      return SocialLeaderboardEventValues.TAB.LEADERBOARD;
    default:
      return tab satisfies never;
  }
};

const SOCIAL_EVENT_TAB_CONTEXT = {
  trending: [Screen.TRENDING, Tab.TRENDING],
  following: [Screen.FOLLOWING, Tab.FOLLOWING],
  live: [Screen.LIVE_TRADES, Tab.LIVE_TRADES],
  leaderboard: [Screen.LEADERBOARD, Tab.LEADERBOARD],
} as const;

const SocialFeedPageProviders: React.FC<{
  isActive: boolean;
  rotatesTraderStats: boolean;
  windowOffsetY: number;
  children: React.ReactNode;
}> = ({ isActive, rotatesTraderStats, windowOffsetY, children }) => (
  <SocialFeedPageActiveContext.Provider value={isActive}>
    <TraderStatRotationContext.Provider value={rotatesTraderStats}>
      <SocialFeedWindowOffsetContext.Provider value={windowOffsetY}>
        {children}
      </SocialFeedWindowOffsetContext.Provider>
    </TraderStatRotationContext.Provider>
  </SocialFeedPageActiveContext.Provider>
);

/**
 * Social Bundle V1 Follow Trading home: Trending | Following | Leaderboard |
 * Live under a collapsing header. Opened only for TSA-1122 treatment.
 */
const SocialV1ViewContent: React.FC = () => {
  const tw = useTailwind();
  const livePrices = useSocialLivePrices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'SocialV1View' | 'SocialLeaderboardTab'>
    >();

  // Hold the tab pages out of the opening transition: the landing page is the
  // whole cost of this screen's first commit. The header and tab bar stay
  // eager so the screen paints its chrome immediately.
  const isPushedScreen = route.name !== Routes.SOCIAL.TAB;
  const isTransitionComplete = useScreenTransitionComplete();
  // A tab has no entering transition to protect, so it never waits.
  const isDeferredReady = !isPushedScreen || isTransitionComplete;

  const analyticsSource = getSocialEventSource(route.params?.source);
  const { profile: myProfile } = useMyProfile();
  const accountAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const { openComposer } = useOpenSocialPostComposer();
  const { track } = useSocialLeaderboardAnalytics();
  const programmaticTabChangeRef = useRef(false);
  const isSocialV1Treatment = useSelector(selectIsSocialV1Enabled);
  useQuoteTokensQuery(isSocialV1Treatment);
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const [hardwareTier] = useState(() => getHardwareTier());

  useSocialV1Exposure();
  useEffect(markSocialTabVisited, []);
  const tabOrder = SOCIAL_V1_TAB_ORDER;
  const trendingIndex = tabOrder.indexOf('trending');
  const followingIndex = tabOrder.indexOf('following');
  const liveIndex = tabOrder.indexOf('live');
  const leaderboardIndex = tabOrder.indexOf('leaderboard');
  const [landingIndex] = useState(() =>
    getLandingIndex(route.params?.initialTab),
  );
  const [activeIndex, setActiveIndex] = useState(landingIndex);
  const { pageActiveIndex, activate, onPagerRest } =
    usePageActivation(landingIndex);
  const socialPerformanceByTab = useMemo(
    () =>
      ({
        trending: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: pageActiveIndex === trendingIndex,
          isFocused,
          networkTier,
        },
        following: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: pageActiveIndex === followingIndex,
          isFocused,
          networkTier,
        },
        leaderboard: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: pageActiveIndex === leaderboardIndex,
          isFocused,
          networkTier,
        },
      }) satisfies Record<
        Exclude<SocialShellTab, 'live'>,
        SocialPerformanceContext
      >,
    [
      pageActiveIndex,
      hardwareTier,
      isFocused,
      isSocialV1Treatment,
      followingIndex,
      leaderboardIndex,
      networkTier,
      trendingIndex,
    ],
  );
  // Unified filter state for the V1 shell (TSA-1115). Per-tab applied/draft
  // state; the sheet is mounted only while `openTab` is non-null.
  const {
    openTab,
    draft,
    applied,
    hasDraftChanges,
    hasActiveFilters,
    openSheet,
    closeSheet,
    updateDraft,
    applyFilters,
    resetDraftToDefaults,
    clearAppliedFilters,
    setLeaderboardType,
  } = useSocialShellFilters();
  const [filterScreen, filterTab] =
    SOCIAL_EVENT_TAB_CONTEXT[openTab ?? 'trending'];
  const trackFilter = useSocialInteraction(filterScreen, {
    tab_name: filterTab,
    source: analyticsSource,
  });

  const handleApplyFilters = useCallback(() => {
    if (openTab && hasDraftChanges) {
      trackFilter(Interaction.FILTER_APPLIED, {
        filter_name: Filter.SOCIAL_FILTERS,
      });
    }
    applyFilters();
  }, [applyFilters, hasDraftChanges, openTab, trackFilter]);

  const handleOpenLiveFilters = useCallback(() => {
    openSheet('live');
  }, [openSheet]);
  const handleOpenTrendingFilters = useCallback(() => {
    openSheet('trending');
  }, [openSheet]);
  const handleOpenFollowingFilters = useCallback(() => {
    openSheet('following');
  }, [openSheet]);
  const handleOpenLeaderboardFilters = useCallback(() => {
    openSheet('leaderboard');
  }, [openSheet]);

  // Each page scrolls independently, so keep a scroll offset per tab and let a
  // derived value expose whichever one is currently visible. Changing tabs
  // resets the scroll position to the top so each tab opens from rest with the
  // tabs bar visible and header backdrop clear.
  const trendingScrollY = useSharedValue(0);
  const followingScrollY = useSharedValue(0);
  const leaderboardScrollY = useSharedValue(0);
  const liveScrollY = useSharedValue(0);
  const trendingPageRef = useRef<SocialTabPageHandle>(null);
  const followingPageRef = useRef<SocialTabPageHandle>(null);
  const leaderboardPageRef = useRef<SocialTabPageHandle>(null);
  const livePageRef = useRef<SocialTabPageHandle>(null);
  const activeIndexSv = useSharedValue(landingIndex);
  const trendingIndexSv = useSharedValue(trendingIndex);
  const followingIndexSv = useSharedValue(followingIndex);
  const liveIndexSv = useSharedValue(liveIndex);
  const scrollY = useDerivedValue(() => {
    if (activeIndexSv.value === trendingIndexSv.value) {
      return trendingScrollY.value;
    }
    if (activeIndexSv.value === followingIndexSv.value) {
      return followingScrollY.value;
    }
    if (activeIndexSv.value === liveIndexSv.value) {
      return liveScrollY.value;
    }
    return leaderboardScrollY.value;
  });

  const trendingScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      trendingScrollY.value = event.contentOffset.y;
    },
  });
  const followingScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      followingScrollY.value = event.contentOffset.y;
    },
  });
  const leaderboardScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      leaderboardScrollY.value = event.contentOffset.y;
    },
  });
  const liveScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      liveScrollY.value = event.contentOffset.y;
    },
  });
  const scrollHandlers: Record<
    SocialShellTab,
    ReturnType<typeof useAnimatedScrollHandler>
  > = {
    trending: trendingScrollHandler,
    following: followingScrollHandler,
    live: liveScrollHandler,
    leaderboard: leaderboardScrollHandler,
  };

  // No large title on Social V1, so `titleSectionHeight` stays 0 and the
  // compact header title stays hidden while the floating header backdrop fades
  // in behind the avatar and action capsules as the page scrolls.
  const titleHeightSv = useSharedValue(0);
  const { top: topInset } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: handleHeaderLayout } =
    useHeaderGlassInset(true, topInset);
  const [tabsHeight, setTabsHeight] = useState(DEFAULT_TABS_HEIGHT);
  const handleTabsLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setTabsHeight((current) =>
      Math.abs(current - nextHeight) < 1 ? current : nextHeight,
    );
  }, []);

  // One-shot nudge shown when onboarding reports the user tapped "Allow
  // notifications" but the OS denied it. Seeded from the route param so it only
  // appears on that hand-off, never on normal tab visits.
  const [showNotificationsBanner, setShowNotificationsBanner] = useState(
    Boolean(route.params?.showNotificationsBanner),
  );
  const effectiveHeaderInset = showNotificationsBanner ? 0 : headerInset;
  // On iOS, `react-native-pager-view` renders each page inside a SwiftUI
  // `TabView(.page)` child that starts below the top safe area (`topInset`),
  // whereas `renderTabBar` is a direct sibling at `y = 0` of `TabView`.
  const pagerTopInset =
    Platform.OS === 'ios' && !showNotificationsBanner ? topInset : 0;
  const floatingHeaderInset = Math.max(0, effectiveHeaderInset - pagerTopInset);
  const listTopInset = floatingHeaderInset + tabsHeight;
  const pendingPostsTopOffset = useDerivedValue(
    () =>
      floatingHeaderInset +
      Math.max(0, tabsHeight - Math.max(0, scrollY.value)),
  );

  // Floats the tabs bar directly under the header and slides it up 1:1 with
  // the active page's scroll so it passes behind the blurring header and out of
  // view, freeing the viewport for feed content. Clamped >= 0 so pull-to-
  // refresh overscroll leaves the tabs pinned instead of bouncing downward.
  const tabsScrollStyle = useAnimatedStyle(() => {
    const maxOffset = effectiveHeaderInset + tabsHeight;
    const offset = Math.max(0, Math.min(scrollY.value, maxOffset));
    return {
      transform: [{ translateY: -offset }],
    };
  });

  const handleOpenMyProfile = useCallback(() => {
    playSelection().catch(() => undefined);
    navigation.navigate(Routes.SOCIAL.MY_PROFILE);
  }, [navigation]);

  const handleOpenComposer = useCallback(() => {
    playSelection().catch(() => undefined);
    openComposer({ composerEntry: SocialEvent.ComposerEntry.SOCIAL_FEED });
  }, [openComposer]);

  const handleOpenRewards = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

  // Rendered outside the tab view, where a page would clip the inline sheet; null inside the home tabs host.
  const { openQuickBuy: showQuickBuy, quickBuySheet } = useQuickBuySheet();
  const quickBuySourceRef = useRef<QuickBuySheetSource>(
    SocialEvent.Source.SOCIAL_TRENDING,
  );
  const openQuickBuy = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin?: CopyTradeOrigin,
      tradeMode: QuickBuyTradeMode = 'buy',
      source?: QuickBuySheetSource,
      traderAddress?: string,
    ) => {
      const resolvedSource = source ?? quickBuySourceRef.current;
      quickBuySourceRef.current = resolvedSource;
      showQuickBuy({
        target,
        copyTradeOrigin,
        features: TOP_TRADERS_QUICK_BUY_FEATURES,
        initialTradeMode: tradeMode,
        analyticsContext: {
          source: resolvedSource,
          isCopyTrade: true,
          ...(traderAddress ? { traderAddress } : {}),
        },
        postTradeShare: true,
        postTradeShareOwner: PostTradeShareOwner.socialV1Feed,
      });
    },
    [showQuickBuy],
  );
  const reopenQuickBuy = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin: CopyTradeOrigin | undefined,
      tradeMode: QuickBuyTradeMode | undefined,
      traderAddress?: string,
    ) => {
      openQuickBuy(
        target,
        copyTradeOrigin,
        tradeMode,
        undefined,
        traderAddress,
      );
    },
    [openQuickBuy],
  );
  // The Social tab stays mounted under a pushed feed route; only the visible feed may reopen.
  usePostTradeShareReopen(
    reopenQuickBuy,
    isFocused ? PostTradeShareOwner.socialV1Feed : undefined,
  );
  const handleCopyTrade = useCallback(
    (
      item: SocialV1FeedItem,
      commentId: string | undefined,
      source: QuickBuySheetSource,
    ) => {
      const target = toSpotCopyTradeTarget(item);
      if (!target) {
        return;
      }

      openQuickBuy(
        target,
        commentId ? { commentId } : undefined,
        'buy',
        source,
        item.author.address,
      );
    },
    [openQuickBuy],
  );
  const handleTrendingCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      handleCopyTrade(item, commentId, SocialEvent.Source.SOCIAL_TRENDING);
    },
    [handleCopyTrade],
  );
  const handleLiveCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      handleCopyTrade(item, commentId, SocialEvent.Source.SOCIAL_LIVE_TRADES);
    },
    [handleCopyTrade],
  );
  const handleFollowingCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      handleCopyTrade(item, commentId, SocialEvent.Source.SOCIAL_FOLLOWING);
    },
    [handleCopyTrade],
  );

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

  const routes: TabViewRoute[] = useMemo(
    () =>
      tabOrder.map((tab) => ({
        key: tab,
        title: strings(SOCIAL_SHELL_TAB_CONFIG[tab].labelKey),
      })),
    [tabOrder],
  );
  const navigationState = useMemo(
    () => ({ index: activeIndex, routes }),
    [activeIndex, routes],
  );

  const resetTabScroll = useCallback(
    (index: number) => {
      const tabPage = {
        trending: { ref: trendingPageRef, scrollY: trendingScrollY },
        following: { ref: followingPageRef, scrollY: followingScrollY },
        live: { ref: livePageRef, scrollY: liveScrollY },
        leaderboard: { ref: leaderboardPageRef, scrollY: leaderboardScrollY },
      }[tabOrder[index]];
      if (!tabPage) {
        return;
      }
      tabPage.scrollY.value = 0;
      tabPage.ref.current?.scrollToOffset(0);
    },
    [
      followingScrollY,
      leaderboardScrollY,
      liveScrollY,
      tabOrder,
      trendingScrollY,
    ],
  );

  const selectTab = useCallback(
    (index: number, isTap = false) => {
      resetTabScroll(index);
      activeIndexSv.value = index;
      setActiveIndex(index);
      activate(index, isTap);
      livePrices?.requestVisibilityCheck(TAB_CHANGE_VISIBILITY_DELAY_MS);
    },
    [activate, activeIndexSv, livePrices, resetTabScroll],
  );

  const handlePagerRest = useCallback(() => {
    onPagerRest();
    const scrollValues = {
      trending: trendingScrollY,
      following: followingScrollY,
      live: liveScrollY,
      leaderboard: leaderboardScrollY,
    };
    tabOrder.forEach((tab, index) => {
      if (index !== activeIndex && scrollValues[tab].value !== 0) {
        resetTabScroll(index);
      }
    });
  }, [
    activeIndex,
    followingScrollY,
    leaderboardScrollY,
    liveScrollY,
    onPagerRest,
    resetTabScroll,
    tabOrder,
    trendingScrollY,
  ]);

  const changeTab = useCallback(
    (index: number) => {
      const tabChangeMethod = programmaticTabChangeRef.current
        ? SocialLeaderboardEventValues.TAB_CHANGE_METHOD.TAP
        : SocialLeaderboardEventValues.TAB_CHANGE_METHOD.SWIPE;
      programmaticTabChangeRef.current = false;

      if (activeIndex === index) {
        return;
      }

      track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION, {
        [SocialLeaderboardEventProperties.INTERACTION_TYPE]:
          SocialLeaderboardEventValues.FOLLOW_TRADING_INTERACTION_TYPE
            .TAB_CHANGED,
        [SocialLeaderboardEventProperties.TAB]: getTabAnalyticsValue(
          tabOrder[index],
        ),
        [SocialLeaderboardEventProperties.TAB_CHANGE_METHOD]: tabChangeMethod,
      });

      playSelection().catch(() => undefined);
      selectTab(
        index,
        tabChangeMethod === SocialLeaderboardEventValues.TAB_CHANGE_METHOD.TAP,
      );
    },
    [activeIndex, selectTab, tabOrder, track],
  );

  // The Social tab stays mounted, so a later entry point's `initialTab` (e.g.
  // a `?tab=` deeplink, or Trending after a post) has to move the pager here
  // and bring that page back to its top: a just-written post is pinned there,
  // and the feed only streams new posts in while it is near the top. Clearing
  // the param lets the same tab be requested again.
  const requestedTab = route.params?.initialTab;
  useEffect(() => {
    if (!requestedTab) {
      return;
    }
    navigation.setParams({ initialTab: undefined });
    const index = tabOrder.indexOf(requestedTab);
    if (index === -1) {
      return;
    }
    if (index !== activeIndex) {
      selectTab(index);
    }
    const requestedPage = {
      trending: { ref: trendingPageRef, scrollY: trendingScrollY },
      following: { ref: followingPageRef, scrollY: followingScrollY },
      live: { ref: livePageRef, scrollY: liveScrollY },
      leaderboard: { ref: leaderboardPageRef, scrollY: leaderboardScrollY },
    }[requestedTab];
    requestedPage.scrollY.value = 0;
    requestedPage.ref.current?.scrollToOffset(0);
  }, [
    activeIndex,
    followingScrollY,
    leaderboardScrollY,
    liveScrollY,
    navigation,
    requestedTab,
    selectTab,
    tabOrder,
    trendingScrollY,
  ]);

  const scrollPageToTop = useCallback(
    (index: number) => {
      const pageRef = {
        trending: trendingPageRef,
        following: followingPageRef,
        live: livePageRef,
        leaderboard: leaderboardPageRef,
      }[tabOrder[index]];
      pageRef?.current?.scrollToOffset(0, true);
    },
    [tabOrder],
  );

  // Marks the next index change as a tap. Pressing the active tab instead
  // scrolls its page back to the top.
  const handleTabPress = useCallback(
    (index: number) => {
      programmaticTabChangeRef.current = index !== activeIndex;
      if (index === activeIndex) {
        scrollPageToTop(index);
      }
    },
    [activeIndex, scrollPageToTop],
  );

  // Re-tapping Social in the bottom nav first scrolls the active page to the
  // top, then, once it's already there, returns to the first tab. Focus comes
  // from the last render: the tab's own `tabPress` listener navigates here
  // synchronously, so `navigation.isFocused()` is already true on a switch.
  useEffect(
    () =>
      tabNavigation.addListener('tabPress', () => {
        if (!isFocused) {
          return;
        }
        if (scrollY.value > 0) {
          scrollPageToTop(activeIndex);
          return;
        }
        if (activeIndex !== LANDING_INDEX) {
          programmaticTabChangeRef.current = true;
          changeTab(LANDING_INDEX);
        }
      }),
    [
      activeIndex,
      changeTab,
      isFocused,
      scrollPageToTop,
      scrollY,
      tabNavigation,
    ],
  );

  const renderTabBar = useCallback(
    (props: TabViewBarProps) => (
      <Animated.View
        onLayout={handleTabsLayout}
        testID={SocialV1ViewSelectorsIDs.TABS_CONTAINER}
        style={[
          tw.style('absolute left-0 right-0 z-10 pt-4'),
          { top: effectiveHeaderInset },
          tabsScrollStyle,
        ]}
      >
        <TabViewBar
          {...props}
          onTabPress={handleTabPress}
          testID={SocialV1ViewSelectorsIDs.TABS}
        />
      </Animated.View>
    ),
    [
      effectiveHeaderInset,
      handleTabPress,
      handleTabsLayout,
      tabsScrollStyle,
      tw,
    ],
  );

  const title = strings('homepage.sections.top_traders');

  const pageRefs = {
    trending: trendingPageRef,
    following: followingPageRef,
    live: livePageRef,
    leaderboard: leaderboardPageRef,
  };

  const renderPage = (
    tab: SocialShellTab,
    isPageActive: boolean,
    pageRef: React.RefObject<SocialTabPageHandle | null>,
  ) => {
    const testIds = PAGE_TEST_IDS[tab];
    switch (tab) {
      case 'leaderboard':
        return (
          <LeaderboardShellTabPage
            isActive={isPageActive}
            performance={socialPerformanceByTab.leaderboard}
            onScroll={scrollHandlers[tab]}
            contentTopInset={listTopInset}
            pageRef={pageRef}
            containerTestID={testIds.container}
            appliedFilters={applied.leaderboard}
            onOpenFilters={handleOpenLeaderboardFilters}
            isFilterActive={hasActiveFilters('leaderboard')}
            onClearFilters={() => clearAppliedFilters('leaderboard')}
            onTypeChange={setLeaderboardType}
          />
        );
      case 'live':
        return (
          <LiveView
            isActive={isPageActive}
            source={analyticsSource}
            onScroll={scrollHandlers[tab]}
            contentTopInset={listTopInset}
            pendingPostsTopOffset={pendingPostsTopOffset}
            pageRef={pageRef}
            onCopyTrade={handleLiveCopyTrade}
            onOpenFilters={handleOpenLiveFilters}
            isFilterActive={hasActiveFilters('live')}
            onClearFilters={() => clearAppliedFilters('live')}
            appliedFilters={applied.live}
          />
        );
      case 'trending':
        return (
          <TrendingView
            isActive={isPageActive}
            source={analyticsSource}
            performance={socialPerformanceByTab.trending}
            onScroll={scrollHandlers[tab]}
            contentTopInset={listTopInset}
            pendingPostsTopOffset={pendingPostsTopOffset}
            pageRef={pageRef}
            onCopyTrade={handleTrendingCopyTrade}
            onOpenFilters={handleOpenTrendingFilters}
            isFilterActive={hasActiveFilters('trending')}
            onClearFilters={() => clearAppliedFilters('trending')}
            appliedFilters={applied.trending}
            testID={testIds.container}
            scrollTestID={testIds.scroll}
          />
        );
      default:
        return (
          <FollowingView
            isActive={isPageActive}
            source={analyticsSource}
            performance={socialPerformanceByTab.following}
            onScroll={scrollHandlers[tab]}
            contentTopInset={listTopInset}
            pendingPostsTopOffset={pendingPostsTopOffset}
            pageRef={pageRef}
            onCopyTrade={handleFollowingCopyTrade}
            onOpenFilters={handleOpenFollowingFilters}
            isFilterActive={hasActiveFilters('following')}
            onClearFilters={() => clearAppliedFilters('following')}
            appliedFilters={applied.following}
            testID={testIds.container}
            scrollTestID={testIds.scroll}
          />
        );
    }
  };

  const renderScene = ({ route: sceneRoute }: { route: TabViewRoute }) => {
    const tab = sceneRoute.key as SocialShellTab;
    const isPageActive = pageActiveIndex === tabOrder.indexOf(tab);
    const testIds = PAGE_TEST_IDS[tab];
    return (
      <View
        style={tw.style('flex-1')}
        collapsable={false}
        testID={testIds.page}
      >
        <SocialFeedPageProviders
          isActive={isFocused && isPageActive}
          rotatesTraderStats={isFocused && isPageActive}
          windowOffsetY={pagerTopInset}
        >
          {isDeferredReady
            ? renderPage(tab, isPageActive, pageRefs[tab])
            : null}
        </SocialFeedPageProviders>
      </View>
    );
  };

  return (
    // Top and bottom edges are deliberately off — see
    // `SCROLLABLE_SCREEN_SAFE_AREA_EDGES`. The top inset comes from
    // `includesTopInset` (JS `marginTop` off the already resolved provider).
    <SocialEntryOptionsProvider>
      <SafeAreaView
        edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
        style={tw.style('flex-1 bg-default')}
        testID={SocialV1ViewSelectorsIDs.CONTAINER}
      >
        <HeaderStandardAnimatedGlass
          onLayout={handleHeaderLayout}
          includesTopInset
          scrollY={scrollY}
          titleSectionHeight={titleHeightSv}
          title={title}
          titleProps={{
            testID: SocialV1ViewSelectorsIDs.HEADER_TITLE,
          }}
          startAccessory={
            <Pressable
              onPress={handleOpenMyProfile}
              testID={SocialV1ViewSelectorsIDs.AVATAR_BUTTON}
              accessibilityRole="button"
              accessibilityLabel={strings(
                'social_leaderboard.my_profile.open_profile',
              )}
              // Header chrome is inset 8px. The feed tabs use 16px, so the
              // avatar needs the other 8px to share that left edge.
              style={tw.style('ml-2')}
            >
              <SocialHeaderGlassSurface twClassName="w-10 justify-center">
                {myProfile ? (
                  <ProfileAvatar
                    imageUrl={myProfile.imageUrl}
                    avatarPresetId={myProfile.avatarPresetId}
                    avatarBackgroundId={myProfile.avatarBackgroundId}
                    size="sm"
                  />
                ) : (
                  <AvatarAccount
                    address={accountAddress ?? ''}
                    variant={getAvatarAccountVariant(avatarAccountType)}
                    size={AvatarAccountSize.Sm}
                    testID={SocialV1ViewSelectorsIDs.ACCOUNT_AVATAR}
                  />
                )}
              </SocialHeaderGlassSurface>
            </Pressable>
          }
          endAccessory={
            <SocialHeaderGlassSurface twClassName="gap-2 px-2">
              <ButtonIcon
                iconName={IconName.Gift}
                iconProps={{ color: IconColor.IconDefault }}
                size={ButtonIconSize.Md}
                onPress={handleOpenRewards}
                accessibilityLabel={strings(
                  'wallet.rewards_accessibility_label',
                )}
                testID={SocialV1ViewSelectorsIDs.REWARDS_BUTTON}
                twClassName="bg-transparent"
              />
              <ButtonIcon
                iconName={IconName.FeedPost}
                iconProps={{ color: IconColor.IconDefault }}
                size={ButtonIconSize.Md}
                onPress={handleOpenComposer}
                testID={SocialV1ViewSelectorsIDs.PLUS_BUTTON}
                twClassName="bg-transparent"
              />
            </SocialHeaderGlassSurface>
          }
          testID={SocialV1ViewSelectorsIDs.HEADER}
        />

        {showNotificationsBanner && (
          <Box style={{ paddingTop: headerInset }}>
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
                testID={SocialV1ViewSelectorsIDs.NOTIFICATIONS_BANNER}
              />
            </Box>
          </Box>
        )}

        <Box twClassName="flex-1">
          <TabView
            navigationState={navigationState}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={changeTab}
            onSwipeEnd={handlePagerRest}
            initialLayout={TAB_VIEW_INITIAL_LAYOUT}
            lazy
            style={tw.style('flex-1')}
          />
        </Box>

        {openTab ? (
          <SocialFiltersBottomSheet
            tab={openTab}
            draft={draft}
            onChange={updateDraft}
            onApply={handleApplyFilters}
            onReset={resetDraftToDefaults}
            onClose={closeSheet}
          />
        ) : null}

        {quickBuySheet}
      </SafeAreaView>
    </SocialEntryOptionsProvider>
  );
};

const SocialV1View: React.FC = () => (
  <SocialLivePricesProvider>
    <SocialV1ViewContent />
  </SocialLivePricesProvider>
);

export default SocialV1View;
