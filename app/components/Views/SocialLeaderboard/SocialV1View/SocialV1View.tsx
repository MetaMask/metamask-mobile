import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, LayoutChangeEvent, Pressable, View } from 'react-native';
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
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
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
import {
  SOCIAL_V1_TAB_ORDER,
  SOCIAL_SHELL_TAB_CONFIG,
} from '../shell/tabConfig';
import type { SocialShellTab } from '../shell/types';
import {
  SocialFiltersBottomSheet,
  useSocialShellFilters,
} from '../shell/filters';
import superheroAvatar from '../../../../images/socialV1/superhero.png';

const LANDING_INDEX = 0;

const PAGE_TEST_IDS: Record<
  SocialShellTab,
  {
    page: string;
    container: string;
    scroll: string;
  }
> = {
  feed: {
    page: SocialV1ViewSelectorsIDs.FEED_PAGE,
    container: `${SocialV1ViewSelectorsIDs.FEED_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.FEED_PAGE}-scroll`,
  },
  liveTrades: {
    page: SocialV1ViewSelectorsIDs.LIVE_TRADES_PAGE,
    container: `${SocialV1ViewSelectorsIDs.LIVE_TRADES_PAGE}-content`,
    scroll: `${SocialV1ViewSelectorsIDs.LIVE_TRADES_PAGE}-scroll`,
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

const getTabAnalyticsValue = (tab: SocialShellTab) => {
  switch (tab) {
    case 'feed':
      return SocialLeaderboardEventValues.TAB.FEED;
    case 'liveTrades':
      return SocialLeaderboardEventValues.TAB.LIVE_TRADES;
    case 'leaderboard':
      return SocialLeaderboardEventValues.TAB.LEADERBOARD;
    default:
      return tab satisfies never;
  }
};

/**
 * Social Bundle V1 Follow Trading home: Feed | Live trades | Leaderboard
 * under a collapsing header. Opened only for TSA-1122 treatment.
 */
const SocialV1View: React.FC = () => {
  const tw = useTailwind();
  const route = useRoute<RouteProp<RootStackParamList, 'SocialV1View'>>();
  const { track } = useSocialLeaderboardAnalytics();
  const pagerRef = useRef<PagerView>(null);
  const programmaticTabChangeRef = useRef(false);

  useABTest(SOCIAL_V1_AB_KEY, SOCIAL_V1_VARIANTS, SOCIAL_V1_EXPOSURE_METADATA);
  const tabOrder = SOCIAL_V1_TAB_ORDER;
  const feedIndex = tabOrder.indexOf('feed');
  const liveTradesIndex = tabOrder.indexOf('liveTrades');
  // The landing tab is the first one, so the surface always opens on index 0.
  const [activeIndex, setActiveIndex] = useState(LANDING_INDEX);

  // Unified filter state for the V1 shell (TSA-1115). Per-tab applied/draft
  // state; the sheet is mounted only while `openTab` is non-null.
  const {
    openTab,
    draft,
    hasActiveFilters,
    openSheet,
    closeSheet,
    updateDraft,
    applyFilters,
  } = useSocialShellFilters();
  const activeTab = tabOrder[activeIndex];
  const isFilterActive = hasActiveFilters(activeTab);

  const handleFilterPress = useCallback(() => {
    openSheet(activeTab);
  }, [activeTab, openSheet]);

  // Each page scrolls independently, so keep a scroll offset per tab and let a
  // derived value expose whichever one is currently visible. Sharing a single
  // offset would leave the header collapsed after swiping to an unscrolled page.
  // On tab change the incoming page is scrolled into agreement with the outgoing
  // one (see `syncIncomingPageScroll`) so the header never flips.
  const leaderboardScrollY = useSharedValue(0);
  const feedScrollY = useSharedValue(0);
  const liveTradesScrollY = useSharedValue(0);
  const leaderboardPageRef = useRef<SocialTabPageHandle>(null);
  const feedPageRef = useRef<SocialTabPageHandle>(null);
  const liveTradesPageRef = useRef<SocialTabPageHandle>(null);
  const activeIndexSv = useSharedValue(LANDING_INDEX);
  const feedIndexSv = useSharedValue(feedIndex);
  const liveTradesIndexSv = useSharedValue(liveTradesIndex);
  const scrollY = useDerivedValue(() => {
    if (activeIndexSv.value === feedIndexSv.value) {
      return feedScrollY.value;
    }
    if (activeIndexSv.value === liveTradesIndexSv.value) {
      return liveTradesScrollY.value;
    }
    return leaderboardScrollY.value;
  });

  const leaderboardScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      leaderboardScrollY.value = event.contentOffset.y;
    },
  });
  const feedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      feedScrollY.value = event.contentOffset.y;
    },
  });
  const liveTradesScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      liveTradesScrollY.value = event.contentOffset.y;
    },
  });
  const scrollHandlers: Record<
    SocialShellTab,
    ReturnType<typeof useAnimatedScrollHandler>
  > = {
    feed: feedScrollHandler,
    liveTrades: liveTradesScrollHandler,
    leaderboard: leaderboardScrollHandler,
  };

  // Height of the large title only: the compact header title crossfades in and
  // the title slides fully behind the header once scrolled past this distance.
  // The tabs bar stops there so it stays pinned under the header.
  const titleHeightSv = useSharedValue(0);
  const [titleHeight, setTitleHeight] = useState(0);

  const handleTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      titleHeightSv.value = height;
      setTitleHeight(height);
    },
    [titleHeightSv],
  );

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
        if (index === feedIndex) {
          return feedScrollY.value;
        }
        if (index === liveTradesIndex) {
          return liveTradesScrollY.value;
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
      if (nextIndex === feedIndex) {
        feedScrollY.value = target;
      } else if (nextIndex === liveTradesIndex) {
        liveTradesScrollY.value = target;
      } else {
        leaderboardScrollY.value = target;
      }

      const incomingPage =
        nextIndex === feedIndex
          ? feedPageRef
          : nextIndex === liveTradesIndex
            ? liveTradesPageRef
            : leaderboardPageRef;
      incomingPage.current?.scrollToOffset(target);
    },
    [
      activeIndex,
      feedIndex,
      feedScrollY,
      leaderboardScrollY,
      liveTradesIndex,
      liveTradesScrollY,
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

  const handlePlaceholderHeaderAction = useCallback(() => undefined, []);

  // One-shot nudge shown when onboarding reports the user tapped "Allow
  // notifications" but the OS denied it. Seeded from the route param so it only
  // appears on that hand-off, never on normal tab visits.
  const [showNotificationsBanner, setShowNotificationsBanner] = useState(
    Boolean(route.params?.showNotificationsBanner),
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
      syncIncomingPageScroll(index);
      activeIndexSv.value = index;
      setActiveIndex(index);
    },
    [activeIndex, activeIndexSv, tabOrder, syncIncomingPageScroll, track],
  );

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
            onPress={handlePlaceholderHeaderAction}
            testID={SocialV1ViewSelectorsIDs.AVATAR_BUTTON}
            accessibilityRole="button"
          >
            <Image
              source={superheroAvatar}
              style={tw.style('w-8 h-8 rounded-full')}
            />
          </Pressable>
        }
        endAccessory={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <ButtonIcon
              iconName={IconName.Star}
              size={ButtonIconSize.Md}
              onPress={handlePlaceholderHeaderAction}
              testID={SocialV1ViewSelectorsIDs.HEART_BUTTON}
            />
            <ButtonIcon
              iconName={IconName.Add}
              size={ButtonIconSize.Md}
              onPress={handlePlaceholderHeaderAction}
              testID={SocialV1ViewSelectorsIDs.PLUS_BUTTON}
            />
          </Box>
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
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="bg-default mt-4"
          >
            <Box twClassName="flex-1">
              <TabsBar
                tabs={tabs}
                activeIndex={activeIndex}
                onTabPress={handleTabPress}
                testID={SocialV1ViewSelectorsIDs.TABS}
              />
            </Box>
            <Box twClassName="pr-4">
              <ButtonIcon
                iconName={IconName.Filter}
                size={ButtonIconSize.Md}
                onPress={handleFilterPress}
                testID={SocialV1ViewSelectorsIDs.FILTER_BUTTON}
                accessibilityLabel={strings(
                  'social_leaderboard.shell.filters.title',
                )}
                twClassName={isFilterActive ? 'bg-background-muted' : undefined}
              />
            </Box>
          </Box>

          {/* Pages are rendered in `tabOrder` so the pager positions stay
              aligned with the tabs bar. */}
          <PagerView
            ref={pagerRef}
            style={tw.style('flex-1 mt-4')}
            initialPage={LANDING_INDEX}
            onPageSelected={handlePageSelected}
            testID={SocialV1ViewSelectorsIDs.PAGER}
          >
            {tabOrder.map((tab) => {
              const testIds = PAGE_TEST_IDS[tab];
              const pageRef =
                tab === 'feed'
                  ? feedPageRef
                  : tab === 'liveTrades'
                    ? liveTradesPageRef
                    : leaderboardPageRef;
              return (
                <View
                  key={tab}
                  style={tw.style('flex-1')}
                  collapsable={false}
                  testID={testIds.page}
                >
                  <EmptyShellTabPage
                    tab={tab}
                    onScroll={scrollHandlers[tab]}
                    pageRef={pageRef}
                    containerTestID={testIds.container}
                    scrollTestID={testIds.scroll}
                  />
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
          onApply={applyFilters}
          onClose={closeSheet}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default SocialV1View;
