import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { addCurrencySymbol } from '../../../../util/number';
import { toDateFormat } from '../../../../util/date';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import styleSheet from './Price.styles';
import { TOKEN_OVERVIEW_CHART_HEIGHT as CHART_HEIGHT } from './tokenOverviewChart.constants';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { normalizeTokenAddress } from '../../Bridge/utils/tokenUtils';
import AdvancedChart from '../../Charts/AdvancedChart/AdvancedChart';
import { advancedChartLineChromePresets } from '../../Charts/AdvancedChart/advancedChartLineChrome.presets';
import {
  ChartType,
  type ChartInteractedPayload,
  type CrosshairData,
  type IndicatorType,
} from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import { OHLCVBar } from '../../Charts/AdvancedChart/OHLCVBar/OHLCVBar';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectTokenOverviewChartType } from '../../../../reducers/user/selectors';
import { setTokenOverviewChartType } from '../../../../actions/user';
import { usePriceChart } from '../PriceChart/PriceChart.context';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import PriceLegacy from './Price.legacy';
import NoDataOverlay from '../NoDataOverlay/NoDataOverlay';

const EMPTY_INDICATORS: IndicatorType[] = [];

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1H': 'asset_overview.chart_time_period.1h',
  '1D': 'asset_overview.chart_time_period.1d',
  '1W': 'asset_overview.chart_time_period.1w',
  '1M': 'asset_overview.chart_time_period.1m',
  '1Y': 'asset_overview.chart_time_period.1y',
};

export interface PriceAdvancedProps {
  asset: TokenI;
  currentPrice: number;
  currentCurrency: string;
  /** From parent (`Price`); used when falling back to {@link PriceLegacy}. */
  priceDiff: number;
  /** From parent (`Price`); used when falling back to {@link PriceLegacy}. */
  comparePrice: number;
  isLoading: boolean;
  prices?: TokenPrice[];
  timePeriod?: TimePeriod;
  chartNavigationButtons?: TimePeriod[];
  setTimePeriod?: (period: TimePeriod) => void;
}

