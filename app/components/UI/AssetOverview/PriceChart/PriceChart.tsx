/* eslint-disable react/no-unstable-nested-components */
import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  View,
} from 'react-native';
import { Circle, G, Path, Line as SvgLine } from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  CHART_DATA_THRESHOLD,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../Price/tokenOverviewChart.constants';
import styleSheet from './PriceChart.styles';
import PriceChartContext from './PriceChart.context';
import NoDataOverlay from '../NoDataOverlay/NoDataOverlay';
import { Box } from '@metamask/design-system-react-native';

interface LineProps {
  line: string;
  lineStrokeActive: boolean;
}

interface TooltipProps {
  x: (value: number) => number;
  y: (value: number) => number;
  ticks: number[];
  width?: number;
  height?: number;
}

/** Design: 16×16 logical px circle (TradingView-style last-point marker). */
const END_DOT_DIAMETER = 16;

/**
 * Binary-search for the data point whose timestamp is closest to `target`.
 * Assumes `sortedPrices` is sorted ascending by timestamp.
 */
function findNearestIndex(sortedPrices: TokenPrice[], target: number): number {
  if (sortedPrices.length === 0) return -1;
  let lo = 0;
  let hi = sortedPrices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Number(sortedPrices[mid][0]) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo > 0) {
    const diffLo = Math.abs(Number(sortedPrices[lo][0]) - target);
    const diffPrev = Math.abs(Number(sortedPrices[lo - 1][0]) - target);
    if (diffPrev < diffLo) return lo - 1;
  }
  return lo;
}

interface PriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
  onChartIndexChange: (index: number) => void;
  /** Match token overview AdvancedChart height. */
  chartHeight?: number;
  /** Override line color (A/B test). */
  chartColorOverride?: string;
  /**
   * When true, the historical-prices API returned data covering less than
   * 50% of the requested time period. The chart shows a "no data" overlay
   * instead of rendering a misleading partial chart.
   */
  hasInsufficientCoverage?: boolean;
  /**
   * Duration of the selected time range in milliseconds (e.g. 86 400 000
   * for "1D"). When provided the chart uses a time-based x-axis so partial
   * data is rendered at the correct position within the full window.  When
   * omitted (e.g. "ALL") the chart falls back to index-based x-axis.
   */
  timePeriodMs?: number;
}

