import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { View, Modal, NativeScrollEvent } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  type RouteProp,
} from '@react-navigation/native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  TextColor,
  Box,
  BoxFlexDirection,
  HeaderStandardAnimated,
  IconName,
  useHeaderStandardAnimated,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
  TitleHub,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import {
  formatPnl,
  formatPercentage,
  formatPerpsBalance,
} from '../../utils/formatUtils';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsHomeData,
  usePerpsNavigation,
  usePerpsMeasurement,
  usePerpsHomeSectionTracking,
} from '../../hooks';
import { usePerpsHomeActions } from '../../hooks/usePerpsHomeActions';
import { usePerpsNetworkManagement } from '../../hooks/usePerpsNetworkManagement';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { BigNumber } from 'bignumber.js';
import { usePerpsLivePositions, usePerpsLiveAccount } from '../../hooks/stream';
import {
  HOME_SCREEN_CONFIG,
  LEARN_MORE_CONFIG,
  SUPPORT_CONFIG,
  FEEDBACK_CONFIG,
} from '../../constants/perpsConfig';
import {
  selectPerpsFeedbackEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
  selectPerpsProductsEnabledFlag,
  selectPerpsTopMoversEnabledFlag,
  selectPerpsRecentlyAddedEnabledFlag,
  selectPerpsWatchlistEnabledFlag,
} from '../../selectors/featureFlags';
import { usePerpsCategories } from '../../hooks/usePerpsCategories';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsCard from '../../components/PerpsCard';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import PerpsMarketTypeSection from '../../components/PerpsMarketTypeSection';
import PerpsRecentActivityList from '../../components/PerpsRecentActivityList/PerpsRecentActivityList';
import PerpsHomeSection from '../../components/PerpsHomeSection';
import PerpsHomeSectionList from '../../components/PerpsHomeSectionList';
import PerpsRowSkeleton from '../../components/PerpsRowSkeleton';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import {
  selectPerpsNetwork,
  selectPerpsWatchlistMarkets,
} from '../../selectors/perpsController';
import { PerpsProviderSelectorBadge } from '../../components/PerpsProviderSelector';
import WhatsHappeningSection from '../../../../UI/WhatsHappening';
import {
  WhatsHappeningSource,
  MAX_ITEMS_DISPLAYED,
} from '../../../../UI/WhatsHappening/constants';
import {
  useWhatsHappening,
  isWhatsHappeningSectionVisible,
} from '../../../../UI/WhatsHappening/hooks';
import { selectWhatsHappeningEnabled } from '../../../../../selectors/featureFlagController/whatsHappening';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import Reanimated, { SharedValue } from 'react-native-reanimated';
import { useDiscoveryScrollManager } from '../../../Predict/hooks/useDiscoveryScrollManager';
import styleSheet from './PerpsHomeView.styles';
import { TraceName } from '../../../../../util/trace';
import { buildPerpsCufStartTags } from '../../utils/perpsCufTrace';
import { PERPS_CUF_TAG, PERPS_CUF_VARIANT } from '../../constants/perpsCufTags';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../Perps.testIds';
import PerpsCloseAllPositionsView from '../PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsCancelAllOrdersView from '../PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import PerpsMoreSection, {
  type PerpsMoreItem,
} from '../../components/PerpsMoreSection';
import PerpsServiceInterruptionBanner from '../../components/PerpsServiceInterruptionBanner';
import PerpsCompetitionBanner from '../../components/PerpsCompetitionBanner';
import PerpsProducts from '../../components/PerpsProducts';
import PerpsTopMoversSection from '../../components/PerpsTopMoversSection';
import PerpsRecentlyAddedSection from '../../components/PerpsRecentlyAddedSection';
import {
  isPerpsTopMoversSectionVisible,
  usePerpsTopMovers,
} from '../../hooks/usePerpsTopMovers';

interface PerpsHomeViewProps {
  hideHeader?: boolean;
  walletHeaderTranslateY?: SharedValue<number>;
  walletHeaderHeight?: number;
  /** Ref populated with this tab's onTabEnter so the parent can call it on tab switch. */
  tabEnterCallbackRef?: React.MutableRefObject<(() => void) | null>;
  /** Forwarded to useDiscoveryScrollManager to sync icon animations with header hide/show. */
  onHeaderHiddenChange?: (hidden: boolean) => void;
  /**
   * Top padding applied inside the scroll content container when embedded in
   * HomepageDiscoveryTabs — keeps the perps background flush under the discovery
   * tab bar and adds spacing before the screen title (32px in discovery tabs).
   */
  topInset?: number;
}

