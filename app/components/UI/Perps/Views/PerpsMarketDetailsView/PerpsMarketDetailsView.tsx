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
import { useDispatch, useSelector } from 'react-redux';
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
  PerpsTutorialSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
  TPSLTrackingData,
} from '../../controllers/types';
import { usePerpsLiveCandles } from '../../hooks/stream/usePerpsLiveCandles';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import {
  CandlePeriod,
  TimeDuration,
  PERPS_CHART_CONFIG,
} from '../../constants/chartConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { TraceName } from '../../../../../util/trace';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import {
  usePerpsConnection,
  usePerpsTrading,
  usePerpsNetworkManagement,
  usePerpsNavigation,
  usePositionManagement,
} from '../../hooks';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import {
  usePerpsDataMonitor,
  type DataMonitorParams,
} from '../../hooks/usePerpsDataMonitor';
import { useIsPriceDeviatedAboveThreshold } from '../../hooks/useIsPriceDeviatedAboveThreshold';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import {
  usePerpsLiveAccount,
  usePerpsLivePrices,
  usePerpsLiveOrders,
} from '../../hooks/stream';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsMarketStatisticsCard from '../../components/PerpsMarketStatisticsCard';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsOICapWarning from '../../components/PerpsOICapWarning';
import PerpsPriceDeviationWarning from '../../components/PerpsPriceDeviationWarning';
import PerpsNotificationTooltip from '../../components/PerpsNotificationTooltip';
import PerpsNavigationCard, {
  type NavigationItem,
} from '../../components/PerpsNavigationCard/PerpsNavigationCard';
import PerpsMarketTradesList from '../../components/PerpsMarketTradesList';
import PerpsCompactOrderRow from '../../components/PerpsCompactOrderRow';
import PerpsFlipPositionConfirmSheet from '../../components/PerpsFlipPositionConfirmSheet';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
import TradingViewChart, {
  type TradingViewChartRef,
  type OhlcData,
} from '../../components/TradingViewChart';
import PerpsChartFullscreenModal from '../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal';
import PerpsCandlePeriodSelector from '../../components/PerpsCandlePeriodSelector';
import PerpsOHLCVBar from '../../components/PerpsOHLCVBar';
import ComponentErrorBoundary from '../../../ComponentErrorBoundary';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import { getPerpsMarketDetailsNavbar } from '../../../Navbar';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import {
  selectPerpsEligibility,
  createSelectIsWatchlistMarket,
} from '../../selectors/perpsController';
import PerpsMarketHoursBanner from '../../components/PerpsMarketHoursBanner';
import { getMarketHoursStatus } from '../../utils/marketHours';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import Engine from '../../../../../core/Engine';
import { setPerpsChartPreferredCandlePeriod } from '../../../../../actions/settings';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import PerpsSelectAdjustMarginActionView from '../PerpsSelectAdjustMarginActionView';
import PerpsSelectModifyActionView from '../PerpsSelectModifyActionView';
import { usePerpsTPSLUpdate } from '../../hooks/usePerpsTPSLUpdate';
import PerpsStopLossPromptBanner from '../../components/PerpsStopLossPromptBanner';
import { useStopLossPrompt } from '../../hooks/useStopLossPrompt';

