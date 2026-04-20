/* eslint-disable react/no-unstable-nested-components */
import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  View,
} from 'react-native';
import {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Line as SvgLine,
} from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  CHART_DATA_THRESHOLD,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../Price/tokenOverviewChart.constants';
import styleSheet from './PriceChart.styles';
import { placeholderData } from './utils';
import PriceChartContext from './PriceChart.context';
import NoDataOverlay from '../NoDataOverlay/NoDataOverlay';
import { Box } from '@metamask/design-system-react-native';

interface LineProps {
  line: string;
  lineStrokeActive: boolean;
}

interface TooltipProps {
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: number[];
  width?: number;
  height?: number;
}

/** Design: 16×16 logical px circle (TradingView-style last-point marker). */
const END_DOT_DIAMETER = 16;

interface PriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
  onChartIndexChange: (index: number) => void;
  /** Match token overview AdvancedChart height. */
  chartHeight?: number;
}

const PriceChart = ({
  prices,
  priceDiff,
  isLoading,
  onChartIndexChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
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
    themeAppearance === 'light'
      ? LIGHT_MODE_SUCCESS_GREEN
      : theme.colors.success.default;

  useEffect(() => {
    setPositionX(-1);
  }, [prices]);

  const apx = (size = 0) => {
    const width = Dimensions.get('window').width;
    return (width / 750) * size;
  };

  const priceList = prices.map((_: TokenPrice) => _[1]);

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

  const chartHasData = priceList.length >= CHART_DATA_THRESHOLD;
  const hasInsufficientData =
    priceList.length > 0 && priceList.length < CHART_DATA_THRESHOLD;

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

  const updatePosition = (x: number) => {
    if (x === -1) {
      onActiveIndexChange(-1);
      return;
    }
    const chartWidth =
      chartRowWidth > 0 ? chartRowWidth : Dimensions.get('window').width;
    const xDistance = chartWidth / priceList.length;
    if (x <= 0) {
      x = 0;
    }
    if (x >= chartWidth) {
      x = chartWidth;
    }
    let value = Number((x / xDistance).toFixed(0));
    if (value >= priceList.length - 1) {
      value = priceList.length - 1;
    }
    onActiveIndexChange(value);
  };

  const prevTouch = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // save current touch for the next move
        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
        updatePosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const deltaX = evt.nativeEvent.locationX - prevTouch.current.x;
        const deltaY = evt.nativeEvent.locationY - prevTouch.current.y;
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        setIsChartBeingTouched(isHorizontalSwipe);
        updatePosition(isHorizontalSwipe ? evt.nativeEvent.locationX : -1);

        // save current touch for the next move
        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
      },

      onPanResponderRelease: () => {
        setIsChartBeingTouched(false);
        updatePosition(-1);
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

  const NoDataGradient = () => {
    // gradient with transparent center and grey edges
    const gradient = (
      <Defs key="gradient">
        <LinearGradient id="gradient" x1="0" y1="1" x2="0" y2="0">
          <Stop
            offset="0"
            stopColor={theme.colors.background.default}
            stopOpacity="1"
          />
          <Stop
            offset="0.5"
            stopColor={theme.colors.background.default}
            stopOpacity="0.5"
          />
          <Stop
            offset="1"
            stopColor={theme.colors.background.default}
            stopOpacity="1"
          />
        </LinearGradient>
      </Defs>
    );

    return (
      <G key="no-data-gradient">
        {gradient}
        <Rect
          x="0"
          y="0"
          width={
            chartRowWidth > 0 ? chartRowWidth : Dimensions.get('window').width
          }
          height={chartHeight}
          fill="url(#gradient)"
        />
      </G>
    );
  };

  const Tooltip = ({ x, y, height: svgHeight }: Partial<TooltipProps>) => {
    if (positionX < 0) {
      return null;
    }
    const lineHeight =
      typeof svgHeight === 'number' && svgHeight > 0 ? svgHeight : chartHeight;
    return (
      <G x={x?.(positionX)} key="tooltip">
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

  const endDotRadius = END_DOT_DIAMETER / 2;
  const endDotInsetRight = endDotRadius + 8;

  /** Last-point marker — TradingView-style line end dot. Requires right contentInset or SVG clips half the circle. */
  const EndDot = ({ x, y }: Partial<TooltipProps>) => {
    if (!chartHasData || x === undefined || y === undefined) {
      return null;
    }
    const lastIdx = priceList.length - 1;
    const lastY = priceList[lastIdx];
    const cx = x(lastIdx);
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
        {...panResponder.current.panHandlers}
      >
        {/* Chart is always rendered first (below overlays) to avoid Android rendering bug. See: https://github.com/MetaMask/metamask-mobile/issues/20854 */}
        <AreaChart
          style={styles.chartArea}
          data={chartHasData ? priceList : placeholderData}
          contentInset={{
            top: apx(40),
            bottom: apx(40),
            ...(chartHasData ? { right: endDotInsetRight } : {}),
          }}
          svg={chartHasData && !isLoading ? { fill: 'none' } : undefined}
          yMin={isStablecoin && chartHasData ? yMin : undefined}
          yMax={isStablecoin && chartHasData ? yMax : undefined}
        >
          {!isLoading && <Line lineStrokeActive={chartHasData} />}
          {chartHasData ? null : <NoDataGradient />}
          {chartHasData && !isLoading ? <Tooltip /> : null}
          {chartHasData && !isLoading ? <EndDot /> : null}
        </AreaChart>
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
