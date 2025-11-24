import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketTabsSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsTutorialSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import { setPerpsChartPreferredCandlePeriod } from '../../../../../actions/settings';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
import type { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import { ensureError } from '../../utils/perpsErrorHandler';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import { getPerpsMarketDetailsNavbar } from '../../../Navbar';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsCandlePeriodSelector from '../../components/PerpsCandlePeriodSelector';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import PerpsMarketHoursBanner from '../../components/PerpsMarketHoursBanner';
import PerpsMarketStatisticsCard from '../../components/PerpsMarketStatisticsCard';
import PerpsMarketTradesList from '../../components/PerpsMarketTradesList';
import PerpsNavigationCard, {
  type NavigationItem,
} from '../../components/PerpsNavigationCard/PerpsNavigationCard';
import PerpsNotificationTooltip from '../../components/PerpsNotificationTooltip';
import PerpsOICapWarning from '../../components/PerpsOICapWarning';
import PerpsCompactOrderRow from '../../components/PerpsCompactOrderRow';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsFlipPositionConfirmSheet from '../../components/PerpsFlipPositionConfirmSheet';
import TradingViewChart, {
  type TradingViewChartRef,
} from '../../components/TradingViewChart';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import type { PerpsTabId } from '../../components/PerpsMarketTabs/PerpsMarketTabs.types';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
  Position,
  TPSLTrackingData,
} from '../../controllers/types';
import {
  usePerpsConnection,
  usePerpsNavigation,
  usePerpsNetworkManagement,
  usePerpsTrading,
} from '../../hooks';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import {
  usePerpsDataMonitor,
  type DataMonitorParams,
} from '../../hooks/usePerpsDataMonitor';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import { usePerpsTPSLUpdate } from '../../hooks/usePerpsTPSLUpdate';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';
import {
  createSelectIsWatchlistMarket,
  selectPerpsEligibility,
} from '../../selectors/perpsController';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { getMarketHoursStatus } from '../../utils/marketHours';
import PerpsSelectAdjustMarginActionView from '../PerpsSelectAdjustMarginActionView';
import PerpsSelectModifyActionView from '../PerpsSelectModifyActionView';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';