interface MarketDetailsRouteParams {
  market: PerpsMarketData;
  monitoringIntent?: Partial<DataMonitorParams>;
  isNavigationFromOrderSuccess?: boolean;
  source?: string;
}

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  // Use centralized navigation hook for all Perps navigation
  const {
    navigateToHome,
    navigateToOrder,
    navigateToTutorial,
    navigateToClosePosition,
    navigateBack,
    canGoBack,
  } = usePerpsNavigation();

  // Use position management hook for bottom sheet state and handlers
  const {
    showModifyActionSheet,
    showAdjustMarginActionSheet,
    showReversePositionSheet,
    modifyActionSheetRef,
    adjustMarginActionSheetRef,
    reversePositionSheetRef,
    openModifySheet,
    openAdjustMarginSheet,
    closeModifySheet,
    closeAdjustMarginSheet,
    closeReversePositionSheet,
    handleReversePosition,
  } = usePositionManagement();

  // Hook for updating TP/SL on existing positions
  const { handleUpdateTPSL } = usePerpsTPSLUpdate();

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

  // Stop loss prompt banner state
  const [isSettingStopLoss, setIsSettingStopLoss] = useState(false);
  const [isStopLossSuccess, setIsStopLossSuccess] = useState(false);
  const [hideBannerAfterSuccess, setHideBannerAfterSuccess] = useState(false);

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
  const [visibleCandleCount, setVisibleCandleCount] = useState<number>(
    PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT,
  );
  const [isMoreCandlePeriodsVisible, setIsMoreCandlePeriodsVisible] =
    useState(false);
  const chartRef = useRef<TradingViewChartRef>(null);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreenChartVisible, setIsFullscreenChartVisible] =
    useState(false);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);

  const { account } = usePerpsLiveAccount();

  // Get real-time open orders via WebSocket
  const { orders: ordersData } = usePerpsLiveOrders({});

  // Filter orders for the current market
  const openOrders = useMemo(() => {
    if (!ordersData?.length || !market?.symbol) return [];
    return ordersData.filter((order) => order.symbol === market.symbol);
  }, [ordersData, market?.symbol]);

  // Sort orders by time
  const sortedOrders = useMemo(
    () =>
      [...openOrders].sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return timeB - timeA;
      }),
    [openOrders],
  );

  // Filter out TP/SL (reduceOnly) orders
  const nonTPSLOrders = useMemo(
    () => sortedOrders.filter((order) => !order.reduceOnly),
    [sortedOrders],
  );

  // Subscribe to live prices for current position price
  const livePrices = usePerpsLivePrices({
    symbols: market?.symbol ? [market.symbol] : [],
    throttleMs: 1000,
  });

  // Get current price for the symbol
  const currentPrice = useMemo(() => {
    if (!market?.symbol) return 0;
    const priceData = livePrices[market.symbol];
    if (priceData?.price) {
      return parseFloat(priceData.price);
    }
    return 0;
  }, [livePrices, market?.symbol]);

  // A/B Testing: Button color test (TAT-1937)
  const {
    variantName: buttonColorVariant,
    isEnabled: isButtonColorTestEnabled,
  } = usePerpsABTest({
    test: BUTTON_COLOR_TEST,
    featureFlagSelector: selectPerpsButtonColorTestVariant,
  });

  usePerpsConnection();
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();

  // Check if market is at open interest cap
  const { isAtCap: isAtOICap } = usePerpsOICap(market?.symbol);

  // Check if trading is halted due to price deviation
  const {
    isDeviatedAboveThreshold: isTradingHalted,
    isLoading: isLoadingTradingHalted,
  } = useIsPriceDeviatedAboveThreshold(market?.symbol);

  // Handle data-driven monitoring when coming from order success
  // Clear monitoringIntent after processing to allow fresh monitoring next time
  const handleDataDetected = useCallback(() => {
    navigation.setParams({ monitoringIntent: undefined });
  }, [navigation]);

  usePerpsDataMonitor({
    asset: monitoringIntent?.asset,
    monitorOrders: monitoringIntent?.monitorOrders,
    monitorPositions: monitoringIntent?.monitorPositions,
    timeoutMs: monitoringIntent?.timeoutMs,
    onDataDetected: handleDataDetected,
    enabled: !!(monitoringIntent && market && monitoringIntent.asset),
  });

  const hasZeroBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0') === 0,
    [account?.availableBalance],
  );

  // Get comprehensive market statistics
  const marketStats = usePerpsMarketStats(market?.symbol || '');

  const {
    candleData,
    isLoading: isLoadingHistory,
    hasHistoricalData,
    fetchMoreHistory,
  } = usePerpsLiveCandles({
    coin: market?.symbol || '',
    interval: selectedCandlePeriod,
    duration: TimeDuration.YEAR_TO_DATE,
    throttleMs: 1000,
  });

  // Auto-zoom to latest candle when interval changes and new data arrives
  // This ensures the chart shows the most recent data after interval change
  useEffect(() => {
    // Check if the interval has actually changed
    const hasIntervalChanged =
      previousIntervalRef.current !== selectedCandlePeriod;

    // Only zoom when:
    // 1. The interval has changed (user pressed button)
    // 2. New data exists and matches the selected period
    if (
      hasIntervalChanged &&
      candleData &&
      candleData.interval === selectedCandlePeriod
    ) {
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
      // Update the ref to track this interval change
      previousIntervalRef.current = selectedCandlePeriod;
    }
  }, [candleData, selectedCandlePeriod, visibleCandleCount]);

  // Check if user has an existing position for this market
  const { isLoading: isLoadingPosition, existingPosition } =
    useHasExistingPosition({
      asset: market?.symbol || '',
      loadOnMount: true,
    });

  // Compute TP/SL lines for the chart based on existing position
  const tpslLines = useMemo(() => {
    if (existingPosition) {
      return {
        entryPrice: existingPosition.entryPrice,
        takeProfitPrice: existingPosition.takeProfitPrice,
        stopLossPrice: existingPosition.stopLossPrice,
        liquidationPrice: existingPosition.liquidationPrice || undefined,
      };
    }

    return undefined;
  }, [existingPosition]);

  // Stop loss prompt banner logic
  const {
    shouldShowBanner,
    variant: bannerVariant,
    liquidationDistance,
    suggestedStopLossPrice,
    suggestedStopLossPercent,
  } = useStopLossPrompt({
    position: existingPosition,
    currentPrice,
  });

  // Reset stop loss banner state when market or position changes
  useEffect(() => {
    setHideBannerAfterSuccess(false);
    setIsStopLossSuccess(false);
  }, [market?.symbol, existingPosition?.coin]);

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

      // Note: Chart will auto-zoom to latest candle when new data arrives (see useEffect below)
    },
    [market, track, dispatch],
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

      // WebSocket streaming provides real-time data - no manual refresh needed
      // Just reset the UI state and the chart will update automatically
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        message: 'Failed to refresh chart state',
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.FAVORITE_TOGGLED,
      [PerpsEventProperties.ACTION_TYPE]: newWatchlistState
        ? PerpsEventValues.ACTION_TYPE.FAVORITE_MARKET
        : PerpsEventValues.ACTION_TYPE.UNFAVORITE_MARKET,
      [PerpsEventProperties.ASSET]: market.symbol,
      [PerpsEventProperties.FAVORITES_COUNT]: watchlistCount,
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
          feature: PERPS_CONSTANTS.FEATURE_NAME,
          message: 'Failed to initialize deposit',
        });
      });
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        message: 'Failed to navigate to deposit',
      });
    }
  };

  const handleTradingViewPress = useCallback(() => {
    Linking.openURL('https://www.tradingview.com/').catch((error: unknown) => {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        message: 'Failed to open Trading View URL',
      });
    });
  }, []);

  const handleMarketHoursInfoPress = useCallback(() => {
    setIsMarketHoursModalVisible(true);
  }, []);

  // Position card handlers
  const handleAutoClosePress = useCallback(() => {
    if (!existingPosition) return;

    navigation.navigate(Routes.PERPS.TPSL, {
      asset: existingPosition.coin,
      currentPrice,
      position: existingPosition,
      initialTakeProfitPrice: existingPosition.takeProfitPrice,
      initialStopLossPrice: existingPosition.stopLossPrice,
      onConfirm: async (
        takeProfitPrice?: string,
        stopLossPrice?: string,
        trackingData?: TPSLTrackingData,
      ) => {
        await handleUpdateTPSL(
          existingPosition,
          takeProfitPrice,
          stopLossPrice,
          trackingData,
        );
      },
    });
  }, [existingPosition, currentPrice, navigation, handleUpdateTPSL]);

  const handleMarginPress = useCallback(() => {
    if (!existingPosition) return;
    openAdjustMarginSheet();
  }, [existingPosition, openAdjustMarginSheet]);

  const handleSharePress = useCallback(() => {
    if (!existingPosition) return;

    navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
      position: existingPosition,
      marketPrice: currentPrice.toString(),
    });
  }, [existingPosition, currentPrice, navigation]);

  // Stats card tooltip handler
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  // Order book handler - navigates to order book view
  const handleOrderBookPress = useCallback(() => {
    if (!market?.symbol) return;

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: market.symbol,
    });

    navigation.navigate(Routes.PERPS.ORDER_BOOK, {
      symbol: market.symbol,
      marketData: market,
    });
  }, [market, navigation, track]);

  // Close position handler
  const handleClosePosition = useCallback(() => {
    if (!existingPosition) return;
    navigateToClosePosition(existingPosition);
  }, [existingPosition, navigateToClosePosition]);

  // Modify position handler - opens the modify action sheet
  const handleModifyPress = useCallback(() => {
    if (!existingPosition) return;
    openModifySheet();
  }, [existingPosition, openModifySheet]);

  // Handler for "Add Margin" from stop loss prompt banner
  const handleAddMarginFromBanner = useCallback(() => {
    if (!existingPosition) return;

    // Navigate directly to PerpsAdjustMarginView with mode='add'
    navigation.navigate(Routes.PERPS.ADJUST_MARGIN, {
      position: existingPosition,
      mode: 'add',
    });

    // Track the interaction
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: existingPosition.coin,
      [PerpsEventProperties.ACTION_TYPE]: 'add_margin_from_prompt',
    });
  }, [existingPosition, navigation, track]);

  // Handler for "Set Stop Loss" from stop loss prompt banner
  const handleSetStopLossFromBanner = useCallback(async () => {
    if (!existingPosition || !suggestedStopLossPrice) return;

    setIsSettingStopLoss(true);

    try {
      // Build tracking data
      const trackingData: TPSLTrackingData = {
        direction: parseFloat(existingPosition.size) >= 0 ? 'long' : 'short',
        source: 'stop_loss_prompt_banner',
        positionSize: Math.abs(parseFloat(existingPosition.size)),
      };

      // Set the stop loss using the suggested price (keep existing TP if any)
      await handleUpdateTPSL(
        existingPosition,
        existingPosition.takeProfitPrice, // Keep existing TP
        suggestedStopLossPrice, // Use suggested SL
        trackingData,
      );

      // Trigger success state to start fade-out animation
      setIsStopLossSuccess(true);

      // Track the interaction
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: existingPosition.coin,
        [PerpsEventProperties.ACTION_TYPE]: 'set_stop_loss_from_prompt',
        [PerpsEventProperties.STOP_LOSS_PRICE]: suggestedStopLossPrice,
      });
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        message: 'Failed to set stop loss from prompt banner',
      });
    } finally {
      setIsSettingStopLoss(false);
    }
  }, [existingPosition, suggestedStopLossPrice, handleUpdateTPSL, track]);

  // Handler for when banner fade-out animation completes
  const handleBannerFadeOutComplete = useCallback(() => {
    setHideBannerAfterSuccess(true);
    // Reset success state for potential future displays
    setIsStopLossSuccess(false);
  }, []);

  // Handler for order selection - navigates to order details
  const handleOrderSelect = useCallback(
    (order: (typeof nonTPSLOrders)[number]) => {
      navigation.navigate(Routes.PERPS.ORDER_DETAILS, {
        order,
      });
    },
    [navigation],
  );

  const handleFullscreenChartOpen = useCallback(() => {
    setIsFullscreenChartVisible(true);
  }, []);

  const handleFullscreenChartClose = useCallback(() => {
    setIsFullscreenChartVisible(false);
  }, []);

  const handleChartError = useCallback(() => {
    // Log the error but don't block the UI
    Logger.error(new Error('Chart rendering error in market details view'), {
      feature: PERPS_CONSTANTS.FEATURE_NAME,
    });
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
  const hasLongShortButtons = useMemo(
    () => !isLoadingPosition && !hasZeroBalance,
    [isLoadingPosition, hasZeroBalance],
  );

  const hasAddFundsButton = useMemo(
    () => hasZeroBalance && !isLoadingPosition,
    [hasZeroBalance, isLoadingPosition],
  );

  // Define navigation items for the card
  const navigationItems: NavigationItem[] = useMemo(
    () => [
      {
        label: strings('perps.tutorial.card.title'),
        onPress: () => navigateToTutorial(),
        testID: PerpsTutorialSelectorsIDs.TUTORIAL_CARD,
      },
    ],
    [navigateToTutorial],
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
          onFullscreenPress={handleFullscreenChartOpen}
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
            <ComponentErrorBoundary
              componentLabel="PerpsMarketDetailsChart"
              onError={handleChartError}
            >
              {/* OHLCV Bar - Shows above chart when interacting */}
              {ohlcData && (
                <PerpsOHLCVBar
                  open={ohlcData.open}
                  high={ohlcData.high}
                  low={ohlcData.low}
                  close={ohlcData.close}
                  volume={ohlcData.volume}
                  testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-ohlcv-bar`}
                />
              )}

              {hasHistoricalData ? (
                <TradingViewChart
                  ref={chartRef}
                  candleData={candleData}
                  height={PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT}
                  visibleCandleCount={visibleCandleCount}
                  tpslLines={tpslLines}
                  symbol={market?.symbol}
                  showOverlay={false}
                  coloredVolume
                  onOhlcDataChange={setOhlcData}
                  onNeedMoreHistory={fetchMoreHistory}
                  testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-tradingview-chart`}
                />
              ) : (
                <Skeleton
                  height={PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT}
                  width="100%"
                  testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-chart-skeleton`}
                />
              )}
            </ComponentErrorBoundary>

            {/* Candle Period Selector */}
            <PerpsCandlePeriodSelector
              selectedPeriod={selectedCandlePeriod}
              onPeriodChange={handleCandlePeriodChange}
              onMorePress={handleMorePress}
              testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-candle-period-selector`}
            />

            {/* Price Deviation Warning - Shows when price has deviated too much from spot price */}
            {market?.symbol && isTradingHalted && !isLoadingTradingHalted && (
              <PerpsPriceDeviationWarning
                testID={`${PerpsMarketDetailsViewSelectorsIDs.CONTAINER}-price-deviation-warning`}
              />
            )}
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

          {/* Stop Loss Prompt Banner - Shows when position needs attention */}
          {shouldShowBanner && bannerVariant && !hideBannerAfterSuccess && (
            <PerpsStopLossPromptBanner
              variant={bannerVariant}
              liquidationDistance={liquidationDistance ?? 0}
              suggestedStopLossPrice={suggestedStopLossPrice ?? undefined}
              suggestedStopLossPercent={suggestedStopLossPercent ?? undefined}
              onSetStopLoss={handleSetStopLossFromBanner}
              onAddMargin={handleAddMarginFromBanner}
              isLoading={isSettingStopLoss}
              isSuccess={isStopLossSuccess}
              onFadeOutComplete={handleBannerFadeOutComplete}
              testID={
                PerpsMarketDetailsViewSelectorsIDs.STOP_LOSS_PROMPT_BANNER
              }
            />
          )}

          {/* Position Section - Shows when user has an open position */}
          {existingPosition && (
            <View style={styles.section}>
              <PerpsPositionCard
                position={existingPosition}
                currentPrice={currentPrice}
                onAutoClosePress={handleAutoClosePress}
                onMarginPress={handleMarginPress}
                onSharePress={handleSharePress}
              />
            </View>
          )}

          {/* Orders Section - Compact view (TP/SL orders excluded) */}
          {nonTPSLOrders.length > 0 && (
            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMD} style={styles.sectionTitle}>
                {strings('perps.market.orders')}
              </Text>
              {nonTPSLOrders.map((order) => (
                <PerpsCompactOrderRow
                  key={order.orderId}
                  order={order}
                  onPress={() => handleOrderSelect(order)}
                  testID={`compact-order-${order.orderId}`}
                />
              ))}
            </View>
          )}

          {/* Statistics Section - Always shown */}
          <View style={styles.section}>
            <PerpsMarketStatisticsCard
              symbol={market?.symbol || ''}
              marketStats={marketStats}
              onTooltipPress={handleTooltipPress}
              nextFundingTime={market?.nextFundingTime}
              fundingIntervalHours={market?.fundingIntervalHours}
              dexName={market?.marketSource || undefined}
              onOrderBookPress={handleOrderBookPress}
            />
          </View>

          {/* Recent Trades Section */}
          {market?.symbol && (
            <View style={styles.section}>
              <PerpsMarketTradesList symbol={market.symbol} />
            </View>
          )}

          {/* Navigation Card Section */}
          <View style={styles.section}>
            <PerpsNavigationCard items={navigationItems} />
          </View>

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
        </ScrollView>
      </View>

      {/* Fixed Actions Footer */}
      {(hasAddFundsButton || hasLongShortButtons) && !isTradingHalted && (
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

          {/* Show Modify/Close buttons when position exists */}
          {hasLongShortButtons && existingPosition && (
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
                  variant={ButtonVariants.Primary}
                  size={ButtonSize.Lg}
                  width={ButtonWidthTypes.Full}
                  label={
                    parseFloat(existingPosition.size) >= 0
                      ? strings('perps.market.close_long')
                      : strings('perps.market.close_short')
                  }
                  onPress={handleClosePosition}
                  testID={PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON}
                />
              </View>
            </View>
          )}

          {/* Show Long/Short buttons when no position exists */}
          {hasLongShortButtons && !existingPosition && !isAtOICap && (
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

      {/* Statistics Tooltip Bottom Sheet */}
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
        />
      )}

      {/* Notification Tooltip - Shows after first successful order */}
      {isNotificationsEnabled && !!monitoringIntent && (
        <PerpsNotificationTooltip
          orderSuccess={!!monitoringIntent}
          testID={PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP}
        />
      )}

      {/* Fullscreen Chart Modal */}
      <PerpsChartFullscreenModal
        isVisible={isFullscreenChartVisible}
        candleData={candleData}
        tpslLines={tpslLines}
        selectedInterval={selectedCandlePeriod}
        visibleCandleCount={visibleCandleCount}
        onClose={handleFullscreenChartClose}
        onIntervalChange={handleCandlePeriodChange}
      />

      {/* Modify Action Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showModifyActionSheet && (
        <PerpsSelectModifyActionView
          sheetRef={modifyActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={closeModifySheet}
          onReversePosition={handleReversePosition}
        />
      )}

      {/* Adjust Margin Action Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showAdjustMarginActionSheet && (
        <PerpsSelectAdjustMarginActionView
          sheetRef={adjustMarginActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={closeAdjustMarginSheet}
        />
      )}

      {/* Flip Position Confirm Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showReversePositionSheet && existingPosition && (
        <PerpsFlipPositionConfirmSheet
          position={existingPosition}
          sheetRef={reversePositionSheetRef}
          onClose={closeReversePositionSheet}
          onConfirm={closeReversePositionSheet}
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
