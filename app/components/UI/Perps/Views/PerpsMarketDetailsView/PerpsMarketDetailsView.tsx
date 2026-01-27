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
import { strings } from '../../../../../../locales/i18n';
import { setPerpsChartPreferredCandlePeriod } from '../../../../../actions/settings';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
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
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import ComponentErrorBoundary from '../../../ComponentErrorBoundary';
import { getPerpsMarketDetailsNavbar } from '../../../Navbar';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsCandlePeriodSelector from '../../components/PerpsCandlePeriodSelector';
import PerpsChartFullscreenModal from '../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal';
import PerpsCompactOrderRow from '../../components/PerpsCompactOrderRow';
import PerpsFlipPositionConfirmSheet from '../../components/PerpsFlipPositionConfirmSheet';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsTutorialSelectorsIDs,
} from '../../Perps.testIds';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import PerpsMarketHoursBanner from '../../components/PerpsMarketHoursBanner';
import PerpsMarketStatisticsCard from '../../components/PerpsMarketStatisticsCard';
import PerpsMarketTradesList from '../../components/PerpsMarketTradesList';
import PerpsNavigationCard, {
  type NavigationItem,
} from '../../components/PerpsNavigationCard/PerpsNavigationCard';
import PerpsNotificationTooltip from '../../components/PerpsNotificationTooltip';
import PerpsOHLCVBar from '../../components/PerpsOHLCVBar';
import PerpsOICapWarning from '../../components/PerpsOICapWarning';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsPriceDeviationWarning from '../../components/PerpsPriceDeviationWarning';
import PerpsStopLossPromptBanner from '../../components/PerpsStopLossPromptBanner';
import TradingViewChart, {
  type OhlcData,
  type TradingViewChartRef,
} from '../../components/TradingViewChart';
import {
  CandlePeriod,
  PERPS_CHART_CONFIG,
  TimeDuration,
} from '../../constants/chartConfig';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
  TPSLTrackingData,
} from '../../controllers/types';
import {
  usePerpsConnection,
  usePerpsNavigation,
  usePerpsNetworkManagement,
  usePerpsTrading,
  usePositionManagement,
} from '../../hooks';
import {
  usePerpsLiveAccount,
  usePerpsLiveOrders,
  usePerpsLivePrices,
} from '../../hooks/stream';
import { usePerpsLiveCandles } from '../../hooks/stream/usePerpsLiveCandles';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import { useIsPriceDeviatedAboveThreshold } from '../../hooks/useIsPriceDeviatedAboveThreshold';
import {
  usePerpsDataMonitor,
  type DataMonitorParams,
} from '../../hooks/usePerpsDataMonitor';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import { usePerpsLiveFills } from '../../hooks/stream/usePerpsLiveFills';
import { usePerpsTPSLUpdate } from '../../hooks/usePerpsTPSLUpdate';
import { useStopLossPrompt } from '../../hooks/useStopLossPrompt';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import {
  selectPerpsButtonColorTestVariant,
  selectPerpsOrderBookEnabledFlag,
} from '../../selectors/featureFlags';
import {
  createSelectIsWatchlistMarket,
  selectPerpsEligibility,
} from '../../selectors/perpsController';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { getMarketHoursStatus } from '../../utils/marketHours';
import { ensureError } from '../../../../../util/errorUtils';
import PerpsSelectAdjustMarginActionView from '../PerpsSelectAdjustMarginActionView';
import PerpsSelectModifyActionView from '../PerpsSelectModifyActionView';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';

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
  const { market: routeMarket, monitoringIntent, source } = route.params || {};
  const { track } = usePerpsEventTracking();

  // Get full market data from stream to ensure all fields (including maxLeverage) are available
  // This handles cases where navigation passes minimal market data (e.g., from Recent Activity)
  // Skip fetching if routeMarket already has maxLeverage (performance optimization)
  const needsEnrichment = !routeMarket?.maxLeverage;
  const { markets } = usePerpsMarkets({ skipInitialFetch: !needsEnrichment });
  const market = useMemo(() => {
    // If route market already has all required fields, use it directly
    if (!needsEnrichment) return routeMarket;

    const fullMarket = markets.find((m) => m.symbol === routeMarket?.symbol);

    return fullMarket || routeMarket;
  }, [markets, routeMarket, needsEnrichment]);
  const dispatch = useDispatch();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const [isMarketHoursModalVisible, setIsMarketHoursModalVisible] =
    useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  // Stop loss prompt banner state - for loading/success when setting stop loss via banner
  const [isSettingStopLoss, setIsSettingStopLoss] = useState(false);
  const [isStopLossSuccess, setIsStopLossSuccess] = useState(false);
  // Preserve banner variant during success fade-out (hook's variant becomes null after SL is set)
  const preservedBannerVariantRef = useRef<'stop_loss' | 'add_margin' | null>(
    null,
  );

  const isEligible = useSelector(selectPerpsEligibility);

  // Feature flag for Order Book visibility
  const isOrderBookEnabled = useSelector(selectPerpsOrderBookEnabledFlag);

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
    symbol: market?.symbol || '',
    interval: selectedCandlePeriod,
    duration: TimeDuration.YEAR_TO_DATE,
    throttleMs: 1000,
  });

  // Get current price from the last candle's close price for chart synchronization
  // This ensures the current price line matches the live candle close price exactly
  const chartCurrentPrice = useMemo(() => {
    if (!candleData?.candles?.length) return 0;
    const lastCandle = candleData.candles.at(-1);
    return lastCandle?.close ? Number.parseFloat(lastCandle.close) : 0;
  }, [candleData]);

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

  // Get order fills to derive position opened timestamp
  // Uses WebSocket fills channel which is pre-warmed and cached via PerpsStreamManager
  // This avoids REST API calls on mount that can deplete rate limits
  const { fills: orderFills } = usePerpsLiveFills();

  // Get position opened timestamp from fills data
  const positionOpenedTimestamp = useMemo(() => {
    if (!existingPosition || !orderFills) return undefined;

    // Find the most recent "Open" fill for this asset
    const openFill = orderFills
      .filter((fill) => {
        const isMatchingAsset = fill.symbol === existingPosition.symbol;
        const isOpenDirection = fill.direction?.startsWith('Open');
        return isMatchingAsset && isOpenDirection;
      })
      .sort((a, b) => b.timestamp - a.timestamp)[0]; // Most recent first

    return openFill?.timestamp;
  }, [existingPosition, orderFills]);

  // Compute TP/SL lines for the chart based on existing position
  // Use chartCurrentPrice (from candle close) to ensure price line syncs with live candle
  const tpslLines = useMemo(() => {
    const chartPriceStr =
      chartCurrentPrice > 0 ? chartCurrentPrice.toString() : undefined;

    if (existingPosition) {
      return {
        entryPrice: existingPosition.entryPrice,
        takeProfitPrice: existingPosition.takeProfitPrice,
        stopLossPrice: existingPosition.stopLossPrice,
        liquidationPrice: existingPosition.liquidationPrice || undefined,
        currentPrice: chartPriceStr,
      };
    }

    // Even without position, show current price line on chart
    return chartPriceStr ? { currentPrice: chartPriceStr } : undefined;
  }, [existingPosition, chartCurrentPrice]);

  // Stop loss prompt banner logic
  // Hook handles visibility orchestration including fade-out animation
  const {
    variant: bannerVariantFromHook,
    liquidationDistance,
    suggestedStopLossPrice,
    suggestedStopLossPercent,
    isVisible: isBannerVisible,
    onDismissComplete: handleBannerDismissComplete,
  } = useStopLossPrompt({
    position: existingPosition,
    currentPrice,
    positionOpenedTimestamp,
  });

  // Preserve banner variant when we have a valid one (for use during success fade-out)
  // The hook's variant becomes null after SL is set, but we need to keep rendering
  if (bannerVariantFromHook && !isStopLossSuccess) {
    preservedBannerVariantRef.current = bannerVariantFromHook;
  }

  // Use preserved variant during success fade-out, otherwise use hook's variant
  const bannerVariant = isStopLossSuccess
    ? preservedBannerVariantRef.current
    : bannerVariantFromHook;

  // Reset stop loss success state when market or position changes
  useEffect(() => {
    setIsStopLossSuccess(false);
    preservedBannerVariantRef.current = null;
  }, [market?.symbol, existingPosition?.symbol]);

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
      [PerpsEventProperties.OPEN_POSITION]: existingPosition ? 1 : 0,
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
        feature: PERPS_CONSTANTS.FeatureName,
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
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
      [PerpsEventProperties.FAVORITES_COUNT]: watchlistCount,
    });
  }, [market, isWatchlist, track]);

  const handleTradeAction = useCallback(
    (direction: 'long' | 'short') => {
      if (!isEligible) {
        // Track geo-block screen viewed
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PerpsEventProperties.SCREEN_TYPE]:
            PerpsEventValues.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.TRADE_ACTION,
        });
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
          [PerpsEventProperties.SCREEN_NAME]:
            PerpsEventValues.SCREEN_NAME.PERPS_MARKET_DETAILS,
          [PerpsEventProperties.SCREEN_TYPE]:
            PerpsEventValues.SCREEN_TYPE.ASSET_DETAILS,
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
    // Track deposit button click from asset screen
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
      [PerpsEventProperties.BUTTON_CLICKED]:
        PerpsEventValues.BUTTON_CLICKED.DEPOSIT,
      [PerpsEventProperties.BUTTON_LOCATION]:
        PerpsEventValues.BUTTON_LOCATION.PERPS_ASSET_SCREEN,
    });

    try {
      if (!isEligible) {
        // Track geo-block screen viewed
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PerpsEventProperties.SCREEN_TYPE]:
            PerpsEventValues.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PerpsEventProperties.SOURCE]:
            PerpsEventValues.SOURCE.ADD_FUNDS_ACTION,
        });
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
          feature: PERPS_CONSTANTS.FeatureName,
          message: 'Failed to initialize deposit',
        });
      });
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FeatureName,
        message: 'Failed to navigate to deposit',
      });
    }
  };

  const handleTradingViewPress = useCallback(() => {
    Linking.openURL('https://www.tradingview.com/').catch((error: unknown) => {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FeatureName,
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
      asset: existingPosition.symbol,
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

    // Track the interaction - use ADD_MARGIN interaction type for banner clicks
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.ADD_MARGIN,
      [PerpsEventProperties.ASSET]: existingPosition.symbol,
      [PerpsEventProperties.SOURCE]:
        PerpsEventValues.SOURCE.STOP_LOSS_PROMPT_BANNER,
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
        source: PerpsEventValues.RISK_MANAGEMENT_SOURCE.STOP_LOSS_PROMPT_BANNER,
        positionSize: Math.abs(parseFloat(existingPosition.size)),
      };

      // Set the stop loss using the suggested price (keep existing TP if any)
      const result = await handleUpdateTPSL(
        existingPosition,
        existingPosition.takeProfitPrice, // Keep existing TP
        suggestedStopLossPrice, // Use suggested SL
        trackingData,
      );

      // Only trigger success state if the update actually succeeded
      if (!result.success) {
        // Error toast is already shown by handleUpdateTPSL
        return;
      }

      // Trigger success state to start fade-out animation
      setIsStopLossSuccess(true);

      // Track the interaction - use STOP_LOSS_ONE_CLICK_PROMPT for one-click stop loss from banner
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.STOP_LOSS_ONE_CLICK_PROMPT,
        [PerpsEventProperties.ASSET]: existingPosition.symbol,
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.STOP_LOSS_PROMPT_BANNER,
        [PerpsEventProperties.STOP_LOSS_PRICE]: suggestedStopLossPrice,
      });
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FeatureName,
        message: 'Failed to set stop loss from prompt banner',
      });
    } finally {
      setIsSettingStopLoss(false);
    }
  }, [existingPosition, suggestedStopLossPrice, handleUpdateTPSL, track]);

  // Handler for when banner fade-out animation completes
  const handleBannerFadeOutComplete = useCallback(() => {
    // Reset success state for potential future displays
    setIsStopLossSuccess(false);
    // Notify hook that dismiss animation is complete
    handleBannerDismissComplete();
  }, [handleBannerDismissComplete]);

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

    // Track full screen chart interaction
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.FULL_SCREEN_CHART,
      [PerpsEventProperties.ASSET]: market?.symbol || '',
    });
  }, [market?.symbol, track]);

  const handleFullscreenChartClose = useCallback(() => {
    setIsFullscreenChartVisible(false);
  }, []);

  const handleChartError = useCallback(() => {
    // Log the error but don't block the UI
    Logger.error(new Error('Chart rendering error in market details view'), {
      feature: PERPS_CONSTANTS.FeatureName,
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
          currentPrice={chartCurrentPrice}
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
          {/* Keep mounted while isStopLossSuccess is true to allow fade animation to complete */}
          {(isBannerVisible || isStopLossSuccess) && bannerVariant && (
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
              onOrderBookPress={
                isOrderBookEnabled ? handleOrderBookPress : undefined
              }
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
                    variant={ButtonVariants.Primary}
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
                    variant={ButtonVariants.Primary}
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
