import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { ScrollView, View, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsPerformance,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { usePerpsLiveOrders } from '../../hooks/stream';
import PerpsMarketTabs from '../../components/PerpsMarketTabs/PerpsMarketTabs';
import type { PerpsTabId } from '../../components/PerpsMarketTabs/PerpsMarketTabs.types';
import PerpsNotificationTooltip from '../../components/PerpsNotificationTooltip';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import TradingViewChart, {
  type TradingViewChartRef,
} from '../../components/TradingViewChart';
import PerpsCandlePeriodSelector from '../../components/PerpsCandlePeriodSelector';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import { getPerpsMarketDetailsNavbar } from '../../../Navbar';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useSelector } from 'react-redux';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';

interface MarketDetailsRouteParams {
  market: PerpsMarketData;
  initialTab?: PerpsTabId;
  isNavigationFromOrderSuccess?: boolean;
}

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<{ params: MarketDetailsRouteParams }, 'params'>>();
  const { market, initialTab, isNavigationFromOrderSuccess } =
    route.params || {};
  const { track } = usePerpsEventTracking();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  // Track screen load time
  const { startMeasure, endMeasure } = usePerpsPerformance();
  const hasTrackedAssetView = useRef(false);

  const isEligible = useSelector(selectPerpsEligibility);

  // Start measuring screen load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.ASSET_SCREEN_LOADED);
    startMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_ASSET_SCREEN);
  }, [startMeasure]);

  // Set navigation header with proper back button
  useEffect(() => {
    if (market) {
      navigation.setOptions(
        getPerpsMarketDetailsNavbar(navigation, market.symbol),
      );
    }
  }, [navigation, market]);

  const [selectedCandlePeriod, setSelectedCandlePeriod] =
    useState<CandlePeriod>(CandlePeriod.THREE_MINUTES);
  const [visibleCandleCount, setVisibleCandleCount] = useState<number>(45);
  const [isMoreCandlePeriodsVisible, setIsMoreCandlePeriodsVisible] =
    useState(false);
  const chartRef = useRef<TradingViewChartRef>(null);

  const [refreshing, setRefreshing] = useState(false);

  // TP/SL order selection state - track TP and SL separately
  const [activeTPOrderId, setActiveTPOrderId] = useState<string | null>(null);
  const [activeSLOrderId, setActiveSLOrderId] = useState<string | null>(null);

  const account = usePerpsAccount();

  usePerpsConnection();
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  // Get real-time open orders via WebSocket
  // const ordersData = usePerpsLiveOrders({ hideTpSl: true }); // Instant updates with TP/SL filtered
  const ordersData = usePerpsLiveOrders({});
  // console.log('ordersData', JSON.stringify(ordersData, null, 2));
  // Filter orders for the current market
  const openOrders = useMemo(() => {
    if (!ordersData?.length || !market?.symbol) return [];
    return ordersData.filter((order) => order.symbol === market.symbol);
  }, [ordersData, market?.symbol]);

  // Filter orders that have TP/SL data for chart integration
  const ordersWithTPSL = useMemo(
    () =>
      openOrders.filter((order) => {
        // Check if order has TP/SL prices directly
        if (order.takeProfitPrice || order.stopLossPrice) return true;

        // Check if it's a trigger order (TP/SL orders are stored as trigger orders)
        if (order.isTrigger && order.detailedOrderType) {
          const orderType = order.detailedOrderType.toLowerCase();
          return (
            orderType.includes('take profit') || orderType.includes('stop')
          );
        }

        return false;
      }),
    [openOrders],
  );

  // Determine which TP/SL lines to show on the chart
  const selectedOrderTPSL = useMemo(() => {
    // Find the active TP order
    let activeTPOrder = ordersWithTPSL.find(
      (order) => order.orderId === activeTPOrderId,
    );
    // Only use default TP if no TP has ever been explicitly selected
    if (!activeTPOrder && activeTPOrderId === null) {
      activeTPOrder = ordersWithTPSL.find((order) => {
        if (order.takeProfitPrice) return true;
        if (
          order.isTrigger &&
          order.detailedOrderType?.toLowerCase().includes('take profit')
        )
          return true;
        return false;
      });
    }

    // Find the active SL order
    let activeSLOrder = ordersWithTPSL.find(
      (order) => order.orderId === activeSLOrderId,
    );
    // Only use default SL if no SL has ever been explicitly selected
    if (!activeSLOrder && activeSLOrderId === null) {
      activeSLOrder = ordersWithTPSL.find((order) => {
        if (order.stopLossPrice) return true;
        if (
          order.isTrigger &&
          order.detailedOrderType?.toLowerCase().includes('stop')
        )
          return true;
        return false;
      });
    }

    const result = {
      takeProfitPrice: activeTPOrder?.takeProfitPrice || activeTPOrder?.price,
      stopLossPrice: activeSLOrder?.stopLossPrice || activeSLOrder?.price,
      activeTPOrderId: activeTPOrder?.orderId,
      activeSLOrderId: activeSLOrder?.orderId,
    };
    return result;
  }, [ordersWithTPSL, activeTPOrderId, activeSLOrderId]);

  const hasZeroBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0') === 0,
    [account?.availableBalance],
  );

  // Get comprehensive market statistics
  const marketStats = usePerpsMarketStats(market?.symbol || '');

  const { candleData, isLoadingHistory, refreshCandleData } =
    usePerpsPositionData({
      coin: market?.symbol || '',
      selectedDuration: TimeDuration.YEAR_TO_DATE,
      selectedInterval: selectedCandlePeriod,
    });

  // Check if user has an existing position for this market
  const { isLoading: isLoadingPosition, existingPosition } =
    useHasExistingPosition({
      asset: market?.symbol || '',
      loadOnMount: true,
    });

  // Track screen load and position data loaded
  useEffect(() => {
    if (
      market &&
      marketStats &&
      !isLoadingHistory &&
      !hasTrackedAssetView.current
    ) {
      // Track asset screen loaded
      endMeasure(PerpsMeasurementName.ASSET_SCREEN_LOADED);

      // Track asset screen viewed event - only once
      track(MetaMetricsEvents.PERPS_ASSET_SCREEN_VIEWED, {
        [PerpsEventProperties.ASSET]: market.symbol,
        [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_MARKETS,
      });

      hasTrackedAssetView.current = true;
    }
  }, [market, marketStats, isLoadingHistory, track, endMeasure]);

  useEffect(() => {
    if (!isLoadingPosition && market) {
      // Track position data loaded for asset screen
      endMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_ASSET_SCREEN);
    }
  }, [isLoadingPosition, market, endMeasure]);

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      setSelectedCandlePeriod(newPeriod);

      // Track chart interaction
      track(MetaMetricsEvents.PERPS_CHART_INTERACTION, {
        [PerpsEventProperties.ASSET]: market?.symbol || '',
        [PerpsEventProperties.INTERACTION_TYPE]: 'candle_period_change',
        [PerpsEventProperties.CANDLE_PERIOD]: newPeriod,
      });

      // Zoom to latest candle when period changes
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
    },
    [market, track, visibleCandleCount],
  );

  const handleMorePress = useCallback(() => {
    setIsMoreCandlePeriodsVisible(true);
  }, []);

  const handleMoreCandlePeriodsClose = useCallback(() => {
    setIsMoreCandlePeriodsVisible(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Reset chart to default state (like initial navigation)
      setSelectedCandlePeriod(CandlePeriod.THREE_MINUTES);
      setVisibleCandleCount(45);

      // Reset chart view to default position
      chartRef.current?.resetToDefault();

      if (candleData) {
        await refreshCandleData();
      }
    } catch (error) {
      console.error('Failed to refresh candle data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [candleData, refreshCandleData]);

  // Handle order selection for chart integration
  const handleOrderSelect = useCallback(
    (orderId: string) => {
      const selectedOrder = ordersWithTPSL.find(
        (order) => order.orderId === orderId,
      );

      if (selectedOrder) {
        const hasBothTPSL =
          selectedOrder.takeProfitPrice && selectedOrder.stopLossPrice;

        if (hasBothTPSL) {
          setActiveTPOrderId(orderId);
          setActiveSLOrderId(orderId);
        } else if (selectedOrder.isTrigger && selectedOrder.detailedOrderType) {
          const orderType = selectedOrder.detailedOrderType.toLowerCase();
          if (orderType.includes('take profit')) {
            setActiveTPOrderId(orderId);
          } else if (orderType.includes('stop')) {
            setActiveSLOrderId(orderId);
          }
        } else if (selectedOrder.takeProfitPrice) {
          setActiveTPOrderId(orderId);
        } else if (selectedOrder.stopLossPrice) {
          setActiveSLOrderId(orderId);
        }
      }
    },
    [ordersWithTPSL],
  );

  // Handle order cancellation to update chart
  const handleOrderCancelled = useCallback(
    (cancelledOrderId: string) => {
      // If the cancelled order was the active TP order, clear it
      if (activeTPOrderId === cancelledOrderId) {
        setActiveTPOrderId(null);
      }

      // If the cancelled order was the active SL order, clear it
      if (activeSLOrderId === cancelledOrderId) {
        setActiveSLOrderId(null);
      }
    },
    [activeTPOrderId, activeSLOrderId],
  );

  // Check if notifications feature is enabled once
  const isNotificationsEnabled = isNotificationsFeatureEnabled();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to markets list if no previous screen
      navigation.navigate(Routes.PERPS.MARKETS);
    }
  };

  const handleLongPress = () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    navigation.navigate(Routes.PERPS.ORDER, {
      direction: 'long',
      asset: market.symbol,
    });
  };

  const handleShortPress = () => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    navigation.navigate(Routes.PERPS.ORDER, {
      direction: 'short',
      asset: market.symbol,
    });
  };

  const handleAddFundsPress = async () => {
    try {
      if (!isEligible) {
        setIsEligibilityModalVisible(true);
        return;
      }

      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      // Navigate immediately to confirmations screen for instant UI response
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });

      // Initialize deposit in the background without blocking
      depositWithConfirmation().catch((error) => {
        console.error('Failed to initialize deposit:', error);
      });
    } catch (error) {
      console.error('Failed to navigate to deposit:', error);
    }
  };

  const handleTradingViewPress = useCallback(() => {
    Linking.openURL('https://www.tradingview.com/').catch((error: unknown) => {
      console.error('Failed to open Trading View URL:', error);
    });
  }, []);

  // Determine if any action buttons will be visible
  const hasLongShortButtons = useMemo(
    () => !isLoadingPosition && !hasZeroBalance,
    [isLoadingPosition, hasZeroBalance],
  );

  const hasAddFundsButton = useMemo(
    () => hasZeroBalance && !isLoadingPosition,
    [hasZeroBalance, isLoadingPosition],
  );

  // Simplified styles - no complex calculations needed
  const { styles, theme } = useStyles(createStyles, {});

  if (!market) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={styles.errorContainer}
          testID={PerpsMarketDetailsViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('perps.market.details.error_message')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.mainContainer}
      testID={PerpsMarketDetailsViewSelectorsIDs.CONTAINER}
    >
      {/* Fixed Header Section */}
      <View>
        <PerpsMarketHeader
          market={market}
          onBackPress={handleBackPress}
          onActivityPress={() =>
            navigation.navigate(Routes.TRANSACTIONS_VIEW, {
              screen: Routes.TRANSACTIONS_VIEW,
              params: { redirectToPerpsTransactions: true },
            })
          }
          testID={PerpsMarketDetailsViewSelectorsIDs.HEADER}
        />
      </View>

      {/* Scrollable Content Container */}
      <View style={styles.scrollableContentContainer}>
        <ScrollView
          style={styles.mainContentScrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          testID={PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.icon.default}
              colors={[theme.colors.icon.default]} // Android
            />
          }
        >
          {/* TradingView Chart Section */}
          <View style={[styles.section, styles.chartSection]}>
            <TradingViewChart
              ref={chartRef}
              candleData={candleData}
              height={350}
              visibleCandleCount={visibleCandleCount}
              tpslLines={
                existingPosition
                  ? {
                      entryPrice: existingPosition.entryPrice,
                      takeProfitPrice:
                        selectedOrderTPSL.takeProfitPrice ||
                        existingPosition.takeProfitPrice,
                      stopLossPrice:
                        selectedOrderTPSL.stopLossPrice ||
                        existingPosition.stopLossPrice,
                      liquidationPrice:
                        existingPosition.liquidationPrice || undefined,
                    }
                  : selectedOrderTPSL.takeProfitPrice ||
                    selectedOrderTPSL.stopLossPrice
                  ? {
                      takeProfitPrice: selectedOrderTPSL.takeProfitPrice,
                      stopLossPrice: selectedOrderTPSL.stopLossPrice,
                    }
                  : undefined
              }
              testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`}
            />

            {/* Candle Period Selector */}
            <PerpsCandlePeriodSelector
              selectedPeriod={selectedCandlePeriod}
              onPeriodChange={handleCandlePeriodChange}
              onMorePress={handleMorePress}
              testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector`}
            />
          </View>

          {/* Market Tabs Section */}
          <View style={styles.section}>
            <PerpsMarketTabs
              symbol={market?.symbol || ''}
              marketStats={marketStats}
              position={existingPosition}
              isLoadingPosition={isLoadingPosition}
              unfilledOrders={openOrders}
              initialTab={initialTab}
              nextFundingTime={market?.nextFundingTime}
              fundingIntervalHours={market?.fundingIntervalHours}
              onOrderSelect={handleOrderSelect}
              onOrderCancelled={handleOrderCancelled}
              activeTPOrderId={selectedOrderTPSL?.activeTPOrderId}
              activeSLOrderId={selectedOrderTPSL?.activeSLOrderId}
            />
          </View>

          {/* Risk Disclaimer Section */}
          <View style={styles.section}>
            <Text
              style={styles.riskDisclaimer}
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
            >
              {strings('perps.risk_disclaimer')}{' '}
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Alternative}
                onPress={handleTradingViewPress}
              >
                Trading View.
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Actions Footer */}
      {(hasAddFundsButton || hasLongShortButtons) && (
        <View style={styles.actionsFooter}>
          {hasAddFundsButton && (
            <View style={styles.singleActionContainer}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('perps.market.add_funds_to_start_trading_perps')}
              </Text>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.add_funds')}
                onPress={handleAddFundsPress}
                testID={PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON}
              />
            </View>
          )}

          {hasLongShortButtons && (
            <View style={styles.actionsContainer}>
              <View style={styles.actionButtonWrapper}>
                <ButtonSemantic
                  severity={ButtonSemanticSeverity.Success}
                  onPress={handleLongPress}
                  isFullWidth
                  size={ButtonSizeRNDesignSystem.Lg}
                  testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
                >
                  {strings('perps.market.long')}
                </ButtonSemantic>
              </View>

              <View style={styles.actionButtonWrapper}>
                <ButtonSemantic
                  severity={ButtonSemanticSeverity.Danger}
                  onPress={handleShortPress}
                  isFullWidth
                  size={ButtonSizeRNDesignSystem.Lg}
                  testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
                >
                  {strings('perps.market.short')}
                </ButtonSemantic>
              </View>
            </View>
          )}
        </View>
      )}

      {/* More Candle Periods Bottom Sheet - Rendered at root level */}
      <PerpsCandlePeriodBottomSheet
        isVisible={isMoreCandlePeriodsVisible}
        onClose={handleMoreCandlePeriodsClose}
        selectedPeriod={selectedCandlePeriod}
        selectedDuration={TimeDuration.YEAR_TO_DATE} // Not used when showAllPeriods is true
        onPeriodChange={handleCandlePeriodChange}
        showAllPeriods
        testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-more-candle-periods-bottom-sheet`}
      />

      {isEligibilityModalVisible && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={() => setIsEligibilityModalVisible(false)}
          contentKey={'geo_block'}
          testID={
            PerpsMarketDetailsViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP
          }
        />
      )}

      {/* Notification Tooltip - Shows after first successful order */}
      {isNotificationsEnabled && isNavigationFromOrderSuccess && (
        <PerpsNotificationTooltip
          orderSuccess={isNavigationFromOrderSuccess}
          testID={PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP}
        />
      )}
    </SafeAreaView>
  );
};

// Enable Why Did You Render in development
// Uncomment to enable WDYR for debugging re-renders
// if (__DEV__) {
//   // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
//   const { shouldEnableWhyDidYouRender } = require('../../../../../../wdyr');
//   if (shouldEnableWhyDidYouRender()) {
//     // @ts-expect-error - whyDidYouRender is added by the WDYR library
//     PerpsMarketDetailsView.whyDidYouRender = {
//       logOnDifferentValues: true,
//       customName: 'PerpsMarketDetailsView',
//     };
//   }
// }

export default PerpsMarketDetailsView;