const PerpsHomeView = ({
  hideHeader = false,
  walletHeaderTranslateY,
  walletHeaderHeight = 0,
  tabEnterCallbackRef,
  onHeaderHiddenChange,
  topInset = 0,
}: PerpsHomeViewProps) => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Feature flags
  const isFeedbackEnabled = useSelector(selectPerpsFeedbackEnabledFlag);
  const isServiceInterruptionBannerEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const isWhatsHappeningEnabled = useSelector(selectWhatsHappeningEnabled);
  const isProductsEnabled = useSelector(selectPerpsProductsEnabledFlag);
  const isTopMoversEnabled = useSelector(selectPerpsTopMoversEnabledFlag);
  const isRecentlyAddedEnabled = useSelector(
    selectPerpsRecentlyAddedEnabledFlag,
  );
  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);
  // Mirrors PerpsProducts' own visibility check (enabled + has categories).
  const productCategories = usePerpsCategories();
  const topMoversFeed = usePerpsTopMovers({
    direction: 'desc',
    enabled: isTopMoversEnabled,
  });
  const isTopMoversVisible =
    isTopMoversEnabled &&
    isPerpsTopMoversSectionVisible({
      isLoading: topMoversFeed.isLoading,
      data: topMoversFeed.data,
    });
  const whatsHappeningFeed = useWhatsHappening(MAX_ITEMS_DISPLAYED);
  const isWhatsHappeningVisible =
    isWhatsHappeningEnabled &&
    isWhatsHappeningSectionVisible({
      isLoading: whatsHappeningFeed.isLoading,
      items: whatsHappeningFeed.items,
      error: whatsHappeningFeed.error,
    });

  // Use centralized navigation hook
  const perpsNavigation = usePerpsNavigation();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();

  // Ensure Arbitrum network exists when user lands on the main perps screen (not on button click)
  useFocusEffect(
    useCallback(() => {
      ensureArbitrumNetworkExists().catch(() => {
        // Error already logged in usePerpsNetworkManagement
      });
    }, [ensureArbitrumNetworkExists]),
  );

  // Bottom sheet state and refs
  const [showCloseAllSheet, setShowCloseAllSheet] = useState(false);
  const [showCancelAllSheet, setShowCancelAllSheet] = useState(false);
  const closeAllSheetRef = useRef<BottomSheetRef>(null);
  const cancelAllSheetRef = useRef<BottomSheetRef>(null);

  // Use hook for eligibility checks and action handlers
  // Pass button location for tracking deposit entry point
  const {
    handleAddFunds,
    handleWithdraw,
    isEligible,
    isEligibilityModalVisible,
    closeEligibilityModal,
  } = usePerpsHomeActions({
    buttonLocation: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
  });

  // Separate geo-block modal state for close all / cancel all actions
  const [isCloseAllGeoBlockVisible, setIsCloseAllGeoBlockVisible] =
    useState(false);
  const { track } = usePerpsEventTracking();

  // Section scroll tracking for analytics
  const { handleSectionLayout, handleScroll, resetTracking } =
    usePerpsHomeSectionTracking();

  // Bridge analytics handler into the Reanimated worklet via onScrollEvent
  const handleScrollEvent = useCallback(
    (scrollY: number, viewportHeight: number) => {
      handleScroll({
        nativeEvent: {
          contentOffset: { x: 0, y: scrollY },
          layoutMeasurement: { width: 0, height: viewportHeight },
        } as NativeScrollEvent,
      });
    },
    [handleScroll],
  );

  const {
    scrollY: headerScrollY,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

  const perpsScreenTitle = strings('perps.title');

  const { scrollHandler: perpsScrollHandler, onTabEnter: perpsOnTabEnter } =
    useDiscoveryScrollManager({
      walletHeaderHeight,
      walletHeaderTranslateY,
      scrollY: hideHeader ? undefined : headerScrollY,
      onScrollEvent: handleScrollEvent,
      onHeaderHiddenChange,
    });

  // Expose onTabEnter to the parent so it can restore this tab's header state on switch.
  useEffect(() => {
    if (tabEnterCallbackRef) {
      tabEnterCallbackRef.current = perpsOnTabEnter;
      return () => {
        tabEnterCallbackRef.current = null;
      };
    }
    return undefined;
  }, [tabEnterCallbackRef, perpsOnTabEnter]);

  // Get balance state directly from Redux
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const totalBalance = perpsAccount?.totalBalance || '0';
  const spendableBalance = perpsAccount?.spendableBalance || '0';
  const totalBn = BigNumber(totalBalance);
  const isBalanceEmpty = !totalBn.isFinite() || totalBn.isZero();

  const network = useSelector(selectPerpsNetwork);
  const isTestnet = network === 'testnet';
  const { isMultiProviderEnabled } = usePerpsProvider();

  // Calculate P&L for positions subtitle
  const unrealizedPnl = perpsAccount?.unrealizedPnl || '0';
  const roe = parseFloat(perpsAccount?.returnOnEquity || '0');

  // Fetch all home screen data
  const {
    positions,
    orders,
    watchlistMarkets,
    suggestedWatchlistMarkets,
    perpsMarkets, // Crypto markets (renamed from trendingMarkets)
    commoditiesMarkets, // Commodity markets
    stocksMarkets, // Equity markets only
    forexMarkets,
    recentlyAddedMarkets,
    hasMarkets,
    recentActivity,
    sortBy,
    isLoading,
  } = usePerpsHomeData({});

  // Independently gates the section from the Terminal backend flag that
  // supplies `listedAt` data, so it can be hidden even when that data flows.
  const isRecentlyAddedVisible =
    isRecentlyAddedEnabled && recentlyAddedMarkets.length > 0;

  // Mirrors PerpsWatchlistMarkets V1/V2 gating: suggestions only count toward
  // section visibility when the redesigned watchlist flag is on.
  const isWatchlistVisible =
    isLoading.markets ||
    watchlistMarkets.length > 0 ||
    (isWatchlistEnabled && (suggestedWatchlistMarkets?.length ?? 0) > 0);

  // Calculate positions subtitle with P&L
  const hasPositions = positions.length > 0;
  const { positionsSubtitle, positionsSubtitleColor, positionsSubtitleSuffix } =
    useMemo(() => {
      const pnlNum = parseFloat(unrealizedPnl);

      // Open (filled) positions only — hide when flat so spacing matches homepage sections
      if (!hasPositions) {
        return {
          positionsSubtitle: undefined,
          positionsSubtitleColor: undefined,
          positionsSubtitleSuffix: undefined,
        };
      }

      const color =
        pnlNum > 0
          ? TextColor.SuccessDefault
          : pnlNum < 0
            ? TextColor.ErrorDefault
            : TextColor.TextDefault;

      const subtitle = `${formatPnl(pnlNum)} (${formatPercentage(roe, 1)})`;
      const suffix = strings('perps.unrealized_pnl');

      return {
        positionsSubtitle: subtitle,
        positionsSubtitleColor: color,
        positionsSubtitleSuffix: suffix,
      };
    }, [hasPositions, unrealizedPnl, roe]);

  // Determine if any data is loading for initial load tracking
  // Orders and activity load via WebSocket instantly, only track positions and markets
  const isAnyLoading = isLoading.positions || isLoading.markets;

  // Performance tracking: Measure screen load time until data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView, // Keep same trace name for consistency
    conditions: [!isAnyLoading],
  });

  const entryCufVariant = hasPositions
    ? PERPS_CUF_VARIANT.POSITION
    : PERPS_CUF_VARIANT.EMPTY;
  const entryCufEndData = {
    [PERPS_CUF_TAG.VARIANT]:
      orders.length > 0 ? PERPS_CUF_VARIANT.ORDER : entryCufVariant,
  };

  // Entry CUF: enter Perps -> live market list. Starts at mount; launch-context
  // tag splits cold from warm p75. Captured at mount so the tag is the launch
  // context, not the post-settle value.
  const entryCufTags = useMemo(() => buildPerpsCufStartTags(), []);
  usePerpsMeasurement({
    traceName: TraceName.PerpsEntryToLiveMarketList,
    // endConditions (not the simple `conditions` API): this span must measure
    // mount -> live data. The simple API auto-resets whenever its first
    // condition is false, which for a readiness flag means the span restarts on
    // every render during loading and under-reports the true latency. Using
    // endConditions starts at mount and never resets.
    // The variant endData reads orders.length, so — unlike the screen-load
    // metric above, which deliberately ignores orders for speed — this span
    // must wait for the orders stream too, or a user with open orders is
    // misrecorded as empty/position.
    endConditions: [!isAnyLoading, !isLoading.orders],
    tags: entryCufTags,
    endData: entryCufEndData,
  });

  // Reset section tracking when screen comes into focus
  // This ensures sections can be tracked again when navigating back to the screen
  useFocusEffect(
    useCallback(() => {
      resetTracking();
    }, [resetTracking]),
  );

  // Track home screen viewed event
  const source =
    route.params?.source || PERPS_EVENT_VALUE.SOURCE.MAIN_ACTION_BUTTON;

  // Get perp balance status for tracking
  const livePositions = usePerpsLivePositions({ throttleMs: 5000 });
  const hasPerpBalance =
    livePositions.positions.length > 0 ||
    (!!perpsAccount?.totalBalance && parseFloat(perpsAccount.totalBalance) > 0);

  // Extract button_clicked and button_location from route params
  const buttonClicked = route.params?.button_clicked;
  const buttonLocation = route.params?.button_location;

  // Raw watchlist symbols for analytics (unfiltered/uncapped list)
  const rawWatchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  // Build the ordered list of visible section names for sections_displayed.
  // Each condition mirrors the matching section component's own render gating
  // (content OR loading skeleton), so the array reflects what the user actually
  // sees and stays consistent with per-section scroll impressions.
  const sectionsDisplayed = useMemo(() => {
    const sections: string[] = [PERPS_EVENT_VALUE.SECTION_NAME.BALANCE];
    // Positions/orders render a skeleton while loading, then self-hide when empty.
    if (isLoading.positions || positions.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS);
    if (isLoading.orders || orders.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.ORDERS);
    if (isWhatsHappeningVisible)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.WHATS_HAPPENING);
    if (isWatchlistVisible) {
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST);
    }
    // Products self-hides when disabled or when no categories are available.
    if (isProductsEnabled && productCategories.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS);
    // Top Movers self-hides when its feed finishes empty; mirror that here so
    // PerpsHomeSectionList does not render an orphan divider.
    if (isTopMoversVisible)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.TOP_MOVERS);
    // Explore category lists render a skeleton while markets load, then self-hide
    // when their own market array is empty.
    if (isLoading.markets || perpsMarkets.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO);
    if (isLoading.markets || commoditiesMarkets.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_COMMODITIES);
    if (isLoading.markets || stocksMarkets.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS);
    if (isLoading.markets || forexMarkets.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_FOREX);
    // Recently Added self-hides when there are no markets listed in the last
    // 30 days, or when the feature flag is off.
    if (isRecentlyAddedVisible) sections.push('recently_added');
    // Recent activity shows a skeleton while loading, then self-hides when empty.
    if (isLoading.activity || recentActivity.length > 0)
      sections.push(PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY);
    return sections;
  }, [
    isLoading,
    positions,
    orders,
    isWhatsHappeningVisible,
    isWatchlistVisible,
    isProductsEnabled,
    productCategories,
    isTopMoversVisible,
    isRecentlyAddedVisible,
    perpsMarkets,
    commoditiesMarkets,
    stocksMarkets,
    forexMarkets,
    recentActivity,
  ]);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isAnyLoading],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.PERPS_HOME,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      [PERPS_EVENT_PROPERTY.HAS_PERP_BALANCE]: hasPerpBalance,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: livePositions.positions.length,
      [PERPS_EVENT_PROPERTY.OPEN_ORDER]: orders?.length || 0,
      [PERPS_EVENT_PROPERTY.OUTAGE_BANNER_SHOWN]:
        isServiceInterruptionBannerEnabled,
      [PERPS_EVENT_PROPERTY.SECTIONS_DISPLAYED]: sectionsDisplayed,
      [PERPS_EVENT_PROPERTY.WATCHLIST_COUNT]: rawWatchlistSymbols.length,
      [PERPS_EVENT_PROPERTY.WATCHLIST_MARKETS]: rawWatchlistSymbols,
      ...(buttonClicked && {
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: buttonClicked,
      }),
      ...(buttonLocation && {
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
      }),
    },
  });

  const handleSearchToggle = useCallback(() => {
    // Track button click
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.MAGNIFYING_GLASS,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
    perpsNavigation.navigateToMarketList({
      defaultMarketTypeFilter: 'all',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      fromHome: true,
      button_clicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.MAGNIFYING_GLASS,
      button_location: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      ...(transactionActiveAbTests?.length ? { transactionActiveAbTests } : {}),
    });
  }, [
    perpsNavigation,
    trackEvent,
    createEventBuilder,
    transactionActiveAbTests,
  ]);

  const handleWhatsHappeningHeaderPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.WHATS_HAPPENING,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
  }, [track]);

  const handleRecentlyAddedMarketPress = useCallback(
    (market: PerpsMarketData) => {
      perpsNavigation.navigateToMarketDetails(
        market,
        PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      );
    },
    [perpsNavigation],
  );

  const handleRecentlyAddedHeaderPress = useCallback(() => {
    perpsNavigation.navigateToMarketList({
      defaultMarketTypeFilter: 'new',
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
      ...(transactionActiveAbTests?.length ? { transactionActiveAbTests } : {}),
    });
  }, [perpsNavigation, transactionActiveAbTests]);

  const navigtateToTutorial = useCallback(() => {
    // Track tutorial button click
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.TUTORIAL,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    });
  }, [navigation, trackEvent, createEventBuilder]);

  const navigateToContactSupport = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.Url,
        title: strings(SUPPORT_CONFIG.TitleKey),
      },
    });
    // Track contact support interaction for Perps analytics
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.CONTACT_SUPPORT,
          [PERPS_EVENT_PROPERTY.LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
    // Also track the general navigation event
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [createEventBuilder, navigation, trackEvent]);

  const handleGiveFeedback = useCallback(() => {
    // Track feedback button click
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.GIVE_FEEDBACK,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
    // Open survey in in-app browser (same pattern as Contact Support)
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: FEEDBACK_CONFIG.Url,
        title: strings(FEEDBACK_CONFIG.TitleKey),
      },
    });
  }, [trackEvent, createEventBuilder, navigation]);

  const moreItems: PerpsMoreItem[] = useMemo(() => {
    const items: PerpsMoreItem[] = [
      {
        label: strings(SUPPORT_CONFIG.TitleKey),
        startIconName: IconName.Sms,
        onPress: () => navigateToContactSupport(),
        testID: PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON,
      },
    ];

    if (isFeedbackEnabled) {
      items.push({
        label: strings(FEEDBACK_CONFIG.TitleKey),
        startIconName: IconName.Mail,
        onPress: handleGiveFeedback,
        testID: PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON,
      });
    }

    items.push({
      label: strings(LEARN_MORE_CONFIG.TitleKey),
      startIconName: IconName.Book,
      onPress: () => navigtateToTutorial(),
      testID: PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON,
    });

    return items;
  }, [
    navigateToContactSupport,
    navigtateToTutorial,
    isFeedbackEnabled,
    handleGiveFeedback,
  ]);

  // Bottom sheet handlers - open sheets directly with geo-restriction check
  const handleCloseAllPress = useCallback(() => {
    // Geo-restriction check for close all positions
    if (!isEligible) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.CLOSE_ALL_POSITIONS_BUTTON,
      });
      setIsCloseAllGeoBlockVisible(true);
      return;
    }
    setShowCloseAllSheet(true);
  }, [isEligible, track]);

  const handleCancelAllPress = useCallback(() => {
    setShowCancelAllSheet(true);
  }, []);

  const handleWatchlistSeeAllPress = useCallback(() => {
    perpsNavigation.navigateToMarketList({
      showWatchlistOnly: true,
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    });
  }, [perpsNavigation]);

  const homeSections = useMemo(
    () => [
      {
        key: 'positions',
        visible: isLoading.positions || positions.length > 0,
        onLayout: handleSectionLayout(PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS),
        content: (
          <PerpsHomeSection
            title={strings('perps.home.positions')}
            subtitle={privacyMode ? undefined : positionsSubtitle}
            subtitleColor={positionsSubtitleColor}
            subtitleSuffix={privacyMode ? undefined : positionsSubtitleSuffix}
            subtitleTestID={PerpsHomeViewSelectorsIDs.POSITIONS_PNL_VALUE}
            isLoading={isLoading.positions}
            isEmpty={positions.length === 0}
            showWhenEmpty={false}
            onActionPress={handleCloseAllPress}
            renderSkeleton={() => <PerpsRowSkeleton count={2} />}
          >
            <View style={styles.positionsOrdersContainer}>
              {positions.map((position, index) => (
                <PerpsCard
                  key={`${position.symbol}-${index}`}
                  position={position}
                  source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
                  source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS}
                  testID={`${PerpsHomeViewSelectorsIDs.POSITION_CARD}-${index}`}
                />
              ))}
            </View>
          </PerpsHomeSection>
        ),
      },
      {
        key: 'orders',
        visible: isLoading.orders || orders.length > 0,
        onLayout: handleSectionLayout(PERPS_EVENT_VALUE.SECTION_NAME.ORDERS),
        content: (
          <PerpsHomeSection
            title={strings('perps.home.orders')}
            isLoading={isLoading.orders}
            isEmpty={orders.length === 0}
            showWhenEmpty={false}
            onActionPress={handleCancelAllPress}
            renderSkeleton={() => <PerpsRowSkeleton count={2} />}
          >
            <View style={styles.positionsOrdersContainer}>
              {orders.map((order, index) => (
                <PerpsCard
                  key={order.orderId}
                  order={order}
                  source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
                  source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS}
                  testID={`${PerpsHomeViewSelectorsIDs.ORDER_CARD}-${index}`}
                />
              ))}
            </View>
          </PerpsHomeSection>
        ),
      },
      {
        key: 'whats-happening',
        visible: isWhatsHappeningVisible,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.WHATS_HAPPENING,
        ),
        content: (
          <WhatsHappeningSection
            source={WhatsHappeningSource.Perps}
            feed={whatsHappeningFeed}
            onHeaderPress={handleWhatsHappeningHeaderPress}
          />
        ),
      },
      {
        key: 'watchlist',
        visible: isWatchlistVisible,
        onLayout: handleSectionLayout(PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST),
        content: (
          <PerpsWatchlistMarkets
            markets={watchlistMarkets}
            suggestedMarkets={suggestedWatchlistMarkets}
            isLoading={isLoading.markets}
            positions={positions}
            orders={orders}
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.WATCHLIST}
            transactionActiveAbTests={transactionActiveAbTests}
            showLeadingDivider={false}
            onSeeAllPress={
              watchlistMarkets.length > 0
                ? handleWatchlistSeeAllPress
                : undefined
            }
          />
        ),
      },
      {
        key: 'products',
        visible: isProductsEnabled && productCategories.length > 0,
        onLayout: handleSectionLayout(PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS),
        content: (
          <PerpsProducts transactionActiveAbTests={transactionActiveAbTests} />
        ),
      },
      {
        key: 'top-movers',
        visible: isTopMoversVisible,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.TOP_MOVERS,
        ),
        content: (
          <PerpsTopMoversSection
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ),
      },
      {
        key: 'crypto',
        visible: isLoading.markets || perpsMarkets.length > 0,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO,
        ),
        content: (
          <PerpsMarketTypeSection
            title={strings('perps.home.crypto')}
            markets={perpsMarkets}
            marketType="crypto"
            sortBy={sortBy}
            isLoading={isLoading.markets}
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.CRYPTO}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ),
      },
      {
        key: 'commodities',
        visible: isLoading.markets || commoditiesMarkets.length > 0,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_COMMODITIES,
        ),
        content: (
          <PerpsMarketTypeSection
            title={strings('perps.home.commodities')}
            markets={commoditiesMarkets}
            marketType="commodity"
            sortBy={sortBy}
            isLoading={isLoading.markets}
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.COMMODITY}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ),
      },
      {
        key: 'stocks',
        visible: isLoading.markets || stocksMarkets.length > 0,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS,
        ),
        content: (
          <PerpsMarketTypeSection
            title={strings('perps.home.stocks')}
            markets={stocksMarkets}
            marketType="stock"
            sortBy={sortBy}
            isLoading={isLoading.markets}
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.STOCK}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ),
      },
      {
        key: 'forex',
        visible: isLoading.markets || forexMarkets.length > 0,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_FOREX,
        ),
        content: (
          <PerpsMarketTypeSection
            title={strings('perps.home.forex')}
            markets={forexMarkets}
            marketType="forex"
            isLoading={isLoading.markets}
            source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}
            source_section={PERPS_EVENT_VALUE.SOURCE_SECTION.FOREX}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        ),
      },
      {
        key: 'recently-added',
        // Mirrors PerpsRecentlyAddedSection's own render gate (markets.length
        // === 0 -> null) plus the feature flag, so PerpsHomeSectionList does
        // not render an orphan divider for an empty/disabled rail.
        visible: isRecentlyAddedVisible,
        onLayout: handleSectionLayout('recently_added'),
        content: (
          <PerpsRecentlyAddedSection
            markets={recentlyAddedMarkets}
            onMarketPress={handleRecentlyAddedMarketPress}
            onViewAllPress={handleRecentlyAddedHeaderPress}
          />
        ),
      },
      {
        key: 'recent-activity',
        visible: isLoading.activity || recentActivity.length > 0,
        onLayout: handleSectionLayout(
          PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY,
        ),
        content: (
          <PerpsRecentActivityList
            transactions={recentActivity}
            isLoading={isLoading.activity}
          />
        ),
      },
      {
        key: 'more',
        visible: true,
        content: <PerpsMoreSection items={moreItems} />,
      },
    ],
    [
      isLoading,
      positions,
      orders,
      privacyMode,
      positionsSubtitle,
      positionsSubtitleColor,
      positionsSubtitleSuffix,
      handleCloseAllPress,
      handleCancelAllPress,
      styles.positionsOrdersContainer,
      isWhatsHappeningVisible,
      whatsHappeningFeed,
      handleWhatsHappeningHeaderPress,
      isWatchlistVisible,
      watchlistMarkets,
      suggestedWatchlistMarkets,
      handleWatchlistSeeAllPress,
      transactionActiveAbTests,
      isProductsEnabled,
      productCategories.length,
      isTopMoversVisible,
      isRecentlyAddedVisible,
      recentlyAddedMarkets,
      handleRecentlyAddedMarketPress,
      handleRecentlyAddedHeaderPress,
      perpsMarkets,
      commoditiesMarkets,
      stocksMarkets,
      forexMarkets,
      sortBy,
      recentActivity,
      handleSectionLayout,
      moreItems,
    ],
  );

  // Open bottom sheets when state changes
  useEffect(() => {
    if (showCloseAllSheet) {
      closeAllSheetRef.current?.onOpenBottomSheet();
    }
  }, [showCloseAllSheet]);

  useEffect(() => {
    if (showCancelAllSheet) {
      cancelAllSheetRef.current?.onOpenBottomSheet();
    }
  }, [showCancelAllSheet]);

  // Handle sheet close callbacks
  const handleCloseAllSheetClose = useCallback(() => {
    setShowCloseAllSheet(false);
  }, []);

  const handleCancelAllSheetClose = useCallback(() => {
    setShowCancelAllSheet(false);
  }, []);

  // Calculate actual footer dimensions
  // Footer: paddingTop(16) + button(48) + paddingBottom(16 + insets.bottom)
  const footerHeight = 80 + insets.bottom;

  const showsFixedFooter =
    !isBalanceEmpty &&
    !showCloseAllSheet &&
    !showCancelAllSheet &&
    !HOME_SCREEN_CONFIG.ShowHeaderActionButtons;

  const bottomSpacerStyle = useMemo(
    () => ({
      // Reserve space for the fixed footer only when it is rendered.
      height: showsFixedFooter ? footerHeight + 16 : 16,
    }),
    [showsFixedFooter, footerHeight],
  );

  // Add safe area inset to footer for Android navigation bar
  const fixedFooterStyle = useMemo(
    () => [styles.fixedFooter, { paddingBottom: 16 + insets.bottom }],
    [styles.fixedFooter, insets.bottom],
  );

  const scrollContentContainerStyle = useMemo(
    () => [
      styles.scrollViewContent,
      hideHeader && topInset > 0 ? { paddingTop: topInset } : null,
      showsFixedFooter
        ? { paddingBottom: 0 }
        : !hideHeader
          ? { paddingBottom: 16 + insets.bottom }
          : null,
    ],
    [
      styles.scrollViewContent,
      topInset,
      hideHeader,
      showsFixedFooter,
      insets.bottom,
    ],
  );

  const titleEndAccessory = useMemo(() => {
    const homeHeadingTestID = PerpsHomeViewSelectorsIDs.HOME_HEADING;

    if (isMultiProviderEnabled) {
      return (
        <PerpsProviderSelectorBadge
          testID={`${homeHeadingTestID}-provider-badge`}
        />
      );
    }

    if (isTestnet) {
      return (
        <Tag
          severity={TagSeverity.Warning}
          testID={`${homeHeadingTestID}-testnet-badge`}
        >
          Testnet
        </Tag>
      );
    }

    return undefined;
  }, [isMultiProviderEnabled, isTestnet]);

  // Always navigate to wallet home to avoid navigation loops (tutorial/onboarding flow)
  const handleBackPress = perpsNavigation.navigateToWallet;

  return (
    <View style={styles.container}>
      {/* Header */}
      {!hideHeader && (
        <HeaderStandardAnimated
          includesTopInset
          scrollY={headerScrollY}
          titleSectionHeight={titleSectionHeightSv}
          title={perpsScreenTitle}
          onBack={handleBackPress}
          backButtonProps={{
            accessibilityLabel: 'Back',
            testID: PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON,
          }}
          endButtonIconProps={[
            {
              iconName: IconName.Search,
              onPress: handleSearchToggle,
              accessibilityLabel: 'Search',
              testID: PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE,
            },
          ]}
          testID="perps-home"
        />
      )}

      {/* Main Content - ScrollView with all carousels */}
      <Reanimated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={scrollContentContainerStyle}
        showsVerticalScrollIndicator={false}
        onScroll={perpsScrollHandler}
        scrollEventThrottle={16}
        testID={PerpsHomeViewSelectorsIDs.SCROLL_CONTENT}
      >
        <Box
          onLayout={(event) =>
            setTitleSectionHeight(event.nativeEvent.layout.height)
          }
        >
          <TitleHub
            testID={PerpsHomeViewSelectorsIDs.HOME_HEADING}
            title={hideHeader ? undefined : perpsScreenTitle}
            titleEndAccessory={hideHeader ? undefined : titleEndAccessory}
            titleProps={
              hideHeader
                ? undefined
                : {
                    testID: `${PerpsHomeViewSelectorsIDs.HOME_HEADING}-title`,
                  }
            }
            amount={
              !isBalanceEmpty ? (
                <SensitiveText
                  variant={TextVariant.DisplayLg}
                  color={TextColor.TextDefault}
                  testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Medium}
                >
                  {formatPerpsBalance(totalBalance)}
                </SensitiveText>
              ) : undefined
            }
            bottomLabel={
              !isBalanceEmpty ? (
                <Box flexDirection={BoxFlexDirection.Row}>
                  <SensitiveText
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    isHidden={privacyMode}
                    length={SensitiveTextLength.Short}
                    testID={
                      PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT
                    }
                  >
                    {formatPerpsBalance(spendableBalance)}
                  </SensitiveText>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {' '}
                    {strings('perps.available')}
                  </Text>
                </Box>
              ) : undefined
            }
            twClassName="px-4 pb-3"
          />
        </Box>

        <Box paddingBottom={3}>
          {/* Service Interruption Banner */}
          <PerpsServiceInterruptionBanner
            testID={PerpsHomeViewSelectorsIDs.SERVICE_INTERRUPTION_BANNER}
          />

          {/* Balance Actions Component */}
          <PerpsMarketBalanceActions
            showActionButtons={HOME_SCREEN_CONFIG.ShowHeaderActionButtons}
            hideBalanceSection
          />

          {/* Competition Banner */}
          <PerpsCompetitionBanner
            testID={PerpsHomeViewSelectorsIDs.COMPETITION_BANNER}
          />
        </Box>

        <PerpsHomeSectionList sections={homeSections} />

        {/* Bottom spacing for tab bar */}
        <View style={bottomSpacerStyle} />
      </Reanimated.ScrollView>

      {/* Close All Positions Bottom Sheet */}
      {showCloseAllSheet && (
        <PerpsCloseAllPositionsView
          sheetRef={closeAllSheetRef}
          onClose={handleCloseAllSheetClose}
        />
      )}

      {/* Cancel All Orders Bottom Sheet */}
      {showCancelAllSheet && (
        <PerpsCancelAllOrdersView
          sheetRef={cancelAllSheetRef}
          onClose={handleCancelAllSheetClose}
        />
      )}

      {/* Fixed Footer with Action Buttons - Only show when balance is not empty and no sheets are open */}
      {showsFixedFooter && (
        <View style={fixedFooterStyle}>
          <View style={styles.footerButtonsContainer} accessible={false}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleWithdraw}
              style={styles.footerButton}
              testID={PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON}
            >
              {strings('perps.withdraw')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleAddFunds}
              style={styles.footerButton}
              testID={PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON}
            >
              {strings('perps.add_funds')}
            </Button>
          </View>
        </View>
      )}

      {/* Eligibility Modal */}
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={closeEligibilityModal}
              contentKey={'geo_block'}
              testID={'perps-home-geo-block-tooltip'}
            />
          </Modal>
        </View>
      )}

      {/* Close All / Cancel All Geo-Block Modal */}
      {isCloseAllGeoBlockVisible && (
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsCloseAllGeoBlockVisible(false)}
              contentKey={'geo_block'}
              testID={'perps-home-close-all-geo-block-tooltip'}
            />
          </Modal>
        </View>
      )}
    </View>
  );
};

export default PerpsHomeView;
