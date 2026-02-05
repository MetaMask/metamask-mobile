import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { View, ScrollView, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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
  IconName,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { TextColor } from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { formatPnl, formatPercentage } from '../../utils/formatUtils';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsHomeData,
  usePerpsNavigation,
  usePerpsMeasurement,
  usePerpsHomeSectionTracking,
} from '../../hooks';
import { usePerpsHomeActions } from '../../hooks/usePerpsHomeActions';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { BigNumber } from 'bignumber.js';
import { usePerpsLivePositions, usePerpsLiveAccount } from '../../hooks/stream';
import {
  HOME_SCREEN_CONFIG,
  LEARN_MORE_CONFIG,
  SUPPORT_CONFIG,
  FEEDBACK_CONFIG,
} from '../../constants/perpsConfig';
import { selectPerpsFeedbackEnabledFlag } from '../../selectors/featureFlags';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsCard from '../../components/PerpsCard';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import PerpsMarketTypeSection from '../../components/PerpsMarketTypeSection';
import PerpsRecentActivityList from '../../components/PerpsRecentActivityList/PerpsRecentActivityList';
import PerpsHomeSection from '../../components/PerpsHomeSection';
import PerpsRowSkeleton from '../../components/PerpsRowSkeleton';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import styleSheet from './PerpsHomeView.styles';
import { TraceName } from '../../../../../util/trace';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import PerpsCloseAllPositionsView from '../PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsCancelAllOrdersView from '../PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import PerpsNavigationCard, {
  NavigationItem,
} from '../../components/PerpsNavigationCard/PerpsNavigationCard';