const PriceAdvanced = ({
  asset,
  currentPrice,
  currentCurrency,
  priceDiff,
  comparePrice,
  isLoading,
  prices = [],
  timePeriod = '1d',
  chartNavigationButtons = [],
  setTimePeriod,
}: PriceAdvancedProps) => {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const chartType = useSelector(selectTokenOverviewChartType);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(
    null,
  );
  const { setIsChartBeingTouched } = usePriceChart();

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => setCrosshairData(data),
    [],
  );

  const handleTouchStart = useCallback(() => {
    setIsChartBeingTouched(true);
  }, [setIsChartBeingTouched]);

  const handleTouchEnd = useCallback(() => {
    setIsChartBeingTouched(false);
  }, [setIsChartBeingTouched]);

  const handleChartInteracted = useCallback(
    (payload: ChartInteractedPayload) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
          .addProperties({
            interaction_type: payload.interaction_type,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const handleChartTradingViewClicked = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_TRADINGVIEW_CLICKED).build(),
    );
  }, [createEventBuilder, trackEvent]);

  const toggleChartType = useCallback(() => {
    const next =
      chartType === ChartType.Candles ? ChartType.Line : ChartType.Candles;
    if (next !== ChartType.Candles) {
      setCrosshairData(null);
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_TYPE_CHANGED)
        .addProperties({
          chart_type: next === ChartType.Candles ? 'candlestick' : 'line',
        })
        .build(),
    );
    dispatch(setTokenOverviewChartType(next));
  }, [chartType, createEventBuilder, trackEvent, dispatch]);

  const handleTimeRangeSelect = useCallback(
    (range: TimeRange) => {
      if (range === timeRange) {
        return;
      }
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_TIMEFRAME_CHANGED)
          .addProperties({
            chart_timeframe: range,
          })
          .build(),
      );
      setTimeRange(range);
    },
    [createEventBuilder, timeRange, trackEvent],
  );

  const assetId = useMemo(() => {
    // Normalize Polygon's native token address (0x...001010) to zero address
    // before formatting to CAIP-19 assetId. formatAddressToAssetId will convert
    // zero address to proper SLIP-44 format (e.g., eip155:137/slip44:966 for Polygon)
    const normalizedAddress = normalizeTokenAddress(
      asset.address,
      asset.chainId as Hex,
    );
    return (
      formatAddressToAssetId(normalizedAddress, asset.chainId as Hex) ?? ''
    );
  }, [asset.address, asset.chainId]);
  const config = TIME_RANGE_CONFIGS[timeRange];

  /**
   * Used to make sure changing time range always sends a full SET_OHLCV_DATA
   */
  const ohlcvSeriesKey = useMemo(
    () =>
      `${assetId}|${config.timePeriod}|${config.interval}|${currentCurrency}`,
    [assetId, config.timePeriod, config.interval, currentCurrency],
  );

  const {
    ohlcvData,
    isLoading: chartLoading,
    error: chartError,
    hasMore,
    nextCursor,
    hasEmptyData,
  } = useOHLCVChart({
    assetId,
    timePeriod: config.timePeriod,
    interval: config.interval,
    vsCurrency: currentCurrency,
  });

  const ohlcvPagination = useMemo(
    () => ({
      nextCursor,
      hasMore,
      assetId,
      vsCurrency: currentCurrency,
    }),
    [nextCursor, hasMore, assetId, currentCurrency],
  );
  // Anchor the visible window to the last candle so the timeframe constructor
  // spans exactly durationMs (e.g. 24 h) and the leftmost rendered bar matches
  // the reference price used for the header percentage.
  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;

  const visibleFromMs = useMemo(() => {
    if (lastBarTime == null) return undefined;
    return lastBarTime - config.durationMs;
  }, [lastBarTime, config.durationMs]);

  const visibleToMs = lastBarTime;

  const dateLabel = strings(TIME_RANGE_LABELS[timeRange]);

  // Calculate the current compare price from OHLCV data
  const currentComparePrice = useMemo(() => {
    if (ohlcvData.length === 0 || visibleFromMs == null) return null;
    const firstVisible =
      ohlcvData.find((c) => c.time >= visibleFromMs) ?? ohlcvData[0];
    return firstVisible.close;
  }, [ohlcvData, visibleFromMs]);

  // Store last good compare price to show during loading
  const stableComparePriceRef = useRef<number | null>(null);
  const stableSeriesKeyRef = useRef<string>(ohlcvSeriesKey);

  // Update stable compare price when chart finishes loading AND series matches
  useEffect(() => {
    if (stableSeriesKeyRef.current !== ohlcvSeriesKey) {
      stableSeriesKeyRef.current = ohlcvSeriesKey;
    } else if (!chartLoading && currentComparePrice !== null) {
      stableComparePriceRef.current = currentComparePrice;
    }
  }, [chartLoading, currentComparePrice, ohlcvSeriesKey]);

  // Use stable while (loading OR series mismatch), otherwise use current
  const dynamicComparePrice =
    (chartLoading || stableSeriesKeyRef.current !== ohlcvSeriesKey) &&
    stableComparePriceRef.current !== null
      ? stableComparePriceRef.current
      : currentComparePrice;

  // Use last bar's close price for consistent percentage calculation with chart data
  const lastBarClose = ohlcvData[ohlcvData.length - 1]?.close;
  const displayPrice = crosshairData?.close ?? lastBarClose ?? currentPrice;
  const displayDiff = useMemo(() => {
    if (dynamicComparePrice === null) return null;
    return (
      (crosshairData?.close ?? lastBarClose ?? currentPrice) -
      dynamicComparePrice
    );
  }, [crosshairData, lastBarClose, currentPrice, dynamicComparePrice]);

  const displayDate = crosshairData
    ? toDateFormat(crosshairData.time)
    : dateLabel;

  const { styles, theme } = useStyles(styleSheet);

  const hasChartData = ohlcvData.length > 1;
  const hasInsufficientData = ohlcvData.length === 1;
  const showEmptyState = !chartLoading && (!hasChartData || !!chartError);

  const hasTrackedEmptyRef = useRef(false);

  useEffect(() => {
    if (!showEmptyState) {
      hasTrackedEmptyRef.current = false;
      return;
    }
    if (hasTrackedEmptyRef.current) {
      return;
    }
    hasTrackedEmptyRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_EMPTY_DISPLAYED).build(),
    );
  }, [showEmptyState, createEventBuilder, trackEvent]);

  // Fallback to legacy chart if OHLCV data is not available or if there's an error
  if ((hasEmptyData || chartError) && !chartLoading) {
    return (
      <PriceLegacy
        prices={prices}
        timePeriod={timePeriod}
        chartNavigationButtons={chartNavigationButtons}
        onTimePeriodChange={setTimePeriod}
        priceDiff={priceDiff}
        currentPrice={currentPrice}
        currentCurrency={currentCurrency}
        comparePrice={comparePrice}
        isLoading={isLoading}
      />
    );
  }

  return (
    <>
      <View style={styles.wrapper}>
        {!isNaN(currentPrice) && (
          <Text
            testID={TokenOverviewSelectorsIDs.TOKEN_PRICE}
            variant={TextVariant.DisplayLg}
          >
            {isLoading ? (
              <View style={styles.loadingPrice}>
                <SkeletonPlaceholder
                  backgroundColor={theme.colors.background.section}
                  highlightColor={theme.colors.background.subsection}
                >
                  <SkeletonPlaceholder.Item
                    width={100}
                    height={32}
                    borderRadius={6}
                  />
                </SkeletonPlaceholder>
              </View>
            ) : (
              formatPriceWithSubscriptNotation(displayPrice, currentCurrency)
            )}
          </Text>
        )}
        <Text allowFontScaling={false}>
          {isLoading ? (
            <View testID="loading-price-diff" style={styles.loadingPriceDiff}>
              <SkeletonPlaceholder
                backgroundColor={theme.colors.background.section}
                highlightColor={theme.colors.background.subsection}
              >
                <SkeletonPlaceholder.Item
                  width={150}
                  height={18}
                  borderRadius={6}
                />
              </SkeletonPlaceholder>
            </View>
          ) : displayDiff !== null && dynamicComparePrice !== null ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                displayDiff > 0
                  ? TextColor.SuccessDefault
                  : displayDiff < 0
                    ? TextColor.ErrorDefault
                    : TextColor.TextAlternative
              }
              allowFontScaling={false}
            >
              {displayDiff > 0 ? '+' : ''}
              {addCurrencySymbol(displayDiff, currentCurrency, true)} (
              {displayDiff > 0 ? '+' : ''}
              {displayDiff === 0 || dynamicComparePrice === 0
                ? '0'
                : ((displayDiff / dynamicComparePrice) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.TextAlternative}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                allowFontScaling={false}
              >
                {displayDate}
              </Text>
            </Text>
          ) : null}
        </Text>
      </View>
      <Box twClassName={showEmptyState ? 'mt-3 mb-6' : 'mt-3'}>
        {crosshairData && chartType === ChartType.Candles && (
          <OHLCVBar data={crosshairData} currency={currentCurrency} />
        )}
        <View
          testID="advanced-chart-touch-container"
          style={[styles.chartContainer, { height: CHART_HEIGHT }]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {showEmptyState ? (
            <NoDataOverlay
              hasInsufficientData={hasInsufficientData}
              chartHeight={CHART_HEIGHT}
              chartPlaceholderFill={theme.colors.border.muted}
            />
          ) : (
            <AdvancedChart
              ohlcvData={ohlcvData}
              ohlcvSeriesKey={ohlcvSeriesKey}
              height={CHART_HEIGHT}
              showVolume={chartType === ChartType.Candles}
              volumeOverlay
              chartType={chartType}
              indicators={EMPTY_INDICATORS}
              lineChrome={advancedChartLineChromePresets.tokenOverview}
              isLoading={chartLoading}
              ohlcvPagination={ohlcvPagination}
              visibleFromMs={visibleFromMs}
              visibleToMs={visibleToMs}
              onCrosshairMove={handleCrosshairMove}
              onChartInteracted={handleChartInteracted}
              onChartTradingViewClicked={handleChartTradingViewClicked}
            />
          )}
        </View>
      </Box>

      {!showEmptyState && (
        <View style={styles.timeRangeContainer}>
          <View style={styles.timeRangeSelectorWrap}>
            <TimeRangeSelector
              selected={timeRange}
              onSelect={handleTimeRangeSelect}
              chartType={chartType}
              onChartTypeToggle={toggleChartType}
            />
          </View>
        </View>
      )}
    </>
  );
};

export default PriceAdvanced;
