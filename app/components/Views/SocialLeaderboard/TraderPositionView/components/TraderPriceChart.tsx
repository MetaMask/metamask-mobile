/* eslint-disable react/no-unstable-nested-components */
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
import type { Trade } from '@metamask/social-controllers';
import { Box } from '@metamask/design-system-react-native';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  CHART_DATA_THRESHOLD,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../../../../UI/AssetOverview/Price/tokenOverviewChart.constants';
import styleSheet from '../../../../UI/AssetOverview/PriceChart/PriceChart.styles';
import PriceChartContext from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';
import NoDataOverlay from '../../../../UI/AssetOverview/NoDataOverlay/NoDataOverlay';
import { mapTradesToMarkers } from '../utils/tradeMarkers';

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

/** Smaller than TRADE_MARKER_RADIUS so the end-dot doesn't look like a trade marker. */
const END_DOT_DIAMETER = 5;
/**
 * Trade marker geometry — the inner colored disk is 16x16 with a 4px ring
 * matching the chart background. SVG strokes are centered on the circumference,
 * so we set r = innerRadius + strokeWidth/2 (8 + 2 = 10) to make the ring
 * sit fully outside the visible inner disk.
 */
const TRADE_MARKER_INNER_RADIUS = 8;
const TRADE_MARKER_BORDER_WIDTH = 4;
const TRADE_MARKER_RADIUS =
  TRADE_MARKER_INNER_RADIUS + TRADE_MARKER_BORDER_WIDTH / 2;

interface TraderPriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
  onChartIndexChange: (index: number) => void;
  /** Trade markers to render as buy/sell dots on the chart line. */
  trades?: readonly Trade[];
  chartHeight?: number;
}

const TraderPriceChart = ({
  prices,
  priceDiff,
  isLoading,
  onChartIndexChange,
  trades,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
}: TraderPriceChartProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const emptyDisplayTrackedRef = useRef(false);
  const { setIsChartBeingTouched } = useContext(PriceChartContext);

  const [positionX, setPositionX] = useState(-1);
  const [chartRowWidth, setChartRowWidth] = useState(0);
  const { styles, theme } = useStyles(styleSheet, { chartHeight });
  const { themeAppearance } = useTheme();
  const chartColor =
    themeAppearance === AppThemeKey.light
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

  const { isStablecoin, yMin, yMax } = useMemo(() => {
    if (priceList.length === 0) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }
    const sortedPrices = [...priceList].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = sortedPrices[0];
    const maxPrice = sortedPrices[sortedPrices.length - 1];
    const isStablecoinPrice = medianPrice >= 0.9 && medianPrice <= 1.1;

    if (!isStablecoinPrice) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }

    const priceRange = maxPrice - minPrice;
    const minRange = medianPrice * 0.02;
    const effectiveRange = Math.max(priceRange, minRange);
    const padding = effectiveRange * 0.2;
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
    if (emptyDisplayTrackedRef.current) return;
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
    let clampedX = x;
    if (clampedX <= 0) clampedX = 0;
    if (clampedX >= chartWidth) clampedX = chartWidth;
    let value = Number((clampedX / xDistance).toFixed(0));
    if (value >= priceList.length - 1) value = priceList.length - 1;
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

  // ── SVG decorators ────────────────────────────────────────────────────────

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
    if (positionX < 0) return null;
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

  // ── Trade markers (computed before EndDot so suppressEndDot is available) ──

  const markers = useMemo(
    () => mapTradesToMarkers(trades, prices),
    [trades, prices],
  );

  // Suppress the end-dot when a trade marker already covers the tail of the
  // chart line (within 2 price indices). This surfaces very-recent trades that
  // would otherwise be hidden behind the end-dot (e.g. same-hour buys/sells on
  // a 1M chart that both map to the last 1-2 data points).
  const suppressEndDot =
    chartHasData && markers.some((m) => priceList.length - 1 - m.index <= 2);

  const EndDot = ({ x, y }: Partial<TooltipProps>) => {
    if (suppressEndDot || x === undefined || y === undefined) return null;
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

  const TradeMarkers = ({ x, y }: Partial<TooltipProps>) => {
    if (
      !chartHasData ||
      x === undefined ||
      y === undefined ||
      markers.length === 0
    ) {
      return null;
    }
    return (
      <G key="trade-markers">
        {markers.map((m) => {
          const cx = x(m.index);
          const cy = y(priceList[m.index]);
          if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
          const isBuy = m.intent === 'enter';
          // Inner disk uses the same green/red as the rest of the UI; the
          // ring matches the chart background so the marker reads as a
          // punched-through dot on the line. background.default adapts to
          // light/dark automatically.
          return (
            <Circle
              key={m.transactionHash}
              testID={`trade-marker-${m.transactionHash}`}
              cx={cx}
              cy={cy}
              r={TRADE_MARKER_RADIUS}
              fill={
                isBuy
                  ? theme.colors.success.default
                  : theme.colors.error.default
              }
              stroke={theme.colors.background.default}
              strokeWidth={TRADE_MARKER_BORDER_WIDTH}
            />
          );
        })}
      </G>
    );
  };

  // ── Loading overlay ───────────────────────────────────────────────────────

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
        />
      </SkeletonPlaceholder>
    </Box>
  );

  return (
    <View
      style={styles.chart}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setChartRowWidth(w);
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
            data={priceList}
            contentInset={{
              top: apx(40),
              bottom: apx(40),
              right: endDotInsetRight,
            }}
            svg={!isLoading ? { fill: 'none' } : undefined}
            yMin={isStablecoin ? yMin : undefined}
            yMax={isStablecoin ? yMax : undefined}
          >
            {!isLoading && <Line lineStrokeActive />}
            {!isLoading && <Tooltip />}
            {!isLoading && <EndDot />}
            {!isLoading && <TradeMarkers />}
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

export default TraderPriceChart;
