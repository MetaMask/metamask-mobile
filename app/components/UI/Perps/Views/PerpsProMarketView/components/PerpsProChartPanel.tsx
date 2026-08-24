import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FilterButtonVariant,
  IconName,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CandlePeriod, TimeDuration } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { AnimationDuration } from '@metamask/design-tokens';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { useHaptics } from '../../../../../../util/haptics';
import ComponentErrorBoundary from '../../../../ComponentErrorBoundary';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';
import { usePerpsMarketData } from '../../../hooks';
import type { PerpsMarketDetailSectionState } from '../../../hooks/usePerpsMarketDetailSession';
import { usePerpsProChartExpanded } from '../../../hooks/usePerpsProChartExpanded';
import { usePerpsEventTracking } from '../../../hooks/usePerpsEventTracking';
import { useHasExistingPosition } from '../../../hooks/useHasExistingPosition';
import { useIsPriceDeviatedAboveThreshold } from '../../../hooks/useIsPriceDeviatedAboveThreshold';
import { usePerpsLiveCandles } from '../../../hooks/stream/usePerpsLiveCandles';
import { getPerpsChartAnalyticsProperties } from '../../../utils/chartAnalytics';
import PerpsAdvancedChart from '../../../components/PerpsAdvancedChart/PerpsAdvancedChart';
import PerpsCandlePeriodSelector, {
  type PerpsCandlePeriodOption,
} from '../../../components/PerpsCandlePeriodSelector/PerpsCandlePeriodSelector';
import PerpsChartFullscreenModal from '../../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal';
import PerpsOHLCVBar from '../../../components/PerpsOHLCVBar';
import PerpsPriceDeviationWarning from '../../../components/PerpsPriceDeviationWarning';
import PerpsServiceInterruptionBanner from '../../../components/PerpsServiceInterruptionBanner';
import TradingViewChart, {
  type OhlcData,
  type TradingViewChartRef,
} from '../../../components/TradingViewChart';
import PerpsMarketSummary from '../../../components/PerpsMarketSummary';

const PRO_CHART_HEIGHT = 288;
/**
 * Typed button-clicked labels for the Pro chart collapse/expand analytics
 * (mirrors the local-constant pattern used by e.g. `COMPETITION_BANNER_BUTTON`),
 * since `@metamask/perps-controller` has no dedicated chart collapse/expand
 * interaction value.
 */
const PRO_CHART_BUTTON = {
  COLLAPSE_CHART: 'collapse_chart',
  EXPAND_CHART: 'expand_chart',
} as const;
const PRO_CANDLE_PERIODS = [
  { label: '1m', value: CandlePeriod.OneMinute },
  { label: '5m', value: CandlePeriod.FiveMinutes },
  { label: '15m', value: CandlePeriod.FifteenMinutes },
  { label: '1h', value: CandlePeriod.OneHour },
  { label: '1d', value: CandlePeriod.OneDay },
] as const satisfies readonly PerpsCandlePeriodOption[];

interface PerpsProChartPanelProps {
  symbol: string;
  selectedCandlePeriod: CandlePeriod;
  isAdvancedChartEnabled: boolean;
  configuredChartLibrary: string;
  effectiveChartLibrary: string;
  marketContextKey: string;
  isMarketContextReady: boolean;
  onCandlePeriodChange: (period: CandlePeriod) => void;
  onMorePress: () => void;
  onChartError: (error?: Error | string) => void;
  /**
   * Parent-owned display price (`usePerpsSyncedChartPrice`), same value as
   * the compact header. Shown in the summary and chart current-price line.
   */
  currentPrice: number;
  /** Forwards Advanced Chart latest-bar close into `usePerpsSyncedChartPrice`. */
  onLatestPriceChange?: (price: number | undefined) => void;
  onResolvedStateChange?: (
    symbol: string,
    state: PerpsMarketDetailSectionState,
    contextKey: string,
  ) => void;
}

/**
 * Pro Token + Chart section composed from the existing Lite chart stack.
 */
