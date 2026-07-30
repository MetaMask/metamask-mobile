import {
  Box,
  HeaderStandardAnimated,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
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
import Routes from '../../../../constants/navigation/Routes';
import { playSelection } from '../../../../util/haptics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useNotificationStoragePreferences } from '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';
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
import TopTradersView from '../TopTradersView';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import type { QuickBuyTarget } from '../TraderPositionView/components/QuickBuy';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';

const LEADERBOARD_INDEX = 0;
const FEED_INDEX = 1;

const getTabAnalyticsValue = (index: number) =>
  index === FEED_INDEX
    ? SocialLeaderboardEventValues.TAB.FEED
    : SocialLeaderboardEventValues.TAB.LEADERBOARD;

/**
 * Container that adds the Leaderboard | Feed tabs on top of the Follow Trading
 * surface. Rendered in place of `TopTradersView` when the `aiSocialFeedEnabled`
 * flag is on. Keeps the existing header (title + notification bell) and shows
 * two swipeable pages: the existing leaderboard and the new activity feed.
 */
const SocialTradersTabsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = useSocialLeaderboardAnalytics();
  const pagerRef = useRef<PagerView>(null);
  const programmaticTabChangeRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(LEADERBOARD_INDEX);

  // Each page scrolls independently, so keep a scroll offset per tab and let a
  // derived value expose whichever one is currently visible. Sharing a single
  // offset would leave the header collapsed after swiping to an unscrolled page.
  // On tab change the incoming page is scrolled into agreement with the outgoing
  // one (see `syncIncomingPageScroll`) so the header never flips.
  const leaderboardScrollY = useSharedValue(0);
  const feedScrollY = useSharedValue(0);
  const leaderboardPageRef = useRef<SocialTabPageHandle>(null);
  const feedPageRef = useRef<SocialTabPageHandle>(null);
  const activeIndexSv = useSharedValue(LEADERBOARD_INDEX);
  const scrollY = useDerivedValue(() =>
    activeIndexSv.value === FEED_INDEX
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
  const [tabsHeight, setTabsHeight] = useState(0);
  // Pushes each page's first row below the floating title + tabs at rest.
  const contentTopInset = titleHeight + tabsHeight;
  // The inset is only known after the overlay's `onLayout` fires (a frame after
  // first paint). Until then the pages would lay their content out at the top,
  // under the floating title/tabs, then snap down once measured. Keep the pages
  // mounted (so their fetches start) but hidden until the inset is real to avoid
  // that first-frame content jump.
  const isHeaderMeasured = titleHeight > 0 && tabsHeight > 0;

  const handleTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      titleHeightSv.value = height;
      setTitleHeight(height);
    },
    [titleHeightSv],
  );

  const handleTabsLayout = useCallback((e: LayoutChangeEvent) => {
    setTabsHeight(e.nativeEvent.layout.height);
  }, []);

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

      const isFeedIncoming = nextIndex === FEED_INDEX;
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
    [titleHeight, leaderboardScrollY, feedScrollY],
  );

  // Slide the title (and the tabs riding above it) up as the page scrolls,
  // clamped so the tabs settle flush under the header instead of scrolling off.
  // The lower clamp (>= 0) keeps the overlay pinned at rest during pull-to-
  // refresh overscroll: without it a negative scroll offset drives the overlay
  // *downward*, so it re-tracks the bounce through this derived value while the
  // list content springs back natively — the two desync and the return motion
  // looks erratic. Pinning the overlay lets only the content bounce.
  const collapsingHeaderStyle = useAnimatedStyle(() => {
    const maxShift = titleHeightSv.value;
    const shift =
      maxShift > 0 ? Math.max(0, Math.min(scrollY.value, maxShift)) : 0;
    return { transform: [{ translateY: -shift }] };
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

  const {
    hasNotificationPreferences,
    isLoading: isLoadingNotificationPreferences,
  } = useNotificationStoragePreferences();

  // `content` is unused: the pages live in the PagerView below so they stay
  // swipeable, and TabsBar renders the bar only.
  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'leaderboard',
        label: strings('social_leaderboard.feed.tabs.leaderboard'),
        content: null,
      },
      {
        key: 'feed',
        label: strings('social_leaderboard.feed.tabs.feed'),
        content: null,
      },
    ],
    [],
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
        [SocialLeaderboardEventProperties.TAB]: getTabAnalyticsValue(index),
        [SocialLeaderboardEventProperties.TAB_CHANGE_METHOD]: tabChangeMethod,
      });

      playSelection().catch(() => undefined);
      syncIncomingPageScroll(index);
      activeIndexSv.value = index;
      setActiveIndex(index);
    },
    [activeIndex, activeIndexSv, syncIncomingPageScroll, track],
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

  return (
    <SafeAreaView
      edges={['top']}
      style={tw.style('flex-1 bg-default')}
      testID={SocialTradersTabsViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardAnimated
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
            onPress: handleNotificationPreferencesPress,
            testID: SocialTradersTabsViewSelectorsIDs.NOTIFICATION_BUTTON,
          },
        ]}
        testID={SocialTradersTabsViewSelectorsIDs.HEADER}
      />

      {/* `overflow-hidden` clips the floating title as it slides up so it
          disappears *under* the fixed header (revealing the compact title)
          instead of scrolling over the back button / notification bell. */}
      <Box twClassName="flex-1 overflow-hidden">
        <PagerView
          ref={pagerRef}
          style={tw.style('flex-1', { opacity: isHeaderMeasured ? 1 : 0 })}
          initialPage={LEADERBOARD_INDEX}
          onPageSelected={handlePageSelected}
          testID={SocialTradersTabsViewSelectorsIDs.PAGER}
        >
          <View
            key="leaderboard"
            style={tw.style('flex-1')}
            collapsable={false}
            testID={SocialTradersTabsViewSelectorsIDs.LEADERBOARD_PAGE}
          >
            <TopTradersView
              embeddedInTabs
              onScroll={leaderboardScrollHandler}
              contentTopInset={contentTopInset}
              pageRef={leaderboardPageRef}
            />
          </View>
          <View
            key="feed"
            style={tw.style('flex-1')}
            collapsable={false}
            testID={SocialTradersTabsViewSelectorsIDs.FEED_PAGE}
          >
            <FeedView
              isActive={activeIndex === FEED_INDEX}
              onQuickBuy={handleQuickBuy}
              onSpotAvailabilityChange={handleFeedSpotAvailabilityChange}
              onScroll={feedScrollHandler}
              contentTopInset={contentTopInset}
              pageRef={feedPageRef}
            />
          </View>
        </PagerView>

        {/* Floating title + tabs. Only the tabs stay pinned under the header;
            the large title slides up and collapses into the compact header. */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            tw.style('absolute top-0 left-0 right-0 z-10'),
            collapsingHeaderStyle,
          ]}
        >
          <Box
            pointerEvents="none"
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

          <Box twClassName="bg-default" onLayout={handleTabsLayout}>
            <TabsBar
              tabs={tabs}
              activeIndex={activeIndex}
              onTabPress={handleTabPress}
              testID={SocialTradersTabsViewSelectorsIDs.TABS}
            />
          </Box>
        </Animated.View>
      </Box>

      {feedHasSpotItem && (
        <FeedSpotBuyAction
          ref={setBuyActionRef}
          isActive={activeIndex === FEED_INDEX}
        />
      )}
    </SafeAreaView>
  );
};

export default SocialTradersTabsView;
