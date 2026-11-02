import {
  AvatarAccount,
  AvatarAccountSize,
  BannerAlert,
  BannerAlertSeverity,
  Box,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandardAnimated,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import { useABTest } from '../../../../hooks/useABTest';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_EXPOSURE_METADATA,
  SOCIAL_V1_VARIANTS,
} from './abTestConfig';
import EmptyShellTabPage from '../shell/EmptyShellTabPage';
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
import { TraderStatRotationContext } from '../../../UI/SocialFeed/components/TraderStatRotationContext';
import SocialLivePricesProvider from '../../../UI/SocialFeed/live/SocialLivePricesProvider';
import { useSocialLivePrices } from '../../../UI/SocialFeed/live/SocialLivePricesContext';
import SocialHeaderGlassSurface from '../components/SocialHeaderGlassSurface';
import Routes from '../../../../constants/navigation/Routes';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { useMyProfile } from '../MyProfileView/hooks';
import { useOpenSocialPostComposer } from '../hooks/useOpenSocialPostComposer';
import { markSocialTabVisited } from '../utils/socialTabVisit';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import { chainNameToId } from '../../../UI/SocialFeed/utils/chainMapping';
import {
  TOP_TRADERS_QUICK_BUY_FEATURES,
  type QuickBuyTarget,
  type QuickBuyTradeMode,
} from '../../../UI/QuickBuy';
import { useQuickBuySheet } from '../../../UI/QuickBuy/QuickBuySheetHost';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import {
  PostTradeShareOwner,
  usePostTradeShareReopen,
} from '../PostTradeShareBottomSheet';
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

/**
 * Social Bundle V1 Follow Trading home: Trending | Following | Leaderboard |
 * Live under a collapsing header. Opened only for TSA-1122 treatment.
 */