interface MarketDetailsRouteParams {
  market: PerpsMarketData;
  initialTab?: PerpsTabId;
  monitoringIntent?: Partial<DataMonitorParams>;
  isNavigationFromOrderSuccess?: boolean;
  source?: string;
}

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  // Use centralized navigation hook for all Perps navigation
  const {
    navigateToHome,
    navigateToActivity,
    navigateToOrder,
    navigateToTutorial,
    navigateToOrderDetails,
    navigateBack,
    canGoBack,
  } = usePerpsNavigation();

  // Keep direct navigation for configuration methods (setOptions, setParams)
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<{ params: MarketDetailsRouteParams }, 'params'>>();
  const { market, monitoringIntent, source } = route.params || {};
  const { track } = usePerpsEventTracking();
  const dispatch = useDispatch();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const [isMarketHoursModalVisible, setIsMarketHoursModalVisible] =
    useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const isEligible = useSelector(selectPerpsEligibility);

  // Check if current market is in watchlist
  const selectIsWatchlist = useMemo(
    () => createSelectIsWatchlistMarket(market?.symbol || ''),
    [market?.symbol],
  );
  const isWatchlistFromRedux = useSelector(selectIsWatchlist);

  // Optimistic local state for instant UI feedback
  const [optimisticWatchlist, setOptimisticWatchlist] = useState<
    boolean | null
  >(null);
  const isWatchlist = optimisticWatchlist ?? isWatchlistFromRedux;

  // Reset optimistic state when market changes
  useEffect(() => {
    setOptimisticWatchlist(null);
  }, [market?.symbol]);

  // Clear optimistic state once Redux has caught up
  useEffect(() => {
    if (
      optimisticWatchlist !== null &&
      optimisticWatchlist === isWatchlistFromRedux
    ) {
      setOptimisticWatchlist(null);
    }
  }, [isWatchlistFromRedux, optimisticWatchlist]);

  // Set navigation header with proper back button
  useEffect(() => {
    if (market) {
      navigation.setOptions(
        getPerpsMarketDetailsNavbar(navigation, market.symbol),
      );
    }
  }, [navigation, market]);

  // Get persisted candle period preference from Redux store
  const selectedCandlePeriod = useSelector(
    selectPerpsChartPreferredCandlePeriod,
  );
  const [visibleCandleCount, setVisibleCandleCount] = useState<number>(45);
  const [isMoreCandlePeriodsVisible, setIsMoreCandlePeriodsVisible] =
    useState(false);
  const chartRef = useRef<TradingViewChartRef>(null);

  // Bottom sheet refs - using PerpsHomeView pattern
  const modifyActionSheetRef = useRef<BottomSheetRef>(null);
  const adjustMarginActionSheetRef = useRef<BottomSheetRef>(null);
  const reversePositionSheetRef = useRef<BottomSheetRef>(null);

  const [refreshing, setRefreshing] = useState(false);

  const { account } = usePerpsLiveAccount();

  // A/B Testing: Button color test (TAT-1937)
  const {
    variantName: buttonColorVariant,
    isEnabled: isButtonColorTestEnabled,
  } = usePerpsABTest({
    test: BUTTON_COLOR_TEST,
    featureFlagSelector: selectPerpsButtonColorTestVariant,
  });

  // TP/SL order selection state - track TP and SL separately
  const [activeTPOrderId, setActiveTPOrderId] = useState<string | null>(null);
  const [activeSLOrderId, setActiveSLOrderId] = useState<string | null>(null);

  // Bottom sheet visibility state - using PerpsHomeView pattern
  const [showModifyActionSheet, setShowModifyActionSheet] = useState(false);
  const [showAdjustMarginActionSheet, setShowAdjustMarginActionSheet] =
    useState(false);
  const [showReversePositionSheet, setShowReversePositionSheet] =
    useState(false);

  usePerpsConnection();
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const { handleUpdateTPSL } = usePerpsTPSLUpdate({
    onSuccess: () => {
      // TP/SL updated successfully, WebSocket will propagate updates
    },
  });

  // Check if market is at open interest cap
  const { isAtCap: isAtOICap } = usePerpsOICap(market?.symbol);

  // Callback to handle data detection from monitoring hook
  const handleDataDetected = useCallback(
    ({
      detectedData: _detectedData,
    }: {
      detectedData: 'positions' | 'orders';
      asset: string;
      reason: string;
    }) => {
      // Clear monitoringIntent to allow fresh monitoring next time
      navigation.setParams({ monitoringIntent: undefined });
    },
    [navigation],
  );

  // Handle data-driven monitoring when coming from order success (declarative API)
  usePerpsDataMonitor({
    asset: monitoringIntent?.asset,
    monitorOrders: monitoringIntent?.monitorOrders,
    monitorPositions: monitoringIntent?.monitorPositions,
    timeoutMs: monitoringIntent?.timeoutMs,
    onDataDetected: handleDataDetected,
    enabled: !!(monitoringIntent && market && monitoringIntent.asset),
  });

  // Bottom sheet open effects - using PerpsHomeView pattern
  useEffect(() => {
    if (showModifyActionSheet) {
      modifyActionSheetRef.current?.onOpenBottomSheet();
    }
  }, [showModifyActionSheet]);

  useEffect(() => {
    if (showAdjustMarginActionSheet) {
      adjustMarginActionSheetRef.current?.onOpenBottomSheet();
    }
  }, [showAdjustMarginActionSheet]);

  useEffect(() => {
    if (showReversePositionSheet) {
      reversePositionSheetRef.current?.onOpenBottomSheet();
    }
  }, [showReversePositionSheet]);

  // Get real-time open orders via WebSocket
  const { orders: ordersData } = usePerpsLiveOrders({});
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

  // Sort orders: put reduce-only orders (TP/SL) at the bottom
  const sortedOrders = useMemo(
    () =>
      [...openOrders].sort((a, b) => {
        // Reduce-only orders go to the bottom
        if (a.reduceOnly && !b.reduceOnly) return 1;
        if (!a.reduceOnly && b.reduceOnly) return -1;
        return 0;
      }),
    [openOrders],
  );

  // Filter out TP/SL orders for compact display
  const nonTPSLOrders = useMemo(
    () => sortedOrders.filter((order) => !order.reduceOnly),
    [sortedOrders],
  );

  const orderChildOrderIds = useMemo(
    () =>
      openOrders
        .filter((order) => order.takeProfitOrderId || order.stopLossOrderId)
        .reduce((acc, order) => {
          if (order.takeProfitOrderId) {
            acc.push(order.takeProfitOrderId);
          }
          if (order.stopLossOrderId) {
            acc.push(order.stopLossOrderId);
          }
          return acc;
        }, [] as string[]),
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
        if (
          order.isTrigger &&
          order.detailedOrderType?.toLowerCase().includes('take profit') &&
          !orderChildOrderIds.includes(order.orderId)
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
        if (
          order.isTrigger &&
          order.detailedOrderType?.toLowerCase().includes('stop') &&
          !orderChildOrderIds.includes(order.orderId)
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
  }, [ordersWithTPSL, activeTPOrderId, activeSLOrderId, orderChildOrderIds]);

  const hasZeroBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0') === 0,
    [account?.availableBalance],
  );

  // Get comprehensive market statistics
  const marketStats = usePerpsMarketStats(market?.symbol || '');

  const { candleData, isLoadingHistory, refreshCandleData, hasHistoricalData } =
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

  // Compute TP/SL lines for the chart based on existing position and selected orders
  const tpslLines = useMemo(() => {
    if (existingPosition) {
      return {
        entryPrice: existingPosition.entryPrice,
        takeProfitPrice:
          selectedOrderTPSL.takeProfitPrice || existingPosition.takeProfitPrice,
        stopLossPrice:
          selectedOrderTPSL.stopLossPrice || existingPosition.stopLossPrice,
        liquidationPrice: existingPosition.liquidationPrice || undefined,
      };
    }

    if (selectedOrderTPSL.takeProfitPrice || selectedOrderTPSL.stopLossPrice) {
      return {
        takeProfitPrice: selectedOrderTPSL.takeProfitPrice,
        stopLossPrice: selectedOrderTPSL.stopLossPrice,
      };
    }

    return undefined;
  }, [existingPosition, selectedOrderTPSL]);

  // Track Perps asset screen load performance with simplified API
  usePerpsMeasurement({
    traceName: TraceName.PerpsPositionDetailsView,
    conditions: [
      !!market,
      !!marketStats,
      !isLoadingHistory,
      !isLoadingPosition,
    ],
    debugContext: {
      symbol: market?.symbol,
      hasMarketStats: !!marketStats,
      loadingStates: { isLoadingHistory, isLoadingPosition },
    },
  });

  // Track asset screen viewed event - declarative (main's event name)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [
      !!market,
      !!marketStats,
      !isLoadingHistory,
      !isLoadingPosition,
    ],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.ASSET_DETAILS,
      [PerpsEventProperties.ASSET]: market?.symbol || '',
      [PerpsEventProperties.SOURCE]:
        source || PerpsEventValues.SOURCE.PERP_MARKETS,
      [PerpsEventProperties.OPEN_POSITION]: !!existingPosition,
      // A/B Test context (TAT-1937) - for baseline exposure tracking
      ...(isButtonColorTestEnabled && {
        [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
      }),
    },
  });

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      // Persist the preference to Redux store
      dispatch(setPerpsChartPreferredCandlePeriod(newPeriod));

      // Track chart interaction
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.ASSET]: market?.symbol || '',
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
        [PerpsEventProperties.CANDLE_PERIOD]: newPeriod,
      });

      // Zoom to latest candle when period changes
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
    },
    [market, track, visibleCandleCount, dispatch],
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
      setVisibleCandleCount(45);

      // Reset chart view to default position
      chartRef.current?.resetToDefault();

      if (candleData) {
        await refreshCandleData();
      }
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
        },
      });
    } finally {
      setRefreshing(false);
    }
  }, [candleData, refreshCandleData]);

  // Handle order selection for chart integration and navigation
  const handleOrderSelect = useCallback(
    (orderId: string) => {
      // Check if this is a TP/SL order for chart visualization
      const tpslOrder = ordersWithTPSL.find(
        (order) => order.orderId === orderId,
      );

      if (tpslOrder) {
        // Handle TP/SL chart integration
        const hasBothTPSL =
          tpslOrder.takeProfitPrice && tpslOrder.stopLossPrice;

        if (hasBothTPSL) {
          setActiveTPOrderId(orderId);
          setActiveSLOrderId(orderId);
        } else if (tpslOrder.isTrigger && tpslOrder.detailedOrderType) {
          const orderType = tpslOrder.detailedOrderType.toLowerCase();
          if (orderType.includes('take profit')) {
            setActiveTPOrderId(orderId);
          } else if (orderType.includes('stop')) {
            setActiveSLOrderId(orderId);
          }
        } else if (tpslOrder.takeProfitPrice) {
          setActiveTPOrderId(orderId);
        } else if (tpslOrder.stopLossPrice) {
          setActiveSLOrderId(orderId);
        }
      } else {
        // For non-TP/SL orders (limit orders), navigate to order details
        const order = openOrders.find((o) => o.orderId === orderId);
        if (order) {
          navigateToOrderDetails(order);
        }
      }
    },
    [ordersWithTPSL, openOrders, navigateToOrderDetails],
  );

  // Tooltip handlers for Position and Statistics cards
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  const handleOrderBookPress = useCallback(() => {
    // TODO: Navigate to order book page when implemented
    // For now, this is a placeholder that makes the row clickable
    // navigation.navigate(Routes.PERPS.ORDER_BOOK, { symbol: market?.symbol });
  }, []);

  const handleAutoCloseToggle = useCallback(() => {
    if (!existingPosition) return;

    // Get existing TP/SL values using the same logic as tpslLines
    const existingTP =
      selectedOrderTPSL.takeProfitPrice || existingPosition.takeProfitPrice;
    const existingSL =
      selectedOrderTPSL.stopLossPrice || existingPosition.stopLossPrice;

    navigation.navigate(Routes.PERPS.TPSL, {
      asset: existingPosition.coin,
      position: existingPosition,
      entryPrice: existingPosition.entryPrice,
      liquidationPrice: existingPosition.liquidationPrice || undefined,
      initialTakeProfitPrice: existingTP,
      initialStopLossPrice: existingSL,
      onConfirm: (
        takeProfitPrice?: string,
        stopLossPrice?: string,
        trackingData?: TPSLTrackingData,
      ) => {
        handleUpdateTPSL(
          existingPosition,
          takeProfitPrice,
          stopLossPrice,
          trackingData,
        );
      },
    });
  }, [existingPosition, selectedOrderTPSL, navigation, handleUpdateTPSL]);

  // Check if notifications feature is enabled once
  const isNotificationsEnabled = isNotificationsFeatureEnabled();

  const handleBackPress = () => {
    if (canGoBack) {
      navigateBack();
    } else {
      // Fallback to markets list if no previous screen
      navigateToHome(source);
    }
  };

  const handleWatchlistPress = useCallback(() => {
    if (!market?.symbol) return;

    // Optimistic update - instant UI feedback
    const newWatchlistState = !isWatchlist;
    setOptimisticWatchlist(newWatchlistState);

    // Actual state update
    const controller = Engine.context.PerpsController;
    controller.toggleWatchlistMarket(market.symbol);

    // Track watchlist toggle event
    const watchlistCount = controller.getWatchlistMarkets().length;

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]: 'watchlist_toggled',
      [PerpsEventProperties.ACTION_TYPE]: newWatchlistState
        ? 'add_to_watchlist'
        : 'remove_from_watchlist',
      [PerpsEventProperties.ASSET]: market.symbol,
      [PerpsEventProperties.SOURCE]: 'asset_details',
      watchlist_count: watchlistCount,
    });
  }, [market, isWatchlist, track]);

  const handleTradeAction = useCallback(
    (direction: 'long' | 'short') => {
      if (!isEligible) {
        setIsEligibilityModalVisible(true);
        return;
      }

      // Check for cross-margin position (MetaMask only supports isolated margin)
      if (existingPosition?.leverage?.type === 'cross') {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
        });

        track(MetaMetricsEvents.PERPS_ERROR, {
          [PerpsEventProperties.ERROR_TYPE]:
            PerpsEventValues.ERROR_TYPE.VALIDATION,
          [PerpsEventProperties.ERROR_MESSAGE]:
            'Cross margin position detected',
        });

        return;
      }

      // Track AB test on button press (TAT-1937)
      if (isButtonColorTestEnabled) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TAP,
          [PerpsEventProperties.ASSET]: market.symbol,
          [PerpsEventProperties.DIRECTION]:
            direction === 'long'
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
        });
      }

      navigateToOrder({
        direction,
        asset: market.symbol,
      });
    },
    [
      isEligible,
      existingPosition,
      navigation,
      track,
      navigateToOrder,
      market?.symbol,
      isButtonColorTestEnabled,
      buttonColorVariant,
    ],
  );

  const handleLongPress = () => {
    handleTradeAction('long');
  };

  const handleShortPress = () => {
    handleTradeAction('short');
  };

  const { navigateToConfirmation } = useConfirmNavigation();

  const handleAddFundsPress = async () => {
    try {
      if (!isEligible) {
        setIsEligibilityModalVisible(true);
        return;
      }

      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      // Navigate immediately to confirmations screen for instant UI response
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });

      // Initialize deposit in the background without blocking
      depositWithConfirmation().catch((error) => {
        Logger.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FEATURE_NAME,
          },
        });
      });
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
        },
      });
    }
  };

  const handleTradingViewPress = useCallback(() => {
    Linking.openURL('https://www.tradingview.com/').catch((error: unknown) => {
      Logger.error(ensureError(error), {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
        },
      });
    });
  }, []);

  const handleMarketHoursInfoPress = useCallback(() => {
    setIsMarketHoursModalVisible(true);
  }, []);

  // Position action handlers
  const handleClosePress = useCallback(() => {
    if (!existingPosition) return;
    navigation.navigate(Routes.PERPS.CLOSE_POSITION, {
      position: existingPosition,
    });
  }, [existingPosition, navigation]);

  const handleModifyPress = useCallback(() => {
    if (!existingPosition) return;
    setShowModifyActionSheet(true);
  }, [existingPosition]);

  const handleSharePress = useCallback(() => {
    if (!existingPosition) return;
    navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
      position: existingPosition,
      marketPrice: marketStats?.currentPrice,
    });
  }, [existingPosition, marketStats?.currentPrice, navigation]);

  const handleFlipPress = useCallback(() => {
    if (!existingPosition) return;

    const oppositeDirection =
      parseFloat(existingPosition.size) > 0 ? 'short' : 'long';
    const positionSize = Math.abs(parseFloat(existingPosition.size));
    const positionLeverage = existingPosition.leverage?.value;

    navigateToOrder({
      direction: oppositeDirection,
      asset: existingPosition.coin,
      size: positionSize.toString(),
      leverage: positionLeverage,
    });
  }, [existingPosition, navigateToOrder]);

  const handleMarginPress = useCallback(() => {
    if (!existingPosition) return;
    setShowAdjustMarginActionSheet(true);
  }, [existingPosition]);

  // Bottom sheet close handlers - using PerpsHomeView pattern
  const handleModifyActionSheetClose = useCallback(() => {
    setShowModifyActionSheet(false);
  }, []);

  const handleAdjustMarginActionSheetClose = useCallback(() => {
    setShowAdjustMarginActionSheet(false);
  }, []);

  const handleReversePositionSheetClose = useCallback(() => {
    setShowReversePositionSheet(false);
  }, []);

  const handleReversePositionConfirm = useCallback(() => {
    // Confirmation handled by the sheet component itself (uses flipPosition controller method)
    // Just close the sheet after successful reverse
    setShowReversePositionSheet(false);
  }, []);

  const handleReversePosition = useCallback((_position: Position) => {
    // Show the confirmation sheet when user selects reverse position
    setShowReversePositionSheet(true);
  }, []);

  // Determine market hours content key based on current status - recalculated on each render to stay current
  const marketHoursContentKey = (() => {
    const status = getMarketHoursStatus();
    return status.isOpen ? 'market_hours' : 'after_hours_trading';
  })();

  // Determine risk disclaimer source and HIP type based on market
  const riskDisclaimerParams = useMemo(() => {
    const isHip3 = !!market?.marketSource;
    return {
      source: isHip3 ? market.marketSource : 'Hyperliquid',
    };
  }, [market?.marketSource]);

  // Determine if any action buttons will be visible
  const hasPosition = useMemo(
    () => !isLoadingPosition && !!existingPosition,
    [isLoadingPosition, existingPosition],
  );

  const hasLongShortButtons = useMemo(
    () => !isLoadingPosition && !hasZeroBalance && !hasPosition,
    [isLoadingPosition, hasZeroBalance, hasPosition],
  );

  const hasPositionButtons = useMemo(
    () => hasPosition && !hasZeroBalance,
    [hasPosition, hasZeroBalance],
  );

  const hasAddFundsButton = useMemo(
    () => hasZeroBalance && !isLoadingPosition,
    [hasZeroBalance, isLoadingPosition],
  );

  // Define navigation items for the card
  const navigationItems: NavigationItem[] = useMemo(
    () => [
      {
        label: strings('perps.market.order_book'),
        onPress: handleOrderBookPress,
        testID: 'order-book-navigation-link',
      },
      {
        label: strings('perps.tutorial.card.title'),
        onPress: () => navigateToTutorial(),
        testID: PerpsTutorialSelectorsIDs.TUTORIAL_CARD,
      },
      {
        label: strings('perps.market.go_to_activity'),
        onPress: () => navigateToActivity(),
        testID: PerpsMarketTabsSelectorsIDs.ACTIVITY_LINK,
      },
    ],
    [handleOrderBookPress, navigateToTutorial, navigateToActivity],
  );

  // Simplified styles - no complex calculations needed
  const { styles } = useStyles(createStyles, {});

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
          onFavoritePress={handleWatchlistPress}
          isFavorite={isWatchlist}
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* TradingView Chart Section */}
          <View style={[styles.section, styles.chartSection]}>
            {hasHistoricalData ? (
              <TradingViewChart
                ref={chartRef}
                candleData={candleData}
                height={350}
                visibleCandleCount={visibleCandleCount}
                tpslLines={tpslLines}
                testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`}
              />
            ) : (
              <Skeleton
                height={350}
                width="100%"
                testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-chart-skeleton`}
              />
            )}

            {/* Candle Period Selector */}
            <PerpsCandlePeriodSelector
              selectedPeriod={selectedCandlePeriod}
              onPeriodChange={handleCandlePeriodChange}
              onMorePress={handleMorePress}
              testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector`}
            />
          </View>

          {/* OI Cap Warning - Shows when market is at capacity */}
          {market?.symbol && isAtOICap && (
            <PerpsOICapWarning symbol={market.symbol} variant="banner" />
          )}

          {/* Market Hours Banner - Hidden when OI cap warning is showing */}
          {!isAtOICap && (
            <PerpsMarketHoursBanner
              marketType={market?.marketType}
              onInfoPress={handleMarketHoursInfoPress}
              testID={PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_BANNER}
            />
          )}

          {/* Position Card - Shows when user has a position */}
          {existingPosition && (
            <View style={styles.section}>
              <PerpsPositionCard
                position={existingPosition}
                orders={sortedOrders}
                currentPrice={
                  market?.price
                    ? parseFloat(market.price.replace(/[$,]/g, ''))
                    : undefined
                }
                showIcon
                onAutoClosePress={handleAutoCloseToggle}
                onFlipPress={handleFlipPress}
                onMarginPress={handleMarginPress}
                onSharePress={handleSharePress}
              />
            </View>
          )}

          {/* Orders Section - Compact view (TP/SL orders excluded) */}
          {nonTPSLOrders.length > 0 && (
            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMD}>
                {strings('perps.market.orders')} ({nonTPSLOrders.length})
              </Text>
              {nonTPSLOrders.map((order) => (
                <PerpsCompactOrderRow
                  key={order.orderId}
                  order={order}
                  onPress={() => handleOrderSelect(order.orderId)}
                  testID={`compact-order-${order.orderId}`}
                />
              ))}
            </View>
          )}

          {/* Market Statistics Section - Always visible */}
          <View style={styles.section}>
            <PerpsMarketStatisticsCard
              symbol={market?.symbol || ''}
              marketStats={marketStats}
              onTooltipPress={handleTooltipPress}
              nextFundingTime={market?.nextFundingTime}
              fundingIntervalHours={market?.fundingIntervalHours}
              dexName={market?.marketSource || undefined}
            />
          </View>

          {/* Recent Trades Section */}
          {market?.symbol && (
            <View style={styles.section}>
              <PerpsMarketTradesList symbol={market.symbol} />
            </View>
          )}

          {/* Risk Disclaimer Section */}
          <View style={styles.section}>
            <Text
              style={styles.riskDisclaimer}
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
            >
              {strings('perps.risk_disclaimer', riskDisclaimerParams)}{' '}
              <Text
                variant={TextVariant.BodyXS}
                color={TextColor.Alternative}
                onPress={handleTradingViewPress}
              >
                TradingView.
              </Text>
            </Text>
          </View>

          {/* Navigation Card Section */}
          <View style={styles.section}>
            <PerpsNavigationCard items={navigationItems} />
          </View>
        </ScrollView>
      </View>

      {/* Fixed Actions Footer */}
      {(hasAddFundsButton ||
        (hasLongShortButtons && !isAtOICap) ||
        hasPositionButtons) && (
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

          {hasLongShortButtons && !isAtOICap && (
            <View style={styles.actionsContainer}>
              <View style={styles.actionButtonWrapper}>
                {buttonColorVariant === 'monochrome' ? (
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={ButtonSize.Lg}
                    width={ButtonWidthTypes.Full}
                    label={strings('perps.market.long')}
                    onPress={handleLongPress}
                    isDisabled={isAtOICap}
                    testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
                  />
                ) : (
                  <ButtonSemantic
                    severity={ButtonSemanticSeverity.Success}
                    onPress={handleLongPress}
                    isFullWidth
                    size={ButtonSizeRNDesignSystem.Lg}
                    isDisabled={isAtOICap}
                    testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
                  >
                    {strings('perps.market.long')}
                  </ButtonSemantic>
                )}
              </View>

              <View style={styles.actionButtonWrapper}>
                {buttonColorVariant === 'monochrome' ? (
                  <Button
                    variant={ButtonVariants.Secondary}
                    size={ButtonSize.Lg}
                    width={ButtonWidthTypes.Full}
                    label={strings('perps.market.short')}
                    onPress={handleShortPress}
                    isDisabled={isAtOICap}
                    testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
                  />
                ) : (
                  <ButtonSemantic
                    severity={ButtonSemanticSeverity.Danger}
                    onPress={handleShortPress}
                    isFullWidth
                    size={ButtonSizeRNDesignSystem.Lg}
                    isDisabled={isAtOICap}
                    testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
                  >
                    {strings('perps.market.short')}
                  </ButtonSemantic>
                )}
              </View>
            </View>
          )}

          {hasPositionButtons && (
            <View style={styles.actionsContainer}>
              <View style={styles.actionButtonWrapper}>
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  label={strings('perps.market.modify')}
                  onPress={handleModifyPress}
                  testID={PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON}
                />
              </View>

              <View style={styles.actionButtonWrapper}>
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  label={
                    existingPosition && parseFloat(existingPosition.size) > 0
                      ? strings('perps.market.close_long')
                      : strings('perps.market.close_short')
                  }
                  onPress={handleClosePress}
                  testID={PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON}
                />
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
        asset={market?.symbol}
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

      {/* Market Hours Bottom Sheet */}
      {isMarketHoursModalVisible && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={() => setIsMarketHoursModalVisible(false)}
          contentKey={marketHoursContentKey}
          testID={
            PerpsMarketDetailsViewSelectorsIDs.MARKET_HOURS_BOTTOM_SHEET_TOOLTIP
          }
        />
      )}

      {/* Notification Tooltip - Shows after first successful order */}
      {isNotificationsEnabled && !!monitoringIntent && (
        <PerpsNotificationTooltip
          orderSuccess={!!monitoringIntent}
          testID={PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP}
        />
      )}

      {/* Tooltip Bottom Sheet - For market statistics info tooltips (open interest, funding rate, etc.) */}
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tooltip-${selectedTooltip}`}
        />
      )}

      {/* Modify Action Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showModifyActionSheet && (
        <PerpsSelectModifyActionView
          sheetRef={modifyActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={handleModifyActionSheetClose}
          onReversePosition={handleReversePosition}
        />
      )}

      {/* Adjust Margin Action Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showAdjustMarginActionSheet && (
        <PerpsSelectAdjustMarginActionView
          sheetRef={adjustMarginActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={handleAdjustMarginActionSheetClose}
        />
      )}

      {/* Flip Position Confirm Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showReversePositionSheet && existingPosition && (
        <PerpsFlipPositionConfirmSheet
          position={existingPosition}
          sheetRef={reversePositionSheetRef}
          onClose={handleReversePositionSheetClose}
          onConfirm={handleReversePositionConfirm}
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
