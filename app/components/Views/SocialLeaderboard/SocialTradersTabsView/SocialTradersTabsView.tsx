import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, View } from 'react-native';
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
import { useOpenSocialNotificationPreferences } from '../hooks/useOpenSocialNotificationPreferences';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import FeedView from '../FeedView';
import FeedSpotBuyAction, {
  type FeedSpotBuyActionHandle,
} from '../FeedView/components/FeedSpotBuyAction';
import { usePrefetchTraderFeeds } from '../FeedView/hooks/usePrefetchTraderFeeds';
import TopTradersView from '../TopTradersView';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';
import { useABTest } from '../../../../hooks/useABTest';
import {
  LEADERBOARD_LANDING_FEED_AB_KEY,
  LEADERBOARD_LANDING_FEED_EXPOSURE_METADATA,
  LEADERBOARD_LANDING_FEED_VARIANTS,
} from './abTestConfig';

type SocialTradersTab = 'leaderboard' | 'feed';

/**
 * Left-to-right tab order. The landing tab comes first so the preselected tab
 * is always the leftmost one (TSA-1042): the default keeps Leaderboard first,
 * and a feed landing swaps them.
 */
const DEFAULT_TAB_ORDER: readonly SocialTradersTab[] = ['leaderboard', 'feed'];
const FEED_FIRST_TAB_ORDER: readonly SocialTradersTab[] = [
  'feed',
  'leaderboard',
];
const LANDING_INDEX = 0;

// How long the post-onboarding "turn on notifications" nudge stays up before it
// auto-dismisses (ms). Long enough to notice and act on after landing here, but
// still transient so it never becomes permanent chrome.
const NOTIFICATIONS_BANNER_AUTO_DISMISS_MS = 20000;

const getTabAnalyticsValue = (tab: SocialTradersTab) =>
  tab === 'feed'
    ? SocialLeaderboardEventValues.TAB.FEED
    : SocialLeaderboardEventValues.TAB.LEADERBOARD;

/**
 * Follow Trading surface: Leaderboard | Feed tabs, collapsing title, and
 * notification bell. The leaderboard page and activity feed sit in swipeable
 * pages under a shared header.
 *
 * Tab order follows the entry point's requested landing tab, so the tab the
 * surface opens on is always the leftmost one. Indices are therefore derived
 * from `tabOrder` rather than hardcoded.
 */
const SocialTradersTabsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TopTradersView'>>();
  const { track } = useSocialLeaderboardAnalytics();
  // Wait until the visible leaderboard query settles before warming feed
  // pages, so those requests never contend with the landing list fetch.
  const [isLeaderboardSettled, setIsLeaderboardSettled] = useState(false);
  const handleVisibleLeaderboardSettled = useCallback(() => {
    setIsLeaderboardSettled(true);
  }, []);
  usePrefetchTraderFeeds(isLeaderboardSettled);
  const pagerRef = useRef<PagerView>(null);
  const programmaticTabChangeRef = useRef(false);

  // TSA-1042 landing A/B test. The variant is resolved by the entry point and
  // arrives as route params, so the landing itself is driven by `landingTab`;
  // this read exists to emit `Experiment Viewed` at the moment the surface
  // actually opens from that entry point. Entry points that don't send
  // `landingTab` (nav tab, deeplink, notification, onboarding hand-off) never
  // count as exposed and keep the leaderboard landing.
  const landingTab = route.params?.landingTab;
  useABTest(
    LEADERBOARD_LANDING_FEED_AB_KEY,
    LEADERBOARD_LANDING_FEED_VARIANTS,
    {
      ...LEADERBOARD_LANDING_FEED_EXPOSURE_METADATA,
      trackExposure: Boolean(landingTab),
    },
  );
  // Read once: a param change mid-mount must not reshuffle the tabs or yank the
  // user across pages.
  const tabOrderRef = useRef(
    landingTab === 'feed' ? FEED_FIRST_TAB_ORDER : DEFAULT_TAB_ORDER,
  );
  const tabOrder = tabOrderRef.current;
  const feedIndex = tabOrder.indexOf('feed');
  // The landing tab is the first one, so the surface always opens on index 0.
  const [activeIndex, setActiveIndex] = useState(LANDING_INDEX);

  // Each page scrolls independently, so keep a scroll offset per tab and let a
  // derived value expose whichever one is currently visible. Sharing a single
  // offset would leave the header collapsed after swiping to an unscrolled page.
  // On tab change the incoming page is scrolled into agreement with the outgoing
  // one (see `syncIncomingPageScroll`) so the header never flips.
  const leaderboardScrollY = useSharedValue(0);
  const feedScrollY = useSharedValue(0);
  const leaderboardPageRef = useRef<SocialTabPageHandle>(null);
  const feedPageRef = useRef<SocialTabPageHandle>(null);
  const activeIndexSv = useSharedValue(LANDING_INDEX);
  const feedIndexSv = useSharedValue(feedIndex);
  const scrollY = useDerivedValue(() =>
    activeIndexSv.value === feedIndexSv.value
      ? feedScrollY.value
      : leaderboardScrollY.value,
  );

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

      const isFeedIncoming = nextIndex === feedIndex;
      const outgoingOffset = isFeedIncoming
        ? leaderboardScrollY.value
        : feedScrollY.value;
      const incomingOffset = isFeedIncoming
        ? feedScrollY.value
        : leaderboardScrollY.value;

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
      if (isFeedIncoming) {
        feedScrollY.value = target;
      } else {
        leaderboardScrollY.value = target;
      }

      const incomingPage = isFeedIncoming ? feedPageRef : leaderboardPageRef;
      incomingPage.current?.scrollToOffset(target);
    },
    [titleHeight, feedIndex, leaderboardScrollY, feedScrollY],
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

  // The spot Buy orchestrator (QuickBuy sheet / swaps A/B) is hosted here,
  // outside the PagerView, so its QuickBuy sheet isn't clipped by the pager page
  // and the content behind it stays interactive (no backdrop, tap/swipe-through).
  // FeedView reports spot availability and triggers the buy via this ref.
  const buyActionRef = useRef<FeedSpotBuyActionHandle | null>(null);
  const [feedHasSpotItem, setFeedHasSpotItem] = useState(false);
  // A Buy can be requested in the same tick the feed first renders spot rows —
  // before the availability effect has mounted the orchestrator. Buffer that
  // request (and mount the orchestrator now) so the tap is never a silent no-op.
  const pendingBuyTargetRef = useRef<QuickBuyTarget | null>(null);

  const flushPendingBuy = useCallback(() => {
    const pending = pendingBuyTargetRef.current;
    if (!pending || !buyActionRef.current) {
      return;
    }
    buyActionRef.current.open(pending);
    pendingBuyTargetRef.current = null;
  }, []);

  const setBuyActionRef = useCallback(
    (instance: FeedSpotBuyActionHandle | null) => {
      buyActionRef.current = instance;
      if (instance) {
        flushPendingBuy();
      }
    },
    [flushPendingBuy],
  );

  const handleFeedSpotAvailabilityChange = useCallback(
    (hasSpotItem: boolean) => {
      if (!hasSpotItem) {
        pendingBuyTargetRef.current = null;
      }
      setFeedHasSpotItem(hasSpotItem);
    },
    [],
  );

  const handleQuickBuy = useCallback((target: QuickBuyTarget) => {
    if (buyActionRef.current) {
      buyActionRef.current.open(target);
      return;
    }
    pendingBuyTargetRef.current = target;
    setFeedHasSpotItem(true);
  }, []);

  // Backup flush when spot availability flips to true (callback ref handles
  // the common case where feedHasSpotItem was already true).
  useLayoutEffect(() => {
    if (!feedHasSpotItem) {
      return;
    }
    flushPendingBuy();
  }, [feedHasSpotItem, flushPendingBuy]);

  const { openNotificationPreferences } =
    useOpenSocialNotificationPreferences();

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
        label:
          tab === 'feed'
            ? strings('social_leaderboard.feed.tabs.feed')
            : strings('social_leaderboard.feed.tabs.leaderboard'),
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    // Top and bottom edges are deliberately off — see
    // `SCROLLABLE_SCREEN_SAFE_AREA_EDGES`. The top inset comes from
    // `includesTopInset` (JS `marginTop` off the already resolved provider).
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialTradersTabsViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardAnimated
        includesTopInset
        scrollY={scrollY}
        titleSectionHeight={titleHeightSv}
        title={strings('social_leaderboard.feed.title')}
        titleProps={{
          testID: SocialTradersTabsViewSelectorsIDs.HEADER_TITLE,
        }}
        onBack={handleBack}
        backButtonProps={{
          testID: SocialTradersTabsViewSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Notification,
            onPress: openNotificationPreferences,
            testID: SocialTradersTabsViewSelectorsIDs.NOTIFICATION_BUTTON,
          },
        ]}
        testID={SocialTradersTabsViewSelectorsIDs.HEADER}
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
            testID={SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER}
          />
        </Box>
      )}

      {/* `overflow-hidden` clips the title as the block slides up so it
          disappears *under* the fixed header (revealing the compact title)
          instead of scrolling over the back button / notification bell. */}
      <Box twClassName="flex-1 overflow-hidden">
        <Animated.View
          style={[
            tw.style('absolute top-0 left-0 right-0'),
            collapsingBlockStyle,
          ]}
        >
          <Box
            twClassName="px-4 pt-2 pb-3 bg-default"
            onLayout={handleTitleLayout}
          >
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              testID={SocialTradersTabsViewSelectorsIDs.TITLE}
            >
              {strings('social_leaderboard.feed.title')}
            </Text>
          </Box>

          <Box twClassName="bg-default">
            <TabsBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              testID={SocialTradersTabsViewSelectorsIDs.TABS}
            />
          </Box>

          {/* Pages are rendered in `tabOrder` so the pager positions stay
              aligned with the tabs bar. */}
          <PagerView
            ref={pagerRef}
            style={tw.style('flex-1')}
            initialPage={LANDING_INDEX}
            onPageSelected={handlePageSelected}
            testID={SocialTradersTabsViewSelectorsIDs.PAGER}
          >
            {tabOrder.map((tab) =>
              tab === 'leaderboard' ? (
                <View
                  key="leaderboard"
                  style={tw.style('flex-1')}
                  collapsable={false}
                  testID={SocialTradersTabsViewSelectorsIDs.LEADERBOARD_PAGE}
                >
                  <TopTradersView
                    onScroll={leaderboardScrollHandler}
                    pageRef={leaderboardPageRef}
                    onVisibleLeaderboardSettled={
                      handleVisibleLeaderboardSettled
                    }
                  />
                </View>
              ) : (
                <View
                  key="feed"
                  style={tw.style('flex-1')}
                  collapsable={false}
                  testID={SocialTradersTabsViewSelectorsIDs.FEED_PAGE}
                >
                  <FeedView
                    isActive={activeIndex === feedIndex}
                    initialAudience={route.params?.landingFeedAudience}
                    onQuickBuy={handleQuickBuy}
                    onSpotAvailabilityChange={handleFeedSpotAvailabilityChange}
                    onScroll={feedScrollHandler}
                    pageRef={feedPageRef}
                  />
                </View>
              ),
            )}
          </PagerView>
        </Animated.View>
      </Box>

      {feedHasSpotItem && (
        <FeedSpotBuyAction
          ref={setBuyActionRef}
          isActive={activeIndex === feedIndex}
        />
      )}
    </SafeAreaView>
  );
};

export default SocialTradersTabsView;