const PerpsProChartPanel = ({
  symbol,
  selectedCandlePeriod,
  isAdvancedChartEnabled,
  configuredChartLibrary,
  effectiveChartLibrary,
  marketContextKey,
  isMarketContextReady,
  onCandlePeriodChange,
  onMorePress,
  onChartError,
  currentPrice,
  onLatestPriceChange,
  onResolvedStateChange,
}: PerpsProChartPanelProps) => {
  const { track } = usePerpsEventTracking();
  const { playSelection } = useHaptics();
  const { isChartExpanded, setChartExpanded } = usePerpsProChartExpanded();
  const [isFullscreenChartVisible, setIsFullscreenChartVisible] =
    useState(false);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
  const chartRef = useRef<TradingViewChartRef>(null);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);
  const visibleCandleCount = PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT;
  const chartContextKey = `${symbol}|${marketContextKey}|${selectedCandlePeriod}|${configuredChartLibrary}`;

  // Pro-only: the Advanced Chart unmounts while collapsed, so drop its last
  // reported close. Symbol/period/flag resets are owned by
  // `usePerpsSyncedChartPrice` (same as Lite).
  useEffect(() => {
    if (!isChartExpanded) {
      onLatestPriceChange?.(undefined);
    }
  }, [isChartExpanded, onLatestPriceChange]);

  const chartAnalyticsProperties = useMemo(
    () => getPerpsChartAnalyticsProperties(effectiveChartLibrary),
    [effectiveChartLibrary],
  );

  const { candleData, isLoading, hasHistoricalData, fetchMoreHistory } =
    usePerpsLiveCandles({
      symbol,
      interval: selectedCandlePeriod,
      duration: TimeDuration.YearToDate,
      throttleMs: 1000,
      resetKey: marketContextKey,
      enabled: isMarketContextReady,
    });
  useEffect(() => {
    if (!isMarketContextReady) {
      setOhlcData(null);
      setIsFullscreenChartVisible(false);
    }
  }, [isMarketContextReady, marketContextKey]);

  useEffect(() => {
    if (!isChartExpanded) {
      onResolvedStateChange?.(symbol, 'not_applicable', chartContextKey);
      return;
    }
    onResolvedStateChange?.(symbol, 'loading', chartContextKey);
  }, [
    chartContextKey,
    isAdvancedChartEnabled,
    isChartExpanded,
    isMarketContextReady,
    onResolvedStateChange,
    selectedCandlePeriod,
    symbol,
  ]);

  useEffect(() => {
    if (
      isChartExpanded &&
      isMarketContextReady &&
      !isAdvancedChartEnabled &&
      candleData?.symbol === symbol &&
      candleData.interval === selectedCandlePeriod &&
      !isLoading
    ) {
      onResolvedStateChange?.(
        symbol,
        hasHistoricalData ? 'content' : 'empty',
        chartContextKey,
      );
    }
  }, [
    candleData?.interval,
    candleData?.symbol,
    chartContextKey,
    hasHistoricalData,
    isAdvancedChartEnabled,
    isChartExpanded,
    isLoading,
    isMarketContextReady,
    onResolvedStateChange,
    selectedCandlePeriod,
    symbol,
  ]);

  const handleAdvancedChartResolved = useCallback(
    (
      resolvedSeriesKey: string,
      state: Extract<PerpsMarketDetailSectionState, 'content' | 'empty'>,
    ) => {
      const expectedSeriesKey = `${symbol}|${selectedCandlePeriod}`;
      if (
        resolvedSeriesKey === expectedSeriesKey ||
        resolvedSeriesKey.startsWith(`${expectedSeriesKey}|`)
      ) {
        onResolvedStateChange?.(symbol, state, chartContextKey);
      }
    },
    [chartContextKey, onResolvedStateChange, selectedCandlePeriod, symbol],
  );
  const { existingPosition } = useHasExistingPosition({
    asset: symbol,
    loadOnMount: true,
  });
  const { marketData } = usePerpsMarketData({ asset: symbol });
  const {
    isDeviatedAboveThreshold: isTradingHalted,
    isLoading: isLoadingTradingHalted,
  } = useIsPriceDeviatedAboveThreshold(symbol);

  const tpslLines = useMemo(() => {
    const chartPriceStr =
      currentPrice > 0 ? currentPrice.toString() : undefined;

    if (!existingPosition) {
      return chartPriceStr ? { currentPrice: chartPriceStr } : undefined;
    }

    return {
      entryPrice: existingPosition.entryPrice,
      takeProfitPrice: existingPosition.takeProfitPrice,
      stopLossPrice: existingPosition.stopLossPrice,
      liquidationPrice: existingPosition.liquidationPrice || undefined,
      currentPrice: chartPriceStr,
    };
  }, [currentPrice, existingPosition]);

  useEffect(() => {
    const hasIntervalChanged =
      previousIntervalRef.current !== selectedCandlePeriod;

    if (hasIntervalChanged && candleData?.interval === selectedCandlePeriod) {
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
      previousIntervalRef.current = selectedCandlePeriod;
    }
  }, [candleData, selectedCandlePeriod, visibleCandleCount]);

  const handleToggleChartExpanded = useCallback(
    (expanded: boolean) => {
      playSelection().catch(() => undefined);
      setChartExpanded(expanded);
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]: expanded
          ? PRO_CHART_BUTTON.EXPAND_CHART
          : PRO_CHART_BUTTON.COLLAPSE_CHART,
        [PERPS_EVENT_PROPERTY.ASSET]: symbol,
        ...chartAnalyticsProperties,
      });
    },
    [chartAnalyticsProperties, playSelection, setChartExpanded, symbol, track],
  );

  const handleFullscreenChartOpen = useCallback(() => {
    setIsFullscreenChartVisible(true);
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FULL_SCREEN_CHART,
      [PERPS_EVENT_PROPERTY.ASSET]: symbol,
      ...chartAnalyticsProperties,
    });
  }, [chartAnalyticsProperties, symbol, track]);

  let chartContent: React.ReactNode = (
    <Skeleton
      height={PRO_CHART_HEIGHT}
      width="100%"
      testID={PerpsProMarketViewSelectorsIDs.CHART_SKELETON}
    />
  );
  if (isMarketContextReady && isAdvancedChartEnabled) {
    chartContent = (
      <PerpsAdvancedChart
        key={`${symbol}|${marketContextKey}`}
        symbol={symbol}
        interval={selectedCandlePeriod}
        visibleCandleCount={visibleCandleCount}
        height={PRO_CHART_HEIGHT}
        tpslLines={tpslLines}
        positionSize={existingPosition?.size}
        szDecimals={marketData?.szDecimals}
        onCrosshairDataChange={setOhlcData}
        onLatestPriceChange={onLatestPriceChange}
        onResolved={handleAdvancedChartResolved}
        onError={onChartError}
        fallbackCandleData={candleData}
        fallbackFetchMoreHistory={fetchMoreHistory}
        paginationDuration={TimeDuration.YearToDate}
      />
    );
  } else if (
    isMarketContextReady &&
    candleData?.symbol === symbol &&
    candleData.interval === selectedCandlePeriod &&
    !isLoading
  ) {
    chartContent = (
      <TradingViewChart
        ref={chartRef}
        candleData={candleData}
        height={PRO_CHART_HEIGHT}
        visibleCandleCount={visibleCandleCount}
        tpslLines={tpslLines}
        symbol={symbol}
        showOverlay={false}
        coloredVolume
        onOhlcDataChange={setOhlcData}
        onNeedMoreHistory={fetchMoreHistory}
        testID={PerpsProMarketViewSelectorsIDs.CHART_LIGHTWEIGHT}
      />
    );
  }

  return (
    <>
      <PerpsMarketSummary
        symbol={symbol}
        currentPrice={currentPrice}
        testID={PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY}
        testIDPrice={PerpsProMarketViewSelectorsIDs.MARKET_PRICE}
        testIDChange={PerpsProMarketViewSelectorsIDs.MARKET_PRICE_CHANGE}
        endAccessory={
          <ButtonIcon
            iconName={IconName.Candlestick}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Filled}
            onPress={() => handleToggleChartExpanded(!isChartExpanded)}
            testID={PerpsProMarketViewSelectorsIDs.CHART_TOGGLE_BUTTON}
            accessibilityLabel={strings(
              isChartExpanded
                ? 'perps.market_details.collapse_chart'
                : 'perps.market_details.expand_chart',
            )}
            accessibilityState={{ expanded: isChartExpanded }}
          />
        }
      />
      {isChartExpanded ? (
        <Animated.View
          entering={FadeIn.duration(AnimationDuration.Fast)}
          exiting={FadeOut.duration(AnimationDuration.Fast)}
        >
          <Box
            testID={PerpsProMarketViewSelectorsIDs.CHART_PANEL}
            twClassName="my-2 h-[344px] px-2 py-2"
          >
            <Box
              testID={PerpsProMarketViewSelectorsIDs.CHART_CONTENT}
              twClassName="flex-1 gap-2"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <PerpsCandlePeriodSelector
                  selectedPeriod={selectedCandlePeriod}
                  onPeriodChange={onCandlePeriodChange}
                  onMorePress={onMorePress}
                  visiblePeriods={PRO_CANDLE_PERIODS}
                  twClassName="flex-1 py-0"
                  groupTwClassName="gap-2 justify-start"
                  filterVariant={FilterButtonVariant.Secondary}
                  periodButtonTwClassName="h-7 rounded px-1"
                  moreButtonTwClassName="h-7 rounded px-1"
                  textVariant={TextVariant.BodyXs}
                  testID={PerpsProMarketViewSelectorsIDs.CHART_PERIOD_SELECTOR}
                />
                <ButtonIcon
                  iconName={IconName.Expand}
                  size={ButtonIconSize.Sm}
                  onPress={handleFullscreenChartOpen}
                  testID={
                    PerpsProMarketViewSelectorsIDs.CHART_FULLSCREEN_BUTTON
                  }
                  accessibilityLabel={strings(
                    'perps.market_details.fullscreen_chart',
                  )}
                />
              </Box>
              <ComponentErrorBoundary
                componentLabel="PerpsProMarketChart"
                onError={onChartError}
              >
                <Box twClassName="relative flex-1">
                  {isMarketContextReady && ohlcData ? (
                    <Box twClassName="absolute left-0 right-0 top-0 z-10">
                      <PerpsOHLCVBar
                        open={ohlcData.open}
                        high={ohlcData.high}
                        low={ohlcData.low}
                        close={ohlcData.close}
                        volume={ohlcData.volume}
                        testID={PerpsProMarketViewSelectorsIDs.CHART_OHLCV}
                      />
                    </Box>
                  ) : null}
                  {chartContent}
                </Box>
              </ComponentErrorBoundary>
            </Box>
          </Box>
        </Animated.View>
      ) : null}
      {isTradingHalted && !isLoadingTradingHalted ? (
        <PerpsPriceDeviationWarning
          testID={PerpsProMarketViewSelectorsIDs.CHART_PRICE_DEVIATION_WARNING}
        />
      ) : null}
      <PerpsServiceInterruptionBanner
        testID={
          PerpsProMarketViewSelectorsIDs.CHART_SERVICE_INTERRUPTION_BANNER
        }
      />
      {isMarketContextReady && (
        <PerpsChartFullscreenModal
          isVisible={isFullscreenChartVisible}
          candleData={candleData}
          tpslLines={tpslLines}
          selectedInterval={selectedCandlePeriod}
          visibleCandleCount={visibleCandleCount}
          onClose={() => setIsFullscreenChartVisible(false)}
          onIntervalChange={onCandlePeriodChange}
          isAdvancedChartEnabled={isAdvancedChartEnabled}
          symbol={symbol}
          positionSize={existingPosition?.size}
          szDecimals={marketData?.szDecimals}
          fallbackFetchMoreHistory={fetchMoreHistory}
        />
      )}
    </>
  );
};

export default PerpsProChartPanel;
