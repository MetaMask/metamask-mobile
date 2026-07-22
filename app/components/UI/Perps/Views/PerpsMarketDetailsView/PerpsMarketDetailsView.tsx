import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button as DSButton,
  ButtonIcon,
  ButtonIconSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonVariant,
  ButtonSize as ButtonSizeRNDesignSystem,
  IconName,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
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
import {
  CandlePeriod,
  PerpsMode,
  TimeDuration,
  PERPS_CONSTANTS,
  type Position,
  type PerpsMarketData,
  type TPSLTrackingData,
} from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { setPerpsChartPreferredCandlePeriod } from '../../../../../actions/settings';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import { trace, TraceName, TraceOperation } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import ComponentErrorBoundary from '../../../ComponentErrorBoundary';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsCandlePeriodSelector from '../../components/PerpsCandlePeriodSelector';
import PerpsChartFullscreenModal from '../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal';
import PerpsCompactOrderRow from '../../components/PerpsCompactOrderRow';
import PerpsFlipPositionConfirmSheet from '../../components/PerpsFlipPositionConfirmSheet';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsOrderViewSelectorsIDs,
  PerpsTutorialSelectorsIDs,
  PerpsCompactOrderRowSelectorsIDs,
} from '../../Perps.testIds';
import LivePriceHeader from '../../components/LivePriceDisplay/LivePriceHeader';
import PerpsMarketInlineHeader from '../../components/PerpsMarketInlineHeader';
import PerpsModeToggle from '../../components/PerpsModeToggle';
import { showPerpsModeFlash } from '../../utils/perpsModeFlash';
import PerpsMarketHoursBanner from '../../components/PerpsMarketHoursBanner';
import PerpsMarketStatisticsCard from '../../components/PerpsMarketStatisticsCard';
import PerpsMarketTradesList from '../../components/PerpsMarketTradesList';
import PerpsMoreSection, {
  type PerpsMoreItem,
} from '../../components/PerpsMoreSection';
import PerpsNotificationTooltip from '../../components/PerpsNotificationTooltip';
import PerpsOHLCVBar from '../../components/PerpsOHLCVBar';
import PerpsOICapWarning from '../../components/PerpsOICapWarning';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import PerpsPriceDeviationWarning from '../../components/PerpsPriceDeviationWarning';
import PerpsRelatedMarkets from '../../components/PerpsRelatedMarkets';
import PerpsHomeSection from '../../components/PerpsHomeSection/PerpsHomeSection';
import PerpsHomeSectionList from '../../components/PerpsHomeSectionList';
import PerpsServiceInterruptionBanner from '../../components/PerpsServiceInterruptionBanner';
import PerpsStopLossPromptBanner from '../../components/PerpsStopLossPromptBanner';
import TradingViewChart, {
  type OhlcData,
  type TradingViewChartRef,
} from '../../components/TradingViewChart';
import PerpsAdvancedChart from '../../components/PerpsAdvancedChart/PerpsAdvancedChart';
import {
  selectPerpsAdvancedChartEnabledFlag,
  selectPerpsOrderBookEnabledFlag,
  selectPerpsProModeEnabledFlag,
  selectPerpsRelatedMarketsEnabledFlag,
  selectPerpsServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';
import { PERPS_MIN_BALANCE_THRESHOLD } from '../../constants/perpsConfig';
import {
  usePerpsConnection,
  usePerpsNavigation,
  usePositionManagement,
  usePerpsTrading,
  usePerpsMarketData,
  usePerpsMode,
} from '../../hooks';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from '../../hooks/useDefaultPayWithTokenWhenNoPerpsBalance';
import {
  usePerpsLiveAccount,
  usePerpsLiveOrders,
  usePerpsLivePrices,
  usePerpsLiveFocusedPrice,
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
import { buildPerpsCufStartTags } from '../../utils/perpsCufTrace';
import { PERPS_CUF_TAG, PERPS_CUF_VARIANT } from '../../constants/perpsCufTags';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import { usePerpsTPSLUpdate } from '../../hooks/usePerpsTPSLUpdate';
import { useStopLossPrompt } from '../../hooks/useStopLossPrompt';
import usePerpsToasts from '../../hooks/usePerpsToasts';
import { WATCHLIST_LIMIT } from '../../utils/marketUtils';
import {
  getRelatedMarketsForMarket,
  hasRelatedMarketsCategory,
} from '../../utils/relatedMarkets';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import {
  MarketInsightsEntryCard,
  MarketInsightsEntryCardSkeleton,
  MarketInsightsDisclaimerBottomSheet,
  useMarketInsights,
} from '../../../MarketInsights';
import { MarketInsightsSelectorsIDs } from '../../../MarketInsights/MarketInsights.testIds';
import { selectMarketInsightsPerpsEnabled } from '../../../../../selectors/featureFlagController/marketInsights';
import {
  createSelectIsWatchlistMarket,
  selectPerpsEligibility,
} from '../../selectors/perpsController';
import { useComplianceGate } from '../../../Compliance';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  BUTTON_COLOR_VARIANTS,
  PERPS_BUTTON_COLOR_AB_TEST_KEY,
} from '../../abTestConfig';
import { getMarketHoursStatus } from '../../utils/marketHours';
import { toPerpsEntryAttribution } from '../../utils/perpsAnalyticsAttribution';
import { normalizeMarketDetailsOrders } from '../../normalization/normalizeMarketDetailsOrders';
import { ensureError } from '../../../../../util/errorUtils';
import {
  type TransactionActiveAbTestEntry,
  withPendingTransactionActiveAbTests,
} from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import PerpsSelectAdjustMarginActionView from '../PerpsSelectAdjustMarginActionView';
import PerpsSelectModifyActionView from '../PerpsSelectModifyActionView';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';

interface MarketDetailsRouteParams {
  market: PerpsMarketData;
  monitoringIntent?: Partial<DataMonitorParams>;
  isNavigationFromOrderSuccess?: boolean;
  source?: string;
  source_section?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const getChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

const getChartAnalyticsPropertiesForLibrary = (chartLibrary: string) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  // Use centralized navigation hook for all Perps navigation
  const {
    navigateToHome,
    navigateToMarketList,
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
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: MarketDetailsRouteParams }, 'params'>>();
  const {
    market: routeMarket,
    monitoringIntent,
    source,
    source_section,
    transactionActiveAbTests,
  } = route.params || {};
  const { track } = usePerpsEventTracking();
  const isRelatedMarketsEnabled = useSelector(
    selectPerpsRelatedMarketsEnabledFlag,
  );
  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Get full market data from stream to ensure all fields (including maxLeverage) are available
  // This handles cases where navigation passes minimal market data (e.g., from Recent Activity)
  // Skip fetching if routeMarket already has a formatted maxLeverage.
  const hasFormattedMaxLeverage =
    typeof routeMarket?.maxLeverage === 'string' &&
    routeMarket.maxLeverage.endsWith('x');
  const needsEnrichment = !hasFormattedMaxLeverage;
  const needsMarketsForRelated =
    isRelatedMarketsEnabled && hasRelatedMarketsCategory(routeMarket);
  const { markets } = usePerpsMarkets({
    skipInitialFetch: !needsEnrichment && !needsMarketsForRelated,
  });
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
  const [isInsightsDisclaimerVisible, setIsInsightsDisclaimerVisible] =
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
  // Track current market symbol for staleness checks in async callbacks
  // Using a ref allows reading the CURRENT value at execution time, not closure-captured value
  const currentMarketSymbolRef = useRef<string | undefined>(market?.symbol);
  // Track current position for callbacks that are stored (e.g., route params) and called later
  // This prevents stale closure issues where the captured position is outdated
  // Initialized to null, will be updated via useEffect when existingPosition is available
  const currentPositionRef = useRef<Position | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const isEligible = useSelector(selectPerpsEligibility);

  // Compliance gate
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  // Feature flags
  const isOrderBookEnabled = useSelector(selectPerpsOrderBookEnabledFlag);
  const isAdvancedChartEnabled = useSelector(
    selectPerpsAdvancedChartEnabledFlag,
  );
  const configuredChartLibrary = useMemo(
    () => getChartLibrary(isAdvancedChartEnabled),
    [isAdvancedChartEnabled],
  );
  const [effectiveChartLibrary, setEffectiveChartLibrary] = useState(
    configuredChartLibrary,
  );
  useEffect(() => {
    setEffectiveChartLibrary(configuredChartLibrary);
  }, [configuredChartLibrary, market?.symbol]);
  const chartLibrary = isAdvancedChartEnabled
    ? effectiveChartLibrary
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;
  const chartAnalyticsProperties = useMemo(
    () => getChartAnalyticsPropertiesForLibrary(chartLibrary),
    [chartLibrary],
  );
  const isServiceInterruptionBannerEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );

  // Feature flag for Market Insights in Perps
  const isPerpsInsightsEnabled = useSelector(selectMarketInsightsPerpsEnabled);
  const {
    report: perpsInsightsReport,
    reportAssetId: perpsInsightsAssetId,
    timeAgo: perpsInsightsTimeAgo,
    isLoading: isPerpsInsightsLoading,
  } = useMarketInsights(market?.symbol, isPerpsInsightsEnabled);

  // Check if current market is in watchlist
  const selectIsWatchlist = useMemo(
    () => createSelectIsWatchlistMarket(market?.symbol || ''),
    [market?.symbol],
  );
  // Source of truth for the favorite icon. The controller applies its own
  // synchronous optimistic update (so the icon flips on the same tick the toggle
  // fires) and reverts internally on remote-write failure, so no separate
  // component-level optimistic copy is needed — a second copy could disagree with
  // Redux if the controller's optimistic-then-revert collapsed before a reconcile.
  const isWatchlist = useSelector(selectIsWatchlist);

  // Pro-mode active-mode pill in the header (TAT-3551, AC #6.3). Pressing it
  // flips the shared mode and flashes the switch on top of the current market
  // screen — no navigation either direction.
  const isPerpsProModeEnabled = useSelector(selectPerpsProModeEnabledFlag);
  const { mode: perpsMode, setMode: setPerpsMode } = usePerpsMode();
  const handlePerpsModeChange = useCallback(
    (nextMode: PerpsMode) => {
      setPerpsMode(nextMode);
      showPerpsModeFlash(nextMode);
    },
    [setPerpsMode],
  );

  // Keep current market symbol ref in sync for staleness checks in async callbacks
  useEffect(() => {
    currentMarketSymbolRef.current = market?.symbol;
  }, [market?.symbol]);

  // Auto-scroll to top when navigating to a different market (e.g. related markets)
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [market?.symbol]);

  // Record the view for the Recently Viewed rail — fires for every entry
  // path into this screen (market list, watchlist, related markets,
  // homepage, deep links, trade-again), not just market-list taps.
  // useFocusEffect (rather than a mount-keyed useEffect) is required because
  // navigation.navigate() can reveal an already-mounted MARKET_DETAILS
  // instance (e.g. from the homepage) instead of remounting it, which would
  // otherwise skip the view recording entirely.
  useFocusEffect(
    useCallback(() => {
      if (market?.symbol) {
        Engine.context.PerpsController.recordMarketViewed(market.symbol);
      }
    }, [market?.symbol]),
  );

  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

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
  const [advancedChartResetKey, setAdvancedChartResetKey] = useState(0);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreenChartVisible, setIsFullscreenChartVisible] =
    useState(false);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);

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

  // Subscribe to live prices for current position price (allMids baseline, ~2 s)
  const livePrices = usePerpsLivePrices({
    symbols: market?.symbol ? [market.symbol] : [],
    throttleMs: 1000,
  });

  // Fast focused price via activeAssetCtx projection (~0.5 s, TAT-3334).
  // Prefer focused price on this detail screen; fall back to the allMids
  // baseline so the display is never blank on first render.
  const focusedPrice = usePerpsLiveFocusedPrice({
    symbol: market?.symbol ?? '',
    enabled: Boolean(market?.symbol),
  });

  // Get current price for the symbol
  // Use mark price (oracle price) for stop loss calculations to reduce manipulation risk
  // Falls back to mid price if mark price unavailable
  const currentPrice = useMemo(() => {
    if (!market?.symbol) return 0;
    // Prefer the fast focused price; fall back to allMids baseline
    const priceData = focusedPrice ?? livePrices[market.symbol];
    if (priceData?.markPrice) {
      return parseFloat(priceData.markPrice);
    }
    if (priceData?.price) {
      return parseFloat(priceData.price);
    }
    return 0;
  }, [focusedPrice, livePrices, market?.symbol]);

  // A/B Testing: Button color test (TAT-1937)
  const {
    variantName: buttonColorVariant,
    isActive: isButtonColorTestEnabled,
  } = useABTest(PERPS_BUTTON_COLOR_AB_TEST_KEY, BUTTON_COLOR_VARIANTS, {
    experimentName: 'Long/Short Button Color Test',
    variationNames: { control: 'White/White', colors: 'Green/Red' },
  });

  usePerpsConnection();

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
    duration: TimeDuration.YearToDate,
    throttleMs: 1000,
  });

  // Get current price from the last candle's close price for chart synchronization
  // This ensures the current price line matches the live candle close price exactly
  const chartCurrentPrice = useMemo(() => {
    if (!candleData?.candles?.length) return 0;
    const lastCandle = candleData.candles.at(-1);
    return lastCandle?.close ? Number.parseFloat(lastCandle.close) : 0;
  }, [candleData]);
  const [advancedChartCurrentPrice, setAdvancedChartCurrentPrice] = useState<
    number | undefined
  >(undefined);
  const syncedChartCurrentPrice =
    isAdvancedChartEnabled && advancedChartCurrentPrice !== undefined
      ? advancedChartCurrentPrice
      : chartCurrentPrice;

  useEffect(() => {
    setAdvancedChartCurrentPrice(undefined);
  }, [isAdvancedChartEnabled, market?.symbol, selectedCandlePeriod]);

  // Auto-zoom to latest candle when interval changes and new data arrives
  // This ensures the chart shows the most recent data after interval change
  useEffect(() => {
    // Check if the interval has actually changed
    const hasIntervalChanged =
      previousIntervalRef.current !== selectedCandlePeriod;

    // Only zoom when:
    // 1. The interval has changed (user pressed button)
    // 2. New data exists and matches the selected period
    if (hasIntervalChanged && candleData?.interval === selectedCandlePeriod) {
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
      // Update the ref to track this interval change
      previousIntervalRef.current = selectedCandlePeriod;
    }
  }, [candleData, selectedCandlePeriod, visibleCandleCount]);

  // Check if user has an existing position for this market
  const {
    isLoading: isLoadingPosition,
    existingPosition,
    positionOpenedTimestamp,
  } = useHasExistingPosition({
    asset: market?.symbol || '',
    loadOnMount: true,
  });

  const { account, isInitialLoading: isLoadingAccount } = usePerpsLiveAccount();
  const defaultPayTokenWhenNoPerpsBalance =
    useDefaultPayWithTokenWhenNoPerpsBalance();
  const { depositWithConfirmation } = usePerpsTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const spendableBalance = Number.parseFloat(
    account?.spendableBalance?.toString() ?? '0',
  );
  const hasDirectOrderFundingPath =
    !isLoadingAccount &&
    (spendableBalance >= PERPS_MIN_BALANCE_THRESHOLD ||
      defaultPayTokenWhenNoPerpsBalance !== null);

  const handleAddFunds = useCallback(async () => {
    if (!isEligible) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.ADD_FUNDS_ACTION,
      });
      setIsEligibilityModalVisible(true);
      return;
    }
    try {
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });
      await withPendingTransactionActiveAbTests(transactionActiveAbTests, () =>
        depositWithConfirmation(),
      );
    } catch (err) {
      Logger.error(ensureError(err, 'PerpsMarketDetailsView.handleAddFunds'), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
      });
    }
  }, [
    isEligible,
    track,
    navigateToConfirmation,
    depositWithConfirmation,
    transactionActiveAbTests,
  ]);

  // Keep current position ref in sync for callbacks stored in route params
  // This must be after useHasExistingPosition since it depends on existingPosition
  useEffect(() => {
    currentPositionRef.current = existingPosition;
  }, [existingPosition]);

  // Show non-reduce-only orders and standalone TP/SL orders in Orders section.
  // Full-position TP/SL remains in the Auto-close section.
  const displayOrders = useMemo(
    () =>
      normalizeMarketDetailsOrders({
        orders: sortedOrders,
        existingPosition: existingPosition ?? undefined,
      }),
    [sortedOrders, existingPosition],
  );

  // Compute TP/SL lines for the chart based on existing position
  // Use the active chart candle close so the header and current price line stay in sync.
  const tpslLines = useMemo(() => {
    const chartPriceStr =
      syncedChartCurrentPrice > 0
        ? syncedChartCurrentPrice.toString()
        : undefined;

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
  }, [existingPosition, syncedChartCurrentPrice]);

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
  // Use useEffect to avoid ref mutation during render (React best practice)
  useEffect(() => {
    if (bannerVariantFromHook && !isStopLossSuccess) {
      preservedBannerVariantRef.current = bannerVariantFromHook;
    }
  }, [bannerVariantFromHook, isStopLossSuccess]);

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

  // Market detail CUF: open -> stats + live price. Chart and top-of-book keep
  // their own spans. Tags captured at mount for per-context p75.
  const marketDetailCufTags = useMemo(() => buildPerpsCufStartTags(), []);
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketDetailLive,
    // endConditions (not the simple `conditions` API), which would auto-reset
    // while the first condition is false and restart the span on every render
    // during hydration — under-reporting open-to-live-detail latency.
    endConditions: [
      !!market,
      !!marketStats,
      !isLoadingHistory,
      !isLoadingPosition,
      !!currentPrice,
      // The funded/unfunded endData tag reads account.totalBalance, so the span
      // must not end until the account stream has loaded — otherwise a funded
      // user is misrecorded as unfunded while account is still loading.
      !isLoadingAccount,
    ],
    tags: marketDetailCufTags,
    endData: {
      [PERPS_CUF_TAG.VARIANT]:
        !!account?.totalBalance && parseFloat(account.totalBalance) > 0
          ? PERPS_CUF_VARIANT.FUNDED
          : PERPS_CUF_VARIANT.UNFUNDED,
    },
  });

  const marketDetailsScreenViewedProperties = useMemo(
    () => ({
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
      [PERPS_EVENT_PROPERTY.SOURCE]:
        source || PERPS_EVENT_VALUE.SOURCE.PERP_MARKETS,
      ...chartAnalyticsProperties,
      ...(source_section && {
        [PERPS_EVENT_PROPERTY.SOURCE_SECTION]: source_section,
      }),
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: existingPosition ? 1 : 0,
      [PERPS_EVENT_PROPERTY.OPEN_ORDER]: openOrders.length,
      [PERPS_EVENT_PROPERTY.WATCHLISTED]: isWatchlist,
      market_insights_displayed:
        isPerpsInsightsEnabled && Boolean(perpsInsightsReport),
      [PERPS_EVENT_PROPERTY.OUTAGE_BANNER_SHOWN]:
        isServiceInterruptionBannerEnabled,
      // A/B Test context (TAT-1937) - for baseline exposure tracking
      ...(isButtonColorTestEnabled && {
        [PERPS_EVENT_PROPERTY.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
      }),
    }),
    [
      market?.symbol,
      source,
      chartAnalyticsProperties,
      source_section,
      existingPosition,
      openOrders.length,
      isWatchlist,
      isPerpsInsightsEnabled,
      perpsInsightsReport,
      isServiceInterruptionBannerEnabled,
      isButtonColorTestEnabled,
      buttonColorVariant,
    ],
  );

  const marketDetailsScreenViewResetKey = `${
    market?.symbol || ''
  }:${chartLibrary}`;
  const isMarketDetailsScreenViewReady =
    !!market &&
    !!marketStats &&
    !isLoadingHistory &&
    !isLoadingPosition &&
    !isPerpsInsightsLoading &&
    // Guard against stale insights from a prior symbol (the loading flag
    // may not flip to true until the next render after a symbol change).
    // Uses reportAssetId (the input identifier) instead of report.asset
    // to avoid casing mismatches between the API response and market symbol.
    (!isPerpsInsightsEnabled ||
      !perpsInsightsReport ||
      perpsInsightsAssetId === market?.symbol);

  // Track asset screen viewed event - declarative (main's event name).
  // Waits for market insights to finish loading so market_insights_displayed
  // reflects the actual display state rather than a loading-time snapshot.
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: marketDetailsScreenViewResetKey,
    conditions: [isMarketDetailsScreenViewReady],
    properties: marketDetailsScreenViewedProperties,
  });

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      // Persist the preference to Redux store
      dispatch(setPerpsChartPreferredCandlePeriod(newPeriod));

      // Track chart interaction
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
        ...chartAnalyticsProperties,
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
        [PERPS_EVENT_PROPERTY.CANDLE_PERIOD]: newPeriod,
      });

      // Note: Chart will auto-zoom to latest candle when new data arrives (see useEffect below)
    },
    [chartAnalyticsProperties, market, track, dispatch],
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
      if (isAdvancedChartEnabled) {
        setEffectiveChartLibrary(configuredChartLibrary);
        setAdvancedChartResetKey((key) => key + 1);
      } else {
        chartRef.current?.resetToDefault();
      }

      // WebSocket streaming provides real-time data - no manual refresh needed
      // Just reset the UI state and the chart will update automatically
    } catch (error) {
      Logger.error(ensureError(error, 'PerpsMarketDetailsView.handleRefresh'), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
        context: { name: 'PerpsMarketDetailsView.handleRefresh', data: {} },
      });
    } finally {
      setRefreshing(false);
    }
  }, [configuredChartLibrary, isAdvancedChartEnabled]);

  // Check if notifications feature is enabled once
  const isNotificationsEnabled = isNotificationsFeatureEnabled();

  const handleBackPress = () => {
    if (canGoBack) {
      navigateBack();
    } else {
      // Fallback to markets list if no previous screen
      navigateToHome(PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN);
    }
  };

  const { marketData } = usePerpsMarketData({
    asset: market?.symbol || '',
  });

  const handleWatchlistPress = useCallback(() => {
    if (!market?.symbol) return;

    const controller = Engine.context.PerpsController;
    const isAdding = !isWatchlist;

    // Guard: block adding when the watchlist is already full
    if (
      isAdding &&
      controller.getWatchlistMarkets().length >= WATCHLIST_LIMIT
    ) {
      showToast(PerpsToastOptions.watchlist.limitReached);
      return;
    }

    // Controller applies its own synchronous optimistic update (instant UI
    // feedback via Redux) and reverts internally on remote-write failure;
    // fire-and-forget here.
    controller.toggleWatchlistMarket(market.symbol);

    // Track watchlist toggle event
    const watchlistCount = controller.getWatchlistMarkets().length;

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
      [PERPS_EVENT_PROPERTY.ACTION_TYPE]: isAdding
        ? PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET
        : PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
      [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
      [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistCount,
    });
  }, [market, isWatchlist, track, showToast, PerpsToastOptions]);

  const handleMarketListPress = useCallback(() => {
    if (!market) return;

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.MARKET_LIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
    });

    navigateToMarketList({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    });
  }, [market, track, navigateToMarketList]);

  const handleTradeAction = useCallback(
    (direction: 'long' | 'short') =>
      gate(async () => {
        if (!isEligible) {
          // Track geo-block screen viewed
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION,
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
            [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
              PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
              'Cross margin position detected',
            [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
              PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
          });

          return;
        }

        // Track AB test on button press (TAT-1937)
        if (isButtonColorTestEnabled) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
            [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
            [PERPS_EVENT_PROPERTY.DIRECTION]:
              direction === 'long'
                ? PERPS_EVENT_VALUE.DIRECTION.LONG
                : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          });
        }

        navigateToOrder({
          direction,
          asset: market.symbol,
          source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
          ...(source_section ? { source_section } : {}),
          chartLibrary,
          defaultSzDecimals: marketData?.szDecimals,
          defaultMaxLeverage: marketData?.maxLeverage,
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        });
      }),
    [
      gate,
      isEligible,
      existingPosition,
      navigation,
      track,
      navigateToOrder,
      source_section,
      transactionActiveAbTests,
      market?.symbol,
      marketData,
      isButtonColorTestEnabled,
      chartLibrary,
    ],
  );

  const handleLongPress = () => {
    handleTradeAction('long');
  };

  const handleShortPress = () => {
    handleTradeAction('short');
  };

  const handleTradingViewPress = useCallback(() => {
    Linking.openURL('https://www.tradingview.com/').catch((error: unknown) => {
      Logger.error(
        ensureError(error, 'PerpsMarketDetailsView.handleTradingViewPress'),
        {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: {
            name: 'PerpsMarketDetailsView.handleTradingViewPress',
            data: {},
          },
        },
      );
    });
  }, []);

  const handleMarketHoursInfoPress = useCallback(() => {
    setIsMarketHoursModalVisible(true);
  }, []);

  // Position card handlers
  const handleAutoClosePress = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check for auto-close (TP/SL) action
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.AUTO_CLOSE_ACTION,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      navigation.navigate(Routes.PERPS.TPSL, {
        asset: existingPosition.symbol,
        currentPrice,
        position: existingPosition,
        initialTakeProfitPrice: existingPosition.takeProfitPrice,
        initialStopLossPrice: existingPosition.stopLossPrice,
        onConfirm: async (
          positionFromRoute?: Position,
          takeProfitPrice?: string,
          stopLossPrice?: string,
          trackingData?: TPSLTrackingData,
        ) => {
          // Prefer position passed from TPSL view (from route params); fallback to ref to avoid "No position found" when ref is stale
          const positionToUse = positionFromRoute ?? currentPositionRef.current;
          if (!positionToUse) {
            return { success: false };
          }
          const result = await handleUpdateTPSL(
            positionToUse,
            takeProfitPrice,
            stopLossPrice,
            trackingData,
          );
          return result;
        },
      });
    });
  }, [
    gate,
    existingPosition,
    currentPrice,
    navigation,
    handleUpdateTPSL,
    isEligible,
    track,
  ]);

  const handleMarginPress = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check for add/remove margin action
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ADJUST_MARGIN_ACTION,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      openAdjustMarginSheet();
    });
  }, [gate, existingPosition, openAdjustMarginSheet, isEligible, track]);

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
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
      [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
    });

    navigation.navigate(Routes.PERPS.ORDER_BOOK, {
      symbol: market.symbol,
      marketData: market,
    });
  }, [market, navigation, track]);

  // Close position handler
  const handleClosePosition = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check for close position action
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.CLOSE_POSITION_ACTION,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      navigateToClosePosition(
        existingPosition,
        PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
        {
          buttonClicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.CLOSE,
          buttonLocation: PERPS_EVENT_VALUE.BUTTON_LOCATION.ASSET_DETAILS,
        },
      );
    });
  }, [gate, existingPosition, navigateToClosePosition, isEligible, track]);

  // Modify position handler - opens the modify action sheet
  const handleModifyPress = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check for modify position action
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.MODIFY_POSITION_ACTION,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      openModifySheet();
    });
  }, [gate, existingPosition, openModifySheet, isEligible, track]);

  // Handler for "Add Margin" from stop loss prompt banner
  const handleAddMarginFromBanner = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check for add margin from banner
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.STOP_LOSS_PROMPT_ADD_MARGIN,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      // Navigate directly to PerpsAdjustMarginView with mode='add'
      navigation.navigate(Routes.PERPS.ADJUST_MARGIN, {
        position: existingPosition,
        mode: 'add',
      });

      // Track the interaction - use ADD_MARGIN interaction type for banner clicks
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.ADD_MARGIN,
        [PERPS_EVENT_PROPERTY.ASSET]: existingPosition.symbol,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.STOP_LOSS_PROMPT_BANNER,
      });
    });
  }, [gate, existingPosition, navigation, track, isEligible]);

  // Handler for "Set Stop Loss" from stop loss prompt banner
  const handleSetStopLossFromBanner = useCallback(() => {
    if (!existingPosition || !suggestedStopLossPrice) return;

    return gate(async () => {
      // Geo-restriction check for set stop loss from banner
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.STOP_LOSS_PROMPT_SET_SL,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      // Capture symbol before async to detect market changes during API call
      const originalSymbol = existingPosition.symbol;

      setIsSettingStopLoss(true);

      try {
        // Build tracking data
        const riskSource =
          PERPS_EVENT_VALUE.RISK_MANAGEMENT_SOURCE.STOP_LOSS_PROMPT_BANNER;
        const trackingData: TPSLTrackingData = {
          direction: parseFloat(existingPosition.size) >= 0 ? 'long' : 'short',
          source: riskSource,
          ...toPerpsEntryAttribution({ source: riskSource }),
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

        // Staleness check: user may have navigated to a different market during API call
        // Use ref to get CURRENT market symbol, not the closure-captured value
        if (originalSymbol !== currentMarketSymbolRef.current) {
          return;
        }

        // Trigger success state to start fade-out animation
        setIsStopLossSuccess(true);

        // Track the interaction - use STOP_LOSS_ONE_CLICK_PROMPT for one-click stop loss from banner
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.STOP_LOSS_ONE_CLICK_PROMPT,
          [PERPS_EVENT_PROPERTY.ASSET]: existingPosition.symbol,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.STOP_LOSS_PROMPT_BANNER,
          [PERPS_EVENT_PROPERTY.STOP_LOSS_PRICE]: suggestedStopLossPrice,
        });
      } catch (error) {
        Logger.error(
          ensureError(
            error,
            'PerpsMarketDetailsView.handleSetStopLossFromBanner',
          ),
          {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
              name: 'PerpsMarketDetailsView.handleSetStopLossFromBanner',
              data: {},
            },
          },
        );
      } finally {
        setIsSettingStopLoss(false);
      }
    });
  }, [
    gate,
    existingPosition,
    suggestedStopLossPrice,
    handleUpdateTPSL,
    track,
    isEligible,
  ]);

  // Handler for when banner fade-out animation completes
  const handleBannerFadeOutComplete = useCallback(() => {
    // Reset success state for potential future displays
    setIsStopLossSuccess(false);
    // Notify hook that dismiss animation is complete
    handleBannerDismissComplete();
  }, [handleBannerDismissComplete]);

  // Handler for market insights card tap - navigates to full market insights view
  const handleMarketInsightsPress = useCallback(() => {
    if (!market?.symbol) return;
    track(MetaMetricsEvents.MARKET_INSIGHTS_OPENED, {
      perps_market: market.symbol,
      source: 'perps',
      ...(perpsInsightsReport && {
        asset_symbol: perpsInsightsReport.asset,
        digest_id: perpsInsightsReport.digestId,
      }),
    });
    trace({
      name: TraceName.MarketInsightsViewLoad,
      op: TraceOperation.MarketInsightsLoad,
    });
    navigation.navigate(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: market.symbol,
      assetIdentifier: market.symbol,
      isPerps: true,
      hasPerpsPosition: !!existingPosition,
      isAtOICap,
      source: 'perps',
    });
  }, [
    market?.symbol,
    navigation,
    track,
    perpsInsightsReport,
    existingPosition,
    isAtOICap,
  ]);

  // Handler for order selection - navigates to order details
  const handleOrderSelect = useCallback(
    (order: (typeof displayOrders)[number]) => {
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
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FULL_SCREEN_CHART,
      [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
      ...chartAnalyticsProperties,
    });
  }, [chartAnalyticsProperties, market?.symbol, track]);

  const handleFullscreenChartClose = useCallback(() => {
    setIsFullscreenChartVisible(false);
  }, []);

  const handleChartError = useCallback(
    (error?: Error | string) => {
      const errorMessage =
        typeof error === 'string'
          ? error
          : (error?.message ?? 'Chart rendering error in market details view');
      // Log the error but don't block the UI
      Logger.error(new Error(errorMessage), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
      });
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
        [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
        ...chartAnalyticsProperties,
      });
      if (isAdvancedChartEnabled) {
        setEffectiveChartLibrary(PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT);
      }
    },
    [isAdvancedChartEnabled, market?.symbol, chartAnalyticsProperties, track],
  );

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
    () => !isLoadingPosition,
    [isLoadingPosition],
  );

  // Define navigation items for the card
  const moreItems: PerpsMoreItem[] = useMemo(
    () => [
      {
        label: strings('perps.tutorial.card.title'),
        startIconName: IconName.Book,
        onPress: () => navigateToTutorial(),
        testID: PerpsTutorialSelectorsIDs.TUTORIAL_CARD,
      },
    ],
    [navigateToTutorial],
  );

  const { styles } = useStyles(createStyles, {});

  const isRelatedMarketsVisible = useMemo(
    () =>
      isRelatedMarketsEnabled &&
      getRelatedMarketsForMarket(market, markets) !== null,
    [isRelatedMarketsEnabled, market, markets],
  );

  const shouldShowPerpsMarketInsightsSection = useMemo(
    () =>
      isPerpsInsightsEnabled &&
      Boolean(market?.symbol) &&
      (Boolean(perpsInsightsReport) || isPerpsInsightsLoading),
    [
      isPerpsInsightsEnabled,
      market?.symbol,
      perpsInsightsReport,
      isPerpsInsightsLoading,
    ],
  );

  const preMarketInsightsSections = useMemo(
    () => [
      {
        key: 'position',
        visible: Boolean(existingPosition),
        content: existingPosition ? (
          <PerpsPositionCard
            position={existingPosition}
            currentPrice={currentPrice}
            szDecimals={marketData?.szDecimals}
            onAutoClosePress={handleAutoClosePress}
            onMarginPress={handleMarginPress}
            onSharePress={handleSharePress}
          />
        ) : null,
      },
      {
        key: 'orders',
        visible: displayOrders.length > 0,
        content: (
          <Box paddingBottom={3}>
            <PerpsHomeSection
              title={strings('perps.market.orders')}
              isLoading={false}
              isEmpty={displayOrders.length === 0}
              showWhenEmpty={false}
              renderSkeleton={() => null}
            >
              <View style={styles.positionsOrdersContainer}>
                {displayOrders.map((order, index) => (
                  <PerpsCompactOrderRow
                    key={order.orderId}
                    order={order}
                    onPress={() => handleOrderSelect(order)}
                    testID={
                      index === 0
                        ? PerpsCompactOrderRowSelectorsIDs.FIRST_ROW
                        : `compact-order-${order.orderId}`
                    }
                  />
                ))}
              </View>
            </PerpsHomeSection>
          </Box>
        ),
      },
    ],
    [
      existingPosition,
      currentPrice,
      marketData?.szDecimals,
      handleAutoClosePress,
      handleMarginPress,
      handleSharePress,
      displayOrders,
      handleOrderSelect,
      styles.positionsOrdersContainer,
    ],
  );

  const postMarketInsightsSections = useMemo(
    () => [
      {
        key: 'stats',
        visible: true,
        content: (
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
        ),
      },
      {
        key: 'related-markets',
        // Mirrors PerpsRelatedMarkets' own render gate (no peers -> null) so
        // PerpsHomeSectionList does not render an orphan divider.
        visible: isRelatedMarketsVisible,
        content: market ? <PerpsRelatedMarkets currentMarket={market} /> : null,
      },
      {
        key: 'recent-trades',
        visible: Boolean(market?.symbol),
        content: market?.symbol ? (
          <PerpsMarketTradesList symbol={market.symbol} />
        ) : null,
      },
      {
        key: 'more',
        visible: moreItems.length > 0,
        content: (
          <PerpsMoreSection
            items={moreItems}
            testID={PerpsMarketDetailsViewSelectorsIDs.MORE_SECTION}
          />
        ),
      },
    ],
    [
      market,
      marketStats,
      handleTooltipPress,
      isOrderBookEnabled,
      handleOrderBookPress,
      isRelatedMarketsVisible,
      moreItems,
    ],
  );

  if (!market) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={styles.errorContainer}
          testID={PerpsMarketDetailsViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('perps.market.details.error_message')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowNewPositionActions =
    hasLongShortButtons && !existingPosition && !isAtOICap;
  const shouldShowAddFundsCTASection =
    shouldShowNewPositionActions &&
    isEligible &&
    !isLoadingAccount &&
    !isLoadingPosition &&
    !hasDirectOrderFundingPath;
  const shouldShowLongShortButtonsOnly =
    shouldShowNewPositionActions && !shouldShowAddFundsCTASection;

  return (
    <SafeAreaView
      style={styles.mainContainer}
      edges={['bottom', 'left', 'right']}
      testID={PerpsMarketDetailsViewSelectorsIDs.CONTAINER}
    >
      {/* Only the market identity (icon + name + ticker + leverage) is a tap
          target that opens the market list; it renders as a content-hugging
          box inside the header. */}
      <PerpsMarketInlineHeader
        market={market}
        currentPrice={syncedChartCurrentPrice}
        onBackPress={handleBackPress}
        onFavoritePress={handleWatchlistPress}
        onIdentityPress={handleMarketListPress}
        isFavorite={isWatchlist}
        useDetailLayout
        testID={PerpsMarketDetailsViewSelectorsIDs.HEADER}
        // Pro mode: keep the watchlist star and append a read-only pill showing
        // the active mode. `endAccessory` replaces the header's default end
        // icons, so the star is re-composed here alongside the pill.
        endAccessory={
          isPerpsProModeEnabled ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <ButtonIcon
                iconName={isWatchlist ? IconName.StarFilled : IconName.Star}
                size={ButtonIconSize.Md}
                onPress={handleWatchlistPress}
                testID={PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON}
              />
              <PerpsModeToggle
                mode={perpsMode}
                variant="active"
                onChange={handlePerpsModeChange}
                source={PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN}
              />
            </Box>
          ) : undefined
        }
      />

      <View style={styles.scrollableContentContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.mainContentScrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          testID={PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Below header: live price + 24h change and fullscreen chart button.
              Rendered inside the ScrollView (not the header) so it scrolls with
              the content instead of staying sticky. */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            gap={2}
            twClassName="px-4 pb-2"
            testID={PerpsMarketDetailsViewSelectorsIDs.MARKET_SUMMARY}
          >
            {/* Flexible wrapper lets the price shrink; the button stays fixed. */}
            <Box twClassName="flex-1">
              <LivePriceHeader
                symbol={market.symbol}
                testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
                testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
                currentPrice={syncedChartCurrentPrice}
                size="large"
              />
            </Box>
            <ButtonIcon
              iconName={IconName.Expand}
              size={ButtonIconSize.Md}
              onPress={handleFullscreenChartOpen}
              style={styles.marketSummaryFullscreenButton}
              testID={
                PerpsMarketDetailsViewSelectorsIDs.FULLSCREEN_CHART_BUTTON
              }
              accessibilityLabel={strings(
                'perps.market_details.fullscreen_chart',
              )}
            />
          </Box>

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

              {isAdvancedChartEnabled && market?.symbol ? (
                <PerpsAdvancedChart
                  key={`${market.symbol}-${advancedChartResetKey}`}
                  symbol={market.symbol}
                  interval={selectedCandlePeriod}
                  visibleCandleCount={
                    visibleCandleCount ??
                    PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT
                  }
                  height={PERPS_CHART_CONFIG.LAYOUT.DETAIL_VIEW_HEIGHT}
                  tpslLines={tpslLines}
                  positionSize={existingPosition?.size}
                  szDecimals={marketData?.szDecimals}
                  onCrosshairDataChange={setOhlcData}
                  onLatestPriceChange={setAdvancedChartCurrentPrice}
                  onError={handleChartError}
                  fallbackCandleData={candleData}
                  fallbackFetchMoreHistory={fetchMoreHistory}
                  paginationDuration={TimeDuration.YearToDate}
                />
              ) : hasHistoricalData ? (
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

          {/* Service Interruption Banner */}
          <PerpsServiceInterruptionBanner
            testID={
              PerpsMarketDetailsViewSelectorsIDs.SERVICE_INTERRUPTION_BANNER
            }
          />

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

          {shouldShowPerpsMarketInsightsSection ? (
            perpsInsightsReport ? (
              <MarketInsightsEntryCard
                report={perpsInsightsReport}
                timeAgo={perpsInsightsTimeAgo}
                onPress={handleMarketInsightsPress}
                onDisclaimerPress={() => setIsInsightsDisclaimerVisible(true)}
                source="perps"
                testID={MarketInsightsSelectorsIDs.ENTRY_CARD}
              />
            ) : (
              <MarketInsightsEntryCardSkeleton />
            )
          ) : null}

          <PerpsHomeSectionList sections={preMarketInsightsSections} />

          <PerpsHomeSectionList sections={postMarketInsightsSections} />

          <View style={styles.chromeBlock}>
            <Text
              style={styles.riskDisclaimer}
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('perps.risk_disclaimer', riskDisclaimerParams)}{' '}
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                onPress={handleTradingViewPress}
              >
                TradingView.
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Actions Footer */}
      {hasLongShortButtons && !isTradingHalted && (
        <View style={styles.actionsFooter}>
          {/* Show Modify/Close buttons when position exists */}
          {hasLongShortButtons && existingPosition && (
            <View style={styles.actionsContainer} accessible={false}>
              <DSButton
                variant={ButtonVariant.Secondary}
                size={ButtonSizeRNDesignSystem.Lg}
                onPress={handleModifyPress}
                style={styles.actionButtonWrapper}
                testID={PerpsMarketDetailsViewSelectorsIDs.MODIFY_BUTTON}
              >
                {strings('perps.market.modify')}
              </DSButton>

              <DSButton
                variant={ButtonVariant.Primary}
                size={ButtonSizeRNDesignSystem.Lg}
                onPress={handleClosePosition}
                style={styles.actionButtonWrapper}
                testID={PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON}
              >
                {parseFloat(existingPosition.size) >= 0
                  ? strings('perps.market.close_long')
                  : strings('perps.market.close_short')}
              </DSButton>
            </View>
          )}

          {/* Show Add funds CTA when no perps balance and no allowlist token to preselect */}
          {shouldShowAddFundsCTASection && (
            <View style={styles.actionsContainer} accessible={false}>
              <DSButton
                variant={ButtonVariant.Primary}
                size={ButtonSizeRNDesignSystem.Lg}
                onPress={handleAddFunds}
                style={styles.actionButtonWrapper}
                testID={PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON}
              >
                {strings('perps.add_funds')}
              </DSButton>
            </View>
          )}
          {/* Show Long/Short buttons when no position exists and user can trade */}
          {shouldShowLongShortButtonsOnly && (
            <View style={styles.actionsContainer} accessible={false}>
              {buttonColorVariant === 'colors' ? (
                <ButtonSemantic
                  severity={ButtonSemanticSeverity.Success}
                  onPress={handleLongPress}
                  size={ButtonSizeRNDesignSystem.Lg}
                  isDisabled={isAtOICap}
                  style={styles.actionButtonWrapper}
                  testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
                >
                  {strings('perps.market.long')}
                </ButtonSemantic>
              ) : (
                <DSButton
                  variant={ButtonVariant.Primary}
                  size={ButtonSizeRNDesignSystem.Lg}
                  onPress={handleLongPress}
                  isDisabled={isAtOICap}
                  style={styles.actionButtonWrapper}
                  testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
                >
                  {strings('perps.market.long')}
                </DSButton>
              )}

              {buttonColorVariant === 'colors' ? (
                <ButtonSemantic
                  severity={ButtonSemanticSeverity.Danger}
                  onPress={handleShortPress}
                  size={ButtonSizeRNDesignSystem.Lg}
                  isDisabled={isAtOICap}
                  style={styles.actionButtonWrapper}
                  testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
                >
                  {strings('perps.market.short')}
                </ButtonSemantic>
              ) : (
                <DSButton
                  variant={ButtonVariant.Primary}
                  size={ButtonSizeRNDesignSystem.Lg}
                  onPress={handleShortPress}
                  isDisabled={isAtOICap}
                  style={styles.actionButtonWrapper}
                  testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
                >
                  {strings('perps.market.short')}
                </DSButton>
              )}
            </View>
          )}
        </View>
      )}

      {/* More Candle Periods Bottom Sheet - Rendered at root level */}
      <PerpsCandlePeriodBottomSheet
        isVisible={isMoreCandlePeriodsVisible}
        onClose={handleMoreCandlePeriodsClose}
        selectedPeriod={selectedCandlePeriod}
        selectedDuration={TimeDuration.YearToDate} // Not used when showAllPeriods is true
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
          buttonLocation={PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS}
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
        isAdvancedChartEnabled={isAdvancedChartEnabled}
        symbol={market?.symbol}
        positionSize={existingPosition?.size}
        szDecimals={marketData?.szDecimals}
      />

      {/* Market Insights Disclaimer Bottom Sheet */}
      {isInsightsDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={() => setIsInsightsDisclaimerVisible(false)}
        />
      )}

      {/* Modify Action Bottom Sheet - Rendered conditionally using PerpsHomeView pattern */}
      {showModifyActionSheet && (
        <PerpsSelectModifyActionView
          sheetRef={modifyActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={closeModifySheet}
          onReversePosition={handleReversePosition}
          testID={PerpsMarketDetailsViewSelectorsIDs.MODIFY_ACTION_SHEET}
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
