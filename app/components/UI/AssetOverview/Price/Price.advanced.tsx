import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { addCurrencySymbol } from '../../../../util/number';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import styleSheet from './Price.styles';
import { TOKEN_OVERVIEW_CHART_HEIGHT as CHART_HEIGHT } from './tokenOverviewChart.constants';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { normalizeTokenAddress } from '../../Bridge/utils/tokenUtils';
import { LineGraph, GraphPoint } from 'react-native-graph';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
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
import { usePriceChart } from '../PriceChart/PriceChart.context';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1H': 'asset_overview.chart_time_period.1h',
  '1D': 'asset_overview.chart_time_period.1d',
  '1W': 'asset_overview.chart_time_period.1w',
  '1M': 'asset_overview.chart_time_period.1m',
  '1Y': 'asset_overview.chart_time_period.1y',
};

export interface PriceAdvancedProps {
  asset: TokenI;
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  onTimePeriodChange?: (period: string) => void;
}

const PriceAdvanced = ({
  asset,
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
  onTimePeriodChange,
}: PriceAdvancedProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const chartType = useSelector(selectTokenOverviewChartType);
  const { setIsChartBeingTouched } = usePriceChart();

  // Scrub state: when the user pans the chart, show the scrubbed price
  const [scrubPrice, setScrubPrice] = useState<number | null>(null);
  const isScrubbing = scrubPrice !== null;

  const handlePointSelected = useCallback((point: GraphPoint) => {
    setScrubPrice(point.value);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsChartBeingTouched(true);
  }, [setIsChartBeingTouched]);

  const handleTouchEnd = useCallback(() => {
    setIsChartBeingTouched(false);
    setScrubPrice(null);
  }, [setIsChartBeingTouched]);

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
      const config = TIME_RANGE_CONFIGS[range];
      onTimePeriodChange?.(config.timePeriod);
    },
    [createEventBuilder, timeRange, trackEvent, onTimePeriodChange],
  );

  const assetId = useMemo(() => {
    const normalizedAddress = normalizeTokenAddress(
      asset.address,
      asset.chainId as Hex,
    );
    return (
      formatAddressToAssetId(normalizedAddress, asset.chainId as Hex) ?? ''
    );
  }, [asset.address, asset.chainId]);
  const config = TIME_RANGE_CONFIGS[timeRange];

  const {
    ohlcvData,
    isLoading: chartLoading,
    error: chartError,
  } = useOHLCVChart({
    assetId,
    timePeriod: config.timePeriod,
    interval: config.interval,
    vsCurrency: currentCurrency,
  });

  // Normalize + trim helper (pure function, no hooks).
  const NORMALIZED_POINT_COUNT = 100;

  const buildGraphPoints = useCallback(
    (data: typeof ohlcvData, durationMs: number): GraphPoint[] => {
      if (data.length === 0) return [];

      // Trim: the API may return more data than the requested range.
      const lastTs = data[data.length - 1].time;
      const cutoff = lastTs - durationMs;
      const trimmed = data.filter((bar) => bar.time >= cutoff);
      if (trimmed.length === 0) return [];

      // Normalize to a fixed point count for smooth path-morph animations.
      if (trimmed.length <= NORMALIZED_POINT_COUNT) {
        const points = trimmed.map((bar) => ({
          value: bar.close,
          date: new Date(bar.time),
        }));
        if (points.length >= 2 && points.length < NORMALIZED_POINT_COUNT) {
          const result: GraphPoint[] = [];
          const step = (points.length - 1) / (NORMALIZED_POINT_COUNT - 1);
          for (let i = 0; i < NORMALIZED_POINT_COUNT; i++) {
            const rawIdx = i * step;
            const lo = Math.floor(rawIdx);
            const hi = Math.min(lo + 1, points.length - 1);
            const t = rawIdx - lo;
            result.push({
              value: points[lo].value * (1 - t) + points[hi].value * t,
              date: new Date(
                points[lo].date.getTime() * (1 - t) +
                  points[hi].date.getTime() * t,
              ),
            });
          }
          return result;
        }
        return points;
      }
      const result: GraphPoint[] = [];
      const step = (trimmed.length - 1) / (NORMALIZED_POINT_COUNT - 1);
      for (let i = 0; i < NORMALIZED_POINT_COUNT; i++) {
        const idx = Math.round(i * step);
        const bar = trimmed[idx];
        result.push({ value: bar.close, date: new Date(bar.time) });
      }
      return result;
    },
    [],
  );

  // Only recompute when ohlcvData is a new array reference, meaning a
  // fresh fetch completed. This prevents any intermediate re-renders
  // (stale data + new timeRange) from updating the displayed graph.
  const [graphPoints, setGraphPoints] = useState<GraphPoint[]>([]);
  const lastDataRef = useRef<typeof ohlcvData | null>(null);

  if (ohlcvData !== lastDataRef.current && ohlcvData.length > 0) {
    lastDataRef.current = ohlcvData;
    const next = buildGraphPoints(ohlcvData, config.durationMs);
    setGraphPoints(next);
  }

  const dateLabel = strings(TIME_RANGE_LABELS[timeRange]);

  const { styles, theme } = useStyles(styleSheet);

  const hasChartData = graphPoints.length > 1;
  const showEmptyState = !chartLoading && (!hasChartData || !!chartError);

  // When scrubbing, compute price/diff from the scrubbed point vs first point in range
  const firstPointPrice = graphPoints.length > 0 ? graphPoints[0].value : 0;
  const displayPrice = isScrubbing ? scrubPrice : currentPrice;
  const displayDiff = isScrubbing
    ? scrubPrice - firstPointPrice
    : priceDiff;
  const displayCompare = isScrubbing ? firstPointPrice : comparePrice;

  const chartColor =
    displayDiff > 0
      ? theme.colors.success.default
      : displayDiff < 0
        ? theme.colors.error.default
        : theme.colors.text.alternative;

  const gradientColors = useMemo(
    () => [chartColor + '40', chartColor + '20', chartColor + '00'],
    [chartColor],
  );

  // Only show skeleton loaders on the very first load, not on time range switches
  const hasLoadedOnce = useRef(false);
  if (!isLoading && currentPrice > 0) {
    hasLoadedOnce.current = true;
  }
  const showPriceSkeleton = isLoading && !hasLoadedOnce.current;

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

  return (
    <>
      <View style={styles.wrapper}>
        {!isNaN(displayPrice) && (
          <Text
            testID={TokenOverviewSelectorsIDs.TOKEN_PRICE}
            variant={TextVariant.DisplayLg}
          >
            {showPriceSkeleton ? (
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
          {showPriceSkeleton ? (
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
          ) : (
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
              {displayDiff === 0 || displayCompare === 0
                ? '0'
                : ((displayDiff / displayCompare) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.TextAlternative}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                allowFontScaling={false}
              >
                {dateLabel}
              </Text>
            </Text>
          )}
        </Text>
      </View>
      <Box twClassName={showEmptyState ? 'mt-3 mb-6' : 'mt-3'}>
        <View
          testID="advanced-chart-touch-container"
          style={[styles.chartContainer, { height: CHART_HEIGHT }]}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {showEmptyState ? (
            <View style={styles.noDataOverlay}>
              <Text variant={TextVariant.HeadingSm} twClassName="text-center">
                {strings('asset_overview.no_chart_data.title')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {strings('asset_overview.no_chart_data.description')}
              </Text>
            </View>
          ) : (
            <LineGraph
              animated
              points={graphPoints}
              color={chartColor}
              gradientFillColors={gradientColors}
              style={{ width: '100%', height: CHART_HEIGHT }}
              enablePanGesture
              enableIndicator
              indicatorPulsating
              enableFadeInMask
              onPointSelected={handlePointSelected}
              onGestureStart={handleTouchStart}
              onGestureEnd={handleTouchEnd}
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
              onChartTypeToggle={() => {}}
            />
          </View>
        </View>
      )}
    </>
  );
};

export default PriceAdvanced;
