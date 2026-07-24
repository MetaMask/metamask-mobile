import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FilterButtonVariant,
  IconName,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CandlePeriod, TimeDuration } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import ComponentErrorBoundary from '../../../../ComponentErrorBoundary';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';
import { usePerpsMarketData } from '../../../hooks';
import { usePerpsEventTracking } from '../../../hooks/usePerpsEventTracking';
import { useHasExistingPosition } from '../../../hooks/useHasExistingPosition';
import { useIsPriceDeviatedAboveThreshold } from '../../../hooks/useIsPriceDeviatedAboveThreshold';
import { usePerpsLiveCandles } from '../../../hooks/stream/usePerpsLiveCandles';
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
import PerpsProMarketSummary from './PerpsProMarketSummary';

const PRO_CHART_HEIGHT = 288;
const PRO_CANDLE_PERIODS = [
  { label: '1m', value: CandlePeriod.OneMinute },
  { label: '5m', value: CandlePeriod.FiveMinutes },
  { label: '15m', value: CandlePeriod.FifteenMinutes },
  { label: '1h', value: CandlePeriod.OneHour },
  { label: '1d', value: CandlePeriod.OneDay },
] as const satisfies readonly PerpsCandlePeriodOption[];

const getChartAnalyticsProperties = (chartLibrary: string) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

interface PerpsProChartPanelProps {
  symbol: string;
  selectedCandlePeriod: CandlePeriod;
  isAdvancedChartEnabled: boolean;
  effectiveChartLibrary: string;
  onCandlePeriodChange: (period: CandlePeriod) => void;
  onMorePress: () => void;
  onChartError: (error?: Error | string) => void;
}

/**
 * Pro Token + Chart section composed from the existing Lite chart stack.
 */
const PerpsProChartPanel = ({
  symbol,
  selectedCandlePeriod,
  isAdvancedChartEnabled,
  effectiveChartLibrary,
  onCandlePeriodChange,
  onMorePress,
  onChartError,
}: PerpsProChartPanelProps) => {
  const { track } = usePerpsEventTracking();
  const [isFullscreenChartVisible, setIsFullscreenChartVisible] =
    useState(false);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
  const [advancedChartCurrentPrice, setAdvancedChartCurrentPrice] = useState<
    number | undefined
  >(undefined);
  const chartRef = useRef<TradingViewChartRef>(null);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);
  const visibleCandleCount = PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT;

  useEffect(() => {
    setAdvancedChartCurrentPrice(undefined);
  }, [isAdvancedChartEnabled, selectedCandlePeriod, symbol]);

  const chartAnalyticsProperties = useMemo(
    () => getChartAnalyticsProperties(effectiveChartLibrary),
    [effectiveChartLibrary],
  );

  const { candleData, hasHistoricalData, fetchMoreHistory } =
    usePerpsLiveCandles({
      symbol,
      interval: selectedCandlePeriod,
      duration: TimeDuration.YearToDate,
      throttleMs: 1000,
    });
  const { existingPosition } = useHasExistingPosition({
    asset: symbol,
    loadOnMount: true,
  });
  const { marketData } = usePerpsMarketData({ asset: symbol });
  const {
    isDeviatedAboveThreshold: isTradingHalted,
    isLoading: isLoadingTradingHalted,
  } = useIsPriceDeviatedAboveThreshold(symbol);

  const chartCurrentPrice = useMemo(() => {
    const lastCandle = candleData?.candles.at(-1);
    return lastCandle?.close ? Number.parseFloat(lastCandle.close) : 0;
  }, [candleData]);
  const syncedChartCurrentPrice =
    isAdvancedChartEnabled && advancedChartCurrentPrice !== undefined
      ? advancedChartCurrentPrice
      : chartCurrentPrice;

  const tpslLines = useMemo(() => {
    const currentPrice =
      syncedChartCurrentPrice > 0
        ? syncedChartCurrentPrice.toString()
        : undefined;

    if (!existingPosition) {
      return currentPrice ? { currentPrice } : undefined;
    }

    return {
      entryPrice: existingPosition.entryPrice,
      takeProfitPrice: existingPosition.takeProfitPrice,
      stopLossPrice: existingPosition.stopLossPrice,
      liquidationPrice: existingPosition.liquidationPrice || undefined,
      currentPrice,
    };
  }, [existingPosition, syncedChartCurrentPrice]);

  useEffect(() => {
    const hasIntervalChanged =
      previousIntervalRef.current !== selectedCandlePeriod;

    if (hasIntervalChanged && candleData?.interval === selectedCandlePeriod) {
      chartRef.current?.zoomToLatestCandle(visibleCandleCount);
      previousIntervalRef.current = selectedCandlePeriod;
    }
  }, [candleData, selectedCandlePeriod, visibleCandleCount]);

  const handleFullscreenChartOpen = useCallback(() => {
    setIsFullscreenChartVisible(true);
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FULL_SCREEN_CHART,
      [PERPS_EVENT_PROPERTY.ASSET]: symbol,
      ...chartAnalyticsProperties,
    });
  }, [chartAnalyticsProperties, symbol, track]);

  return (
    <>
      <PerpsProMarketSummary
        symbol={symbol}
        currentPrice={syncedChartCurrentPrice}
      />
      <Box
        testID={PerpsProMarketViewSelectorsIDs.CHART_PANEL}
        twClassName="my-2 h-[344px] px-4 py-2"
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
              testID={PerpsProMarketViewSelectorsIDs.CHART_FULLSCREEN_BUTTON}
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
              {ohlcData ? (
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
              {isAdvancedChartEnabled ? (
                <PerpsAdvancedChart
                  symbol={symbol}
                  interval={selectedCandlePeriod}
                  visibleCandleCount={visibleCandleCount}
                  height={PRO_CHART_HEIGHT}
                  tpslLines={tpslLines}
                  positionSize={existingPosition?.size}
                  szDecimals={marketData?.szDecimals}
                  onCrosshairDataChange={setOhlcData}
                  onLatestPriceChange={setAdvancedChartCurrentPrice}
                  onError={onChartError}
                  fallbackCandleData={candleData}
                  fallbackFetchMoreHistory={fetchMoreHistory}
                  paginationDuration={TimeDuration.YearToDate}
                />
              ) : hasHistoricalData ? (
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
              ) : (
                <Skeleton
                  height={PRO_CHART_HEIGHT}
                  width="100%"
                  testID={PerpsProMarketViewSelectorsIDs.CHART_SKELETON}
                />
              )}
            </Box>
          </ComponentErrorBoundary>
        </Box>
      </Box>
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
      />
    </>
  );
};

export default PerpsProChartPanel;
