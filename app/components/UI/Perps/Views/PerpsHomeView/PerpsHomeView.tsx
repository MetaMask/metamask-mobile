import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { View, ScrollView, Modal } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  usePerpsHomeData,
  usePerpsNavigation,
  usePerpsMeasurement,
} from '../../hooks';
import { usePerpsHomeActions } from '../../hooks/usePerpsHomeActions';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { BigNumber } from 'bignumber.js';
import { LEARN_MORE_CONFIG, SUPPORT_CONFIG } from '../../constants/perpsConfig';
import PerpsMarketBalanceActions from '../../components/PerpsMarketBalanceActions';
import PerpsCard from '../../components/PerpsCard';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import PerpsMarketTypeSection from '../../components/PerpsMarketTypeSection';
import PerpsRecentActivityList from '../../components/PerpsRecentActivityList/PerpsRecentActivityList';
import PerpsHomeSection from '../../components/PerpsHomeSection';
import PerpsRowSkeleton from '../../components/PerpsRowSkeleton';
import PerpsHomeHeader from '../../components/PerpsHomeHeader';
import type { PerpsNavigationParamList } from '../../types/navigation';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import styleSheet from './PerpsHomeView.styles';
import { TraceName } from '../../../../../util/trace';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsHomeViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsCloseAllPositionsView from '../PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsCancelAllOrdersView from '../PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import PerpsNavigationCard, {
  NavigationItem,
} from '../../components/PerpsNavigationCard/PerpsNavigationCard';

const PerpsHomeView = () => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsMarketListView'>>();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Use centralized navigation hook
  const perpsNavigation = usePerpsNavigation();

  // Bottom sheet state and refs
  const [showCloseAllSheet, setShowCloseAllSheet] = useState(false);
  const [showCancelAllSheet, setShowCancelAllSheet] = useState(false);
  const closeAllSheetRef = useRef<BottomSheetRef>(null);
  const cancelAllSheetRef = useRef<BottomSheetRef>(null);

  // Use hook for eligibility checks and action handlers
  const {
    handleAddFunds,
    handleWithdraw,
    isEligibilityModalVisible,
    closeEligibilityModal,
  } = usePerpsHomeActions();

  // Get balance state directly from Redux
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const totalBalance = perpsAccount?.totalBalance || '0';
  const isBalanceEmpty = BigNumber(totalBalance).isZero();

  // Fetch all home screen data
  const {
    positions,
    orders,
    watchlistMarkets,
    perpsMarkets, // Crypto markets (renamed from trendingMarkets)
    stocksAndCommoditiesMarkets,
    forexMarkets,
    recentActivity,
    sortBy,
    isLoading,
  } = usePerpsHomeData({});

  // Determine if any data is loading for initial load tracking
  // Orders and activity load via WebSocket instantly, only track positions and markets
  const isAnyLoading = isLoading.positions || isLoading.markets;

  // Performance tracking: Measure screen load time until data is displayed
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketListView, // Keep same trace name for consistency
    conditions: [!isAnyLoading],
  });

  // Track home screen viewed event
  const source =
    route.params?.source || PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON;
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!isAnyLoading],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.HOMESCREEN,
      [PerpsEventProperties.SOURCE]: source,
    },
  });

  const handleSearchToggle = useCallback(() => {
    // Navigate to MarketListView with search enabled
    perpsNavigation.navigateToMarketList({
      defaultSearchVisible: true,
      source: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
      fromHome: true,
    });
  }, [perpsNavigation]);

  const navigtateToTutorial = useCallback(() => {
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: PerpsEventValues.SOURCE.HOMESCREEN_TAB,
    });
  }, [navigation]);

  const navigateToContactSupport = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.URL,
        title: strings(SUPPORT_CONFIG.TITLE_KEY),
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [createEventBuilder, navigation, trackEvent]);

  const navigationItems: NavigationItem[] = useMemo(() => {
    const items: NavigationItem[] = [
      {
        label: strings(SUPPORT_CONFIG.TITLE_KEY),
        onPress: () => navigateToContactSupport(),
        testID: PerpsHomeViewSelectorsIDs.SUPPORT_BUTTON,
      },
    ];

    // Avoid duplicate "Learn more" button (shown in empty state card)
    if (!isBalanceEmpty) {
      items.push({
        label: strings(LEARN_MORE_CONFIG.TITLE_KEY),
        onPress: () => navigtateToTutorial(),
        testID: PerpsHomeViewSelectorsIDs.LEARN_MORE_BUTTON,
      });
    }

    return items;
  }, [navigateToContactSupport, navigtateToTutorial, isBalanceEmpty]);

  // Bottom sheet handlers - open sheets directly
  const handleCloseAllPress = useCallback(() => {
    setShowCloseAllSheet(true);
  }, []);

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
      {/* Header - Using extracted component */}
      <PerpsHomeHeader
        isSearchVisible={false}
        onBack={handleBackPress}
        onSearchToggle={handleSearchToggle}
        testID="perps-home"
      />

      {/* Main Content - ScrollView with all carousels */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Actions Component */}
        <PerpsMarketBalanceActions
          positions={positions}
          showActionButtons={false}
        />

        {/* Positions Section */}
        <PerpsHomeSection
          title={strings('perps.home.positions')}
          isLoading={isLoading.positions}
          isEmpty={positions.length === 0}
          showWhenEmpty={false}
          showActionIcon
          onActionPress={handleCloseAllPress}
          renderSkeleton={() => <PerpsRowSkeleton count={2} />}
        >
          <View style={styles.sectionContent}>
            {positions.map((position, index) => (
              <PerpsCard
                key={`${position.coin}-${index}`}
                position={position}
                source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
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
          showActionIcon
          onActionPress={handleCancelAllPress}
          renderSkeleton={() => <PerpsRowSkeleton count={2} />}
        >
          <View style={styles.sectionContent}>
            {orders.map((order) => (
              <PerpsCard
                key={order.orderId}
                order={order}
                source={PerpsEventValues.SOURCE.HOMESCREEN_TAB}
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
        <PerpsMarketTypeSection
          title={strings('perps.home.crypto')}
          markets={perpsMarkets}
          marketType="crypto"
          sortBy={sortBy}
          isLoading={isLoading.markets}
        />

        {/* Stocks & Commodities Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.stocks_and_commodities')}
          markets={stocksAndCommoditiesMarkets}
          marketType="stocks_and_commodities"
          sortBy={sortBy}
          isLoading={isLoading.markets}
        />

        {/* Forex Markets List */}
        <PerpsMarketTypeSection
          title={strings('perps.home.forex')}
          markets={forexMarkets}
          marketType="forex"
          isLoading={isLoading.markets}
        />

        {/* Recent Activity List */}
        <PerpsRecentActivityList
          transactions={recentActivity}
          isLoading={isLoading.activity}
        />

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
      {!isBalanceEmpty && !showCloseAllSheet && !showCancelAllSheet && (
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
    </SafeAreaView>
  );
};

export default PerpsHomeView;