const PriceChart = ({
  prices,
  priceDiff,
  isLoading,
  onChartIndexChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
  chartColorOverride,
  hasInsufficientCoverage = false,
  timePeriodMs,
}: PriceChartProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const emptyDisplayTrackedRef = useRef(false);
  const { setIsChartBeingTouched } = useContext(PriceChartContext);

  const [positionX, setPositionX] = useState(-1); // The currently selected X coordinate position
  /** Laid-out width of the chart row — used for touch mapping and skeleton (not screen width). */
  const [chartRowWidth, setChartRowWidth] = useState(0);
  const { styles, theme } = useStyles(styleSheet, { chartHeight });
  const { themeAppearance } = useTheme();
  const chartColor =
    chartColorOverride ??
    (themeAppearance === AppThemeKey.light
      ? LIGHT_MODE_SUCCESS_GREEN
      : theme.colors.success.default);

  useEffect(() => {
    setPositionX(-1);
  }, [prices]);

  const apx = (size = 0) => {
    const width = Dimensions.get('window').width;
    return (width / 750) * size;
  };

  const priceList = prices.map((_: TokenPrice) => _[1]);

  const endDotRadius = END_DOT_DIAMETER / 2;
  const endDotInsetRight = endDotRadius + 8;

  const isTimeBased = timePeriodMs != null && timePeriodMs > 0;

  // Stable x-domain for the time-based axis. Recalculated when the data or
  // time-period changes so the "now" anchor matches the fetch moment.
  const { chartXMin, chartXMax } = useMemo(() => {
    if (!isTimeBased) {
      return { chartXMin: undefined, chartXMax: undefined };
    }
    const now = Date.now();
    return { chartXMin: now - timePeriodMs, chartXMax: now };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeBased, timePeriodMs, prices]);

  // Detect if this is a stablecoin and calculate appropriate Y-axis range
  const { isStablecoin, yMin, yMax } = useMemo(() => {
    if (priceList.length === 0) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }

    // Use median for better outlier resistance
    const sortedPrices = [...priceList].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = sortedPrices[0];
    const maxPrice = sortedPrices[sortedPrices.length - 1];

    // Detect stablecoin: median price between $0.90 and $1.10
    const isStablecoinPrice = medianPrice >= 0.9 && medianPrice <= 1.1;

    if (!isStablecoinPrice) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }

    // For stablecoins, create an intelligently zoomed view
    const priceRange = maxPrice - minPrice;

    // Ensure minimum range of 2% of median price for meaningful visualization
    // This prevents over-zooming on very stable prices (e.g., all $1.000)
    const minRange = medianPrice * 0.02; // 2% range minimum

    // Use larger of actual range or minimum range
    const effectiveRange = Math.max(priceRange, minRange);

    // Add 20% padding to the effective range for visual breathing room
    const padding = effectiveRange * 0.2;

    // Center the range around the median for balanced visualization
    const halfRange = effectiveRange / 2;

    return {
      isStablecoin: true,
      yMin: Math.max(0, medianPrice - halfRange - padding),
      yMax: medianPrice + halfRange + padding,
    };
  }, [priceList]);

  const chartHasData =
    priceList.length >= CHART_DATA_THRESHOLD && !hasInsufficientCoverage;
  const hasInsufficientData =
    (priceList.length > 0 && priceList.length < CHART_DATA_THRESHOLD) ||
    hasInsufficientCoverage;

  useEffect(() => {
    if (chartHasData || isLoading) {
      emptyDisplayTrackedRef.current = false;
      return;
    }
    if (emptyDisplayTrackedRef.current) {
      return;
    }
    emptyDisplayTrackedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_EMPTY_DISPLAYED).build(),
    );
  }, [chartHasData, isLoading, trackEvent, createEventBuilder]);

  const onActiveIndexChange = (index: number) => {
    setPositionX(index);
    onChartIndexChange(index);
  };

  const updatePosition = (pixelX: number) => {
    if (pixelX === -1) {
      onActiveIndexChange(-1);
      return;
    }
    const chartWidth =
      chartRowWidth > 0 ? chartRowWidth : Dimensions.get('window').width;

    if (isTimeBased && chartXMin != null && chartXMax != null) {
      const rangeMax = chartWidth - endDotInsetRight;
      const clamped = Math.max(0, Math.min(pixelX, rangeMax));
      const fraction = rangeMax > 0 ? clamped / rangeMax : 0;
      const targetTs = chartXMin + fraction * (chartXMax - chartXMin);
      const idx = findNearestIndex(prices, targetTs);
      onActiveIndexChange(idx);
    } else {
      const xDistance = chartWidth / priceList.length;
      const clamped = Math.max(0, Math.min(pixelX, chartWidth));
      let value = Number((clamped / xDistance).toFixed(0));
      if (value >= priceList.length - 1) {
        value = priceList.length - 1;
      }
      onActiveIndexChange(value);
    }
  };

  // Refs so the PanResponder closure always calls the latest functions.
  const updatePositionRef = useRef(updatePosition);
  updatePositionRef.current = updatePosition;
  const setIsChartBeingTouchedRef = useRef(setIsChartBeingTouched);
  setIsChartBeingTouchedRef.current = setIsChartBeingTouched;

  const prevTouch = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
        updatePositionRef.current(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const deltaX = evt.nativeEvent.locationX - prevTouch.current.x;
        const deltaY = evt.nativeEvent.locationY - prevTouch.current.y;
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        setIsChartBeingTouchedRef.current(isHorizontalSwipe);
        updatePositionRef.current(
          isHorizontalSwipe ? evt.nativeEvent.locationX : -1,
        );

        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
      },

      onPanResponderRelease: () => {
        setIsChartBeingTouchedRef.current(false);
        updatePositionRef.current(-1);
      },
    }),
  );

  const Line = (props: Partial<LineProps>) => {
    const { line, lineStrokeActive } = props as LineProps;
    return (
      <Path
        key="line"
        d={line}
        stroke={lineStrokeActive ? chartColor : theme.colors.text.alternative}
        strokeWidth={apx(4)}
        fill="none"
        opacity={lineStrokeActive ? 1 : 0.85}
      />
    );
  };

  const Tooltip = ({ x, y, height: svgHeight }: Partial<TooltipProps>) => {
    if (positionX < 0) {
      return null;
    }
    const lineHeight =
      typeof svgHeight === 'number' && svgHeight > 0 ? svgHeight : chartHeight;
    const xPos = isTimeBased
      ? x?.(Number(prices[positionX]?.[0]))
      : x?.(positionX);
    return (
      <G x={xPos} key="tooltip">
        <G>
          <SvgLine
            y1={1}
            y2={lineHeight}
            stroke={styles.tooltipLine.color}
            strokeWidth={1}
          />
          <Circle
            cy={y?.(priceList[positionX])}
            r={apx(20 / 2)}
            stroke={styles.tooltipLine.color}
            strokeWidth={apx(1)}
            fill={chartColor}
          />
        </G>
      </G>
    );
  };

  /** Last-point marker — TradingView-style line end dot. Requires right contentInset or SVG clips half the circle. */
  const EndDot = ({ x, y }: Partial<TooltipProps>) => {
    if (!chartHasData || x === undefined || y === undefined) {
      return null;
    }
    const lastIdx = priceList.length - 1;
    const lastY = priceList[lastIdx];
    const cx = isTimeBased ? x(Number(prices[lastIdx]?.[0])) : x(lastIdx);
    const cy = y(lastY);
    if (
      typeof cx !== 'number' ||
      typeof cy !== 'number' ||
      Number.isNaN(cx) ||
      Number.isNaN(cy)
    ) {
      return null;
    }
    return (
      <Circle
        key="end-dot"
        testID="price-chart-end-dot"
        cx={cx}
        cy={cy}
        r={endDotRadius}
        fill={chartColor}
        stroke={theme.colors.background.default}
        strokeWidth={Math.max(1.5, apx(2))}
      />
    );
  };

  /**
   * Loading overlay component.
   * Note: We render this conditionally in the return statement rather than early-returning
   * to work around an Android bug where charts wouldn't render until screen interaction.
   * @see https://github.com/MetaMask/metamask-mobile/issues/20854
   */
  const LoadingOverlay = () => (
    <Box twClassName="justify-center items-center" testID="price-chart-loading">
      <SkeletonPlaceholder
        backgroundColor={theme.colors.background.section}
        highlightColor={theme.colors.background.subsection}
      >
        <SkeletonPlaceholder.Item
          width={
            chartRowWidth > 0
              ? chartRowWidth
              : Dimensions.get('window').width - 32
          }
          height={chartHeight}
          borderRadius={6}
        ></SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </Box>
  );

  return (
    <View
      style={styles.chart}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) {
          setChartRowWidth(w);
        }
      }}
    >
      <View
        style={styles.chartAreaWrapper}
        testID={chartHasData ? 'price-chart-area' : undefined}
        {...(chartHasData ? panResponder.current.panHandlers : {})}
      >
        {chartHasData ? (
          <AreaChart
            style={styles.chartArea}
            data={prices}
            yAccessor={({ item }: { item: TokenPrice; index: number }) =>
              item[1]
            }
            xAccessor={
              isTimeBased
                ? ({ item }: { item: TokenPrice; index: number }) =>
                    Number(item[0])
                : ({ index }: { item: TokenPrice; index: number }) => index
            }
            contentInset={{
              top: apx(40),
              bottom: apx(40),
              right: endDotInsetRight,
            }}
            svg={!isLoading ? { fill: 'none' } : undefined}
            yMin={isStablecoin ? yMin : undefined}
            yMax={isStablecoin ? yMax : undefined}
            xMin={isTimeBased ? chartXMin : undefined}
            xMax={isTimeBased ? chartXMax : undefined}
          >
            {!isLoading && <Line lineStrokeActive />}
            {!isLoading && <Tooltip />}
            {!isLoading && <EndDot />}
          </AreaChart>
        ) : null}
        {isLoading && (
          <View style={styles.loadingOverlayContainer}>
            <LoadingOverlay />
          </View>
        )}
        {!isLoading && !chartHasData && (
          <View style={styles.noDataOverlayContainer} pointerEvents="box-none">
            <NoDataOverlay
              chartHeight={chartHeight}
              chartPlaceholderFill={theme.colors.border.muted}
              hasInsufficientData={hasInsufficientData}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default PriceChart;