const SocialV1ViewContent: React.FC = () => {
  const tw = useTailwind();
  const livePrices = useSocialLivePrices();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'SocialV1View' | 'SocialLeaderboardTab'>
    >();
  const analyticsSource = getSocialEventSource(route.params?.source);
  const { profile: myProfile } = useMyProfile();
  const accountAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const { openComposer } = useOpenSocialPostComposer();
  const { track } = useSocialLeaderboardAnalytics();
  const pagerRef = useRef<PagerView>(null);
  const programmaticTabChangeRef = useRef(false);
  const isSocialV1Treatment = useSelector(selectIsSocialV1Enabled);
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const [hardwareTier] = useState(() => getHardwareTier());

  useABTest(SOCIAL_V1_AB_KEY, SOCIAL_V1_VARIANTS, SOCIAL_V1_EXPOSURE_METADATA);
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
  const socialPerformanceByTab = useMemo(
    () =>
      ({
        trending: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: activeIndex === trendingIndex,
          isFocused,
          networkTier,
        },
        following: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: activeIndex === followingIndex,
          isFocused,
          networkTier,
        },
        leaderboard: {
          enabled: isSocialV1Treatment,
          hardwareTier,
          isActive: activeIndex === leaderboardIndex,
          isFocused,
          networkTier,
        },
      }) satisfies Record<
        Exclude<SocialShellTab, 'live'>,
        SocialPerformanceContext
      >,
    [
      activeIndex,
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
  // derived value expose whichever one is currently visible. Sharing a single
  // offset would leave the header collapsed after swiping to an unscrolled page.
  // On tab change the incoming page is scrolled into agreement with the outgoing
  // one (see `syncIncomingPageScroll`) so the header never flips.
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

  // Height of the large title only: the compact header title crossfades in and
  // the title slides fully behind the header once scrolled past this distance.
  // The tabs bar stops there so it stays pinned under the header.
  const titleHeightSv = useSharedValue(0);
  const titleHeight = 0;

  /**
   * Brings the incoming page's scroll offset into agreement with the outgoing
   * one over the header's collapse range, so switching tabs never flips the
   * title between its collapsed and expanded states.
   *
   * Only the first `titleHeight` pixels drive the collapse, so that's all we
   * sync: once the outgoing page is past it the header is fully collapsed and
   * the incoming page only has to clear the same threshold, which preserves a
   * deeper reading position instead of yanking it back to the top.
   */
  const syncIncomingPageScroll = useCallback(
    (nextIndex: number) => {
      const collapseRange = titleHeight;
      if (collapseRange <= 0) {
        return;
      }

      const getOffset = (index: number) => {
        if (index === trendingIndex) {
          return trendingScrollY.value;
        }
        if (index === followingIndex) {
          return followingScrollY.value;
        }
        if (index === liveIndex) {
          return liveScrollY.value;
        }
        return leaderboardScrollY.value;
      };
      const outgoingOffset = getOffset(activeIndex);
      const incomingOffset = getOffset(nextIndex);

      const target =
        outgoingOffset >= collapseRange
          ? Math.max(incomingOffset, collapseRange)
          : outgoingOffset;

      if (target === incomingOffset) {
        return;
      }

      // Write the shared value up front: `scrollY` switches to the incoming page
      // the moment `activeIndexSv` flips, and the native scroll only reports back
      // a frame later — without this the header would collapse/expand for that
      // frame before settling.
      if (nextIndex === trendingIndex) {
        trendingScrollY.value = target;
      } else if (nextIndex === followingIndex) {
        followingScrollY.value = target;
      } else if (nextIndex === liveIndex) {
        liveScrollY.value = target;
      } else {
        leaderboardScrollY.value = target;
      }

      const incomingPage =
        nextIndex === trendingIndex
          ? trendingPageRef
          : nextIndex === followingIndex
            ? followingPageRef
            : nextIndex === liveIndex
              ? livePageRef
              : leaderboardPageRef;
      incomingPage.current?.scrollToOffset(target);
    },
    [
      activeIndex,
      followingIndex,
      followingScrollY,
      trendingIndex,
      trendingScrollY,
      leaderboardScrollY,
      liveIndex,
      liveScrollY,
      titleHeight,
    ],
  );

  // The title, tabs, and pager form one normal-flow column that slides up as
  // the active page scrolls, clamped so the tabs settle flush under the header
  // instead of scrolling off. Because the pages lay out below the title/tabs in
  // flow, the very first frame is already correct — nothing depends on a
  // measured inset, so navigating here never flashes mispositioned content.
  //
  // `bottom: -titleHeight` overdraws the block below the fold by the collapse
  // distance so the pager still reaches the bottom of the screen once the block
  // is translated up. Before the title measures it's 0, which is exactly the
  // resting layout.
  //
  // The lower clamp (>= 0) keeps the block pinned at rest during pull-to-
  // refresh overscroll: without it a negative scroll offset drives the block
  // *downward*, so it re-tracks the bounce through this derived value while the
  // list content springs back natively — the two desync and the return motion
  // looks erratic. Pinning the block lets only the content bounce.
  const collapsingBlockStyle = useAnimatedStyle(() => {
    const maxShift = titleHeightSv.value;
    const shift =
      maxShift > 0 ? Math.max(0, Math.min(scrollY.value, maxShift)) : 0;
    return {
      bottom: -maxShift,
      transform: [{ translateY: -shift }],
    };
  });

  const handleOpenMyProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MY_PROFILE);
  }, [navigation]);

  const handleOpenComposer = useCallback(() => {
    playSelection().catch(() => undefined);
    openComposer();
  }, [openComposer]);

  const handleOpenRewards = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

  // One-shot nudge shown when onboarding reports the user tapped "Allow
  // notifications" but the OS denied it. Seeded from the route param so it only
  // appears on that hand-off, never on normal tab visits.
  const [showNotificationsBanner, setShowNotificationsBanner] = useState(
    Boolean(route.params?.showNotificationsBanner),
  );

  // Rendered outside the PagerView, where a page would clip the inline sheet; null inside the home tabs host.
  const { openQuickBuy: showQuickBuy, quickBuySheet } = useQuickBuySheet();
  const openQuickBuy = useCallback(
    (
      target: QuickBuyTarget,
      copyTradeOrigin?: CopyTradeOrigin,
      tradeMode: QuickBuyTradeMode = 'buy',
    ) =>
      showQuickBuy({
        target,
        copyTradeOrigin,
        features: TOP_TRADERS_QUICK_BUY_FEATURES,
        initialTradeMode: tradeMode,
        analyticsContext: { source: 'trader_feed' },
        postTradeShare: true,
        postTradeShareOwner: PostTradeShareOwner.socialV1Feed,
      }),
    [showQuickBuy],
  );
  // The Social tab stays mounted under a pushed feed route; only the visible feed may reopen.
  usePostTradeShareReopen(
    openQuickBuy,
    isFocused ? PostTradeShareOwner.socialV1Feed : undefined,
  );
  const handleCopyTrade = useCallback(
    (item: SocialV1FeedItem, commentId?: string) => {
      if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
        return;
      }

      const chain = chainNameToId(item.asset.avatar.chain);
      const tokenAddress = item.asset.avatar.tokenAddress.trim();
      if (!chain || !tokenAddress) {
        return;
      }

      openQuickBuy(
        {
          tokenAddress,
          tokenSymbol: item.asset.symbol,
          tokenName: item.asset.name ?? item.asset.symbol,
          chain,
        },
        commentId ? { commentId } : undefined,
      );
    },
    [openQuickBuy],
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

  // `content` is unused: the pages live in the PagerView below so they stay
  // swipeable, and TabsBar renders the bar only.
  const tabs: TabItem[] = useMemo(
    () =>
      tabOrder.map((tab) => ({
        key: tab,
        label: strings(SOCIAL_SHELL_TAB_CONFIG[tab].labelKey),
        content: null,
      })),
    [tabOrder],
  );

  const selectTab = useCallback(
    (index: number) => {
      syncIncomingPageScroll(index);
      activeIndexSv.value = index;
      setActiveIndex(index);
      livePrices?.requestVisibilityCheck(TAB_CHANGE_VISIBILITY_DELAY_MS);
    },
    [activeIndexSv, livePrices, syncIncomingPageScroll],
  );

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
      selectTab(index);
    },
    [activeIndex, selectTab, tabOrder, track],
  );

  // The Social tab stays mounted, so a later entry point's `initialTab` (e.g.
  // a `?tab=` deeplink) has to move the pager here. Clearing it lets the same
  // tab be requested again.
  const requestedTab = route.params?.initialTab;
  useEffect(() => {
    if (!requestedTab) {
      return;
    }
    navigation.setParams({ initialTab: undefined });
    const index = tabOrder.indexOf(requestedTab);
    if (index !== -1 && index !== activeIndex) {
      selectTab(index);
    }
  }, [activeIndex, navigation, requestedTab, selectTab, tabOrder]);

  const handleTabPress = useCallback(
    (index: number) => {
      programmaticTabChangeRef.current = true;
      pagerRef.current?.setPage(index);
      changeTab(index);
    },
    [changeTab],
  );

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      changeTab(e.nativeEvent.position);
    },
    [changeTab],
  );

  useEffect(() => {
    pagerRef.current?.setPage(activeIndex);
  }, [activeIndex]);

  const title = strings('homepage.sections.top_traders');

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
        <HeaderStandardAnimated
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
                iconName={IconName.Edit}
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
        )}

        {/* `overflow-hidden` clips the title as the block slides up so it
          disappears *under* the fixed header (revealing the compact title)
          instead of scrolling over the header actions. */}
        <Box twClassName="flex-1 overflow-hidden">
          <Animated.View
            style={[
              tw.style('absolute top-0 left-0 right-0'),
              collapsingBlockStyle,
            ]}
          >
            <Box twClassName="bg-default mt-4">
              <TabsBar
                tabs={tabs}
                activeIndex={activeIndex}
                onTabPress={handleTabPress}
                testID={SocialV1ViewSelectorsIDs.TABS}
              />
            </Box>

            {/* Flush with the tab underline. A top margin would clip the
              pages in a band below the bar instead of at the underline. */}
            <PagerView
              ref={pagerRef}
              style={tw.style('flex-1')}
              initialPage={landingIndex}
              onPageSelected={handlePageSelected}
              testID={SocialV1ViewSelectorsIDs.PAGER}
            >
              {tabOrder.map((tab, pageIndex) => {
                const testIds = PAGE_TEST_IDS[tab];
                const pageRef =
                  tab === 'trending'
                    ? trendingPageRef
                    : tab === 'following'
                      ? followingPageRef
                      : tab === 'live'
                        ? livePageRef
                        : leaderboardPageRef;
                return (
                  <View
                    key={tab}
                    style={tw.style('flex-1')}
                    collapsable={false}
                    testID={testIds.page}
                  >
                    <TraderStatRotationContext.Provider
                      value={activeIndex === pageIndex}
                    >
                      {tab === 'leaderboard' ? (
                        <LeaderboardShellTabPage
                          isActive={activeIndex === leaderboardIndex}
                          performance={socialPerformanceByTab.leaderboard}
                          onScroll={scrollHandlers[tab]}
                          pageRef={pageRef}
                          containerTestID={testIds.container}
                          appliedFilters={applied.leaderboard}
                          onOpenFilters={handleOpenLeaderboardFilters}
                          isFilterActive={hasActiveFilters('leaderboard')}
                          onClearFilters={() =>
                            clearAppliedFilters('leaderboard')
                          }
                          onTypeChange={setLeaderboardType}
                        />
                      ) : tab === 'live' ? (
                        <LiveView
                          isActive={activeIndex === liveIndex}
                          source={analyticsSource}
                          onScroll={scrollHandlers[tab]}
                          pageRef={pageRef}
                          onCopyTrade={handleCopyTrade}
                          onOpenFilters={handleOpenLiveFilters}
                          isFilterActive={hasActiveFilters('live')}
                          onClearFilters={() => clearAppliedFilters('live')}
                          appliedFilters={applied.live}
                        />
                      ) : tab === 'trending' ? (
                        <TrendingView
                          isActive={activeIndex === trendingIndex}
                          source={analyticsSource}
                          performance={socialPerformanceByTab.trending}
                          onScroll={scrollHandlers[tab]}
                          pageRef={pageRef}
                          onCopyTrade={handleCopyTrade}
                          onOpenFilters={handleOpenTrendingFilters}
                          isFilterActive={hasActiveFilters('trending')}
                          onClearFilters={() => clearAppliedFilters('trending')}
                          appliedFilters={applied.trending}
                          testID={testIds.container}
                          scrollTestID={testIds.scroll}
                        />
                      ) : (
                        <EmptyShellTabPage
                          tab={tab}
                          source={analyticsSource}
                          performance={socialPerformanceByTab[tab]}
                          isActive={activeIndex === followingIndex}
                          onScroll={scrollHandlers[tab]}
                          pageRef={pageRef}
                          containerTestID={testIds.container}
                          scrollTestID={testIds.scroll}
                          onOpenFilters={handleOpenFollowingFilters}
                          isFilterActive={hasActiveFilters('following')}
                          onClearFilters={() =>
                            clearAppliedFilters('following')
                          }
                          appliedFilters={applied.following}
                          onQuickBuy={openQuickBuy}
                        />
                      )}
                    </TraderStatRotationContext.Provider>
                  </View>
                );
              })}
            </PagerView>
          </Animated.View>
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