const PerpsHomeView = () => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Feature flag for feedback button
  const isFeedbackEnabled = useSelector(selectPerpsFeedbackEnabledFlag);

  // Use centralized navigation hook
  const perpsNavigation = usePerpsNavigation();

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

  // Get balance state directly from Redux
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const totalBalance = perpsAccount?.totalBalance || '0';
  const isBalanceEmpty = BigNumber(totalBalance).isZero();

  // Calculate P&L for positions subtitle
  const unrealizedPnl = perpsAccount?.unrealizedPnl || '0';
  const roe = parseFloat(perpsAccount?.returnOnEquity || '0');

  // Fetch all home screen data
  const {
    positions,
    orders,
    watchlistMarkets,
    perpsMarkets, // Crypto markets (renamed from trendingMarkets)
    commoditiesMarkets, // Commodity markets
    stocksMarkets, // Equity markets only
    forexMarkets,
    recentActivity,
    sortBy,
    isLoading,
  } = usePerpsHomeData({});

  // Calculate positions subtitle with P&L
  const hasPositions = positions.length > 0;
  const { positionsSubtitle, positionsSubtitleColor, positionsSubtitleSuffix } =
    useMemo(() => {
      const pnlNum = parseFloat(unrealizedPnl);
      const isPnlZero = BigNumber(unrealizedPnl).isZero();

      // Only show subtitle when there are positions and P&L is non-zero
      if (!hasPositions || isPnlZero) {
        return {
          positionsSubtitle: undefined,
          positionsSubtitleColor: undefined,
          positionsSubtitleSuffix: undefined,
        };
      }

      const color =
        pnlNum > 0
          ? TextColor.Success
          : pnlNum < 0
            ? TextColor.Error
            : TextColor.Alternative;

      // Format: "-$18.47 (2.1%)" colored + "Unrealized PnL" in default color
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

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isAnyLoading],
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.PERPS_HOME,
      [PERPS_EVENT_PROPERTY.SOURCE]: source,
      [PERPS_EVENT_PROPERTY.HAS_PERP_BALANCE]: hasPerpBalance,
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
    // Navigate to MarketListView with search enabled and 'all' category
    // When user closes search, they should see all markets (not a specific category)
    perpsNavigation.navigateToMarketList({
      defaultSearchVisible: true,
      defaultMarketTypeFilter: 'all',
      source: PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB,
      fromHome: true,
      button_clicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.MAGNIFYING_GLASS,
      button_location: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
  }, [perpsNavigation, trackEvent, createEventBuilder]);

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
      source: PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB,
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

  const navigationItems: NavigationItem[] = useMemo(() => {
    const items: NavigationItem[] = [
      {
        label: strings(SUPPORT_CONFIG.TitleKey),
        onPress: () => navigateToContactSupport(),
        testID: PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON,
      },
    ];

    // Add feedback button when feature flag is enabled
    if (isFeedbackEnabled) {
      items.push({
        label: strings(FEEDBACK_CONFIG.TitleKey),
        onPress: handleGiveFeedback,
        testID: PerpsHomeViewSelectorsIDs.FEEDBACK_BUTTON,
      });
    }

    // Avoid duplicate "Learn more" button (shown in empty state card)
    if (!isBalanceEmpty) {
      items.push({
        label: strings(LEARN_MORE_CONFIG.TitleKey),
        onPress: () => navigtateToTutorial(),
        testID: PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON,
      });
    }

    return items;
  }, [
    navigateToContactSupport,
    navigtateToTutorial,
    isBalanceEmpty,
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

  const bottomSpacerStyle = useMemo(
    () => ({
      // When footer is visible, add space for it. Otherwise minimal spacing for tab bar.
      height: isBalanceEmpty ? 16 : footerHeight + 16,
    }),
    [isBalanceEmpty, footerHeight],
  );

  // Add safe area inset to footer for Android navigation bar
  const fixedFooterStyle = useMemo(
    () => [styles.fixedFooter, { paddingBottom: 16 + insets.bottom }],
    [styles.fixedFooter, insets.bottom],
  );

  // Always navigate to wallet home to avoid navigation loops (tutorial/onboarding flow)
  const handleBackPress = perpsNavigation.navigateToWallet;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <HeaderCenter
        title={strings('perps.title')}
        onBack={handleBackPress}
        backButtonProps={{ testID: 'back-button' }}
        endButtonIconProps={[
          {
            iconName: IconName.Search,
            onPress: handleSearchToggle,
            testID: 'perps-home-search-toggle',
          },
        ]}
        testID="perps-home"
      />

      {/* Main Content - ScrollView with all carousels */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Balance Actions Component */}
        <PerpsMarketBalanceActions
          showActionButtons={HOME_SCREEN_CONFIG.ShowHeaderActionButtons}
        />

        {/* Positions Section */}
        <PerpsHomeSection
          title={strings('perps.home.positions')}
          subtitle={positionsSubtitle}
          subtitleColor={positionsSubtitleColor}
          subtitleSuffix={positionsSubtitleSuffix}
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
                source={PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB}
              />
            ))}
          </View>
        </PerpsHomeSection>

        {/* Orders Section */}
        <PerpsHomeSection
          title={strings('perps.home.orders')}
          isLoading={isLoading.orders}
          isEmpty={orders.length === 0}
          showWhenEmpty={false}
          onActionPress={handleCancelAllPress}
          renderSkeleton={() => <PerpsRowSkeleton count={2} />}
        >
          <View style={styles.positionsOrdersContainer}>
            {orders.map((order) => (
              <PerpsCard
                key={order.orderId}
                order={order}
                source={PERPS_EVENT_VALUE.SOURCE.HOMESCREEN_TAB}
              />
            ))}
          </View>
        </PerpsHomeSection>

        {/* Watchlist Section */}
        <PerpsWatchlistMarkets
          markets={watchlistMarkets}
          isLoading={isLoading.markets}
          positions={positions}
          orders={orders}
        />

        {/* Crypto Markets List */}
        <View onLayout={handleSectionLayout('explore_crypto')}>
          <PerpsMarketTypeSection
            title={strings('perps.home.crypto')}
            markets={perpsMarkets}
            marketType="crypto"
            sortBy={sortBy}
            isLoading={isLoading.markets}
          />
        </View>

        {/* Commodities Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.commodities')}
          markets={commoditiesMarkets}
          marketType="commodities"
          sortBy={sortBy}
          isLoading={isLoading.markets}
        />

        {/* Stocks Markets List */}
        <View onLayout={handleSectionLayout('explore_stocks')}>
          <PerpsMarketTypeSection
            title={strings('perps.home.stocks')}
            markets={stocksMarkets}
            marketType="stocks"
            sortBy={sortBy}
            isLoading={isLoading.markets}
          />
        </View>

        {/* Forex Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.forex')}
          markets={forexMarkets}
          marketType="forex"
          isLoading={isLoading.markets}
        />

        {/* Recent Activity List */}
        <View onLayout={handleSectionLayout('activity')}>
          <PerpsRecentActivityList
            transactions={recentActivity}
            isLoading={isLoading.activity}
          />
        </View>

        <View style={styles.sectionContent}>
          <PerpsNavigationCard items={navigationItems} />
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={bottomSpacerStyle} />
      </ScrollView>

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
      {!isBalanceEmpty &&
        !showCloseAllSheet &&
        !showCancelAllSheet &&
        !HOME_SCREEN_CONFIG.ShowHeaderActionButtons && (
          <View style={fixedFooterStyle}>
            <View style={styles.footerButtonsContainer}>
              <View style={styles.footerButton}>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  onPress={handleWithdraw}
                  isFullWidth
                  testID={PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON}
                >
                  {strings('perps.withdraw')}
                </Button>
              </View>
              <View style={styles.footerButton}>
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  onPress={handleAddFunds}
                  isFullWidth
                  testID={PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON}
                >
                  {strings('perps.add_funds')}
                </Button>
              </View>
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
    </SafeAreaView>
  );
};

export default PerpsHomeView;
