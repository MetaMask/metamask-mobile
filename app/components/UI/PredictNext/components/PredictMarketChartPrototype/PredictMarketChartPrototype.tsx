import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { area, curveCatmullRom, line } from 'd3-shape';
import { useTheme } from '../../../../../util/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_HEIGHT = 240;
const DEFAULT_LABEL_GUTTER = 116;
const DEFAULT_CONTINUATION_WIDTH = 42;
const PLOT_TOP = 16;
const PLOT_BOTTOM_INSET = 20;
const ENDPOINT_LABEL_GAP = 34;
const ENDPOINT_RADIUS = 10;
const LABEL_BLOCK_HEIGHT = 50;
const MIN_LABEL_SPACING = 54;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
});

export interface PredictMarketChartPoint {
  /** Unix timestamp in milliseconds. */
  time: number;
  /** Normalized probability in the inclusive range [0, 1]. */
  value: number;
}

export interface PredictMarketChartSeries {
  id: string;
  label: string;
  color: string;
  data: readonly PredictMarketChartPoint[];
}

export interface PredictMarketChartTick {
  time: number;
  values: Readonly<Record<string, number>>;
}

export interface PredictMarketChartPrototypeRef {
  /** Adds or replaces one point per supplied series without replacing history. */
  appendTick: (tick: PredictMarketChartTick) => void;
  /** Restores the latest historical snapshot supplied through `series`. */
  reset: () => void;
}

interface PredictMarketChartPrototypeProps {
  /** Historical snapshot. Live ticks can subsequently be appended through the ref. */
  series: readonly PredictMarketChartSeries[];
  live?: boolean;
  height?: number;
  maxPoints?: number;
  labelGutter?: number;
  continuationWidth?: number;
  lineWidth?: number;
  fillOpacity?: number;
  formatValue?: (value: number) => string;
  testID?: string;
}

interface PreparedSeries extends PredictMarketChartSeries {
  linePath: string;
  areaPath: string;
  endpoint: {
    x: number;
    y: number;
    labelY: number;
    value: number;
  };
}

const clampProbability = (value: number) => Math.max(0, Math.min(1, value));

const cloneSeries = (
  series: readonly PredictMarketChartSeries[],
): PredictMarketChartSeries[] =>
  series.map((entry) => ({ ...entry, data: [...entry.data] }));

const getGradientId = (prefix: string, seriesId: string, index: number) =>
  `${prefix}-gradient-${index}-${seriesId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

const separateLabelPositions = (
  positions: readonly number[],
  minY: number,
  maxY: number,
): number[] => {
  if (positions.length < 2) {
    return positions.map((position) =>
      Math.max(minY, Math.min(maxY, position)),
    );
  }

  const order = positions
    .map((position, index) => ({ index, position }))
    .sort((a, b) => a.position - b.position);
  const availableHeight = maxY - minY;
  const spacing = Math.min(
    MIN_LABEL_SPACING,
    availableHeight / Math.max(1, positions.length - 1),
  );
  const adjusted = order.map((entry) => entry.position);

  adjusted[0] = Math.max(minY, adjusted[0]);
  for (let index = 1; index < adjusted.length; index += 1) {
    adjusted[index] = Math.max(adjusted[index], adjusted[index - 1] + spacing);
  }

  if (adjusted[adjusted.length - 1] > maxY) {
    adjusted[adjusted.length - 1] = maxY;
    for (let index = adjusted.length - 2; index >= 0; index -= 1) {
      adjusted[index] = Math.min(
        adjusted[index],
        adjusted[index + 1] - spacing,
      );
    }
  }

  const result = new Array<number>(positions.length);
  order.forEach((entry, index) => {
    result[entry.index] = adjusted[index];
  });
  return result;
};

const PulsingEndpoint = ({
  x,
  y,
  color,
  live,
  index,
}: {
  x: number;
  y: number;
  color: string;
  live: boolean;
  index: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (live) {
      progress.value = withDelay(
        index * 140,
        withRepeat(
          withTiming(1, {
            duration: 1300,
            easing: Easing.out(Easing.cubic),
          }),
          -1,
          false,
        ),
      );
    }

    return () => cancelAnimation(progress);
  }, [index, live, progress]);

  const animatedProps = useAnimatedProps(() => ({
    r: ENDPOINT_RADIUS + progress.value * 13,
    opacity: live ? 0.24 * (1 - progress.value) : 0,
  }));

  return (
    <G>
      <Circle cx={x} cy={y} r={19} fill={color} opacity={0.1} />
      <AnimatedCircle
        animatedProps={animatedProps}
        cx={x}
        cy={y}
        fill={color}
      />
    </G>
  );
};

/**
 * PROTOTYPE: native multi-series probability chart for the Kalshi detail flow.
 * The first point starts outside the viewport so the clipped line reads as a
 * continuation of earlier price history rather than a newly drawn sparkline.
 */
export const PredictMarketChartPrototype = forwardRef<
  PredictMarketChartPrototypeRef,
  PredictMarketChartPrototypeProps
>(
  (
    {
      series,
      live = false,
      height = DEFAULT_HEIGHT,
      maxPoints = 120,
      labelGutter = DEFAULT_LABEL_GUTTER,
      continuationWidth = DEFAULT_CONTINUATION_WIDTH,
      lineWidth = 4,
      fillOpacity = 0.2,
      formatValue = (value) => `${Math.round(value * 100)}%`,
      testID = 'predict-market-chart-prototype',
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const [width, setWidth] = useState(0);
    const [renderedSeries, setRenderedSeries] = useState(() =>
      cloneSeries(series),
    );
    const idPrefix = useId().replace(/:/g, '');

    useEffect(() => {
      setRenderedSeries(cloneSeries(series));
    }, [series]);

    useImperativeHandle(
      ref,
      () => ({
        appendTick: (tick) => {
          if (!Number.isFinite(tick.time)) return;

          setRenderedSeries((currentSeries) =>
            currentSeries.map((entry) => {
              const value = tick.values[entry.id];
              if (!Number.isFinite(value)) return entry;

              const nextPoint = {
                time: tick.time,
                value: clampProbability(value),
              };
              const nextData = entry.data
                .filter((point) => point.time !== tick.time)
                .concat(nextPoint)
                .sort((a, b) => a.time - b.time)
                .slice(-Math.max(2, maxPoints));

              return { ...entry, data: nextData };
            }),
          );
        },
        reset: () => setRenderedSeries(cloneSeries(series)),
      }),
      [maxPoints, series],
    );

    const handleLayout = (event: LayoutChangeEvent) => {
      setWidth(event.nativeEvent.layout.width);
    };

    const preparedSeries = useMemo((): PreparedSeries[] => {
      if (width <= labelGutter) return [];

      const drawableSeries = renderedSeries.filter(
        (entry) => entry.data.length >= 2,
      );
      const allPoints = drawableSeries.flatMap((entry) => entry.data);
      if (allPoints.length === 0) return [];

      const values = allPoints.map((point) => point.value);
      const times = allPoints.map((point) => point.time);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue;
      const valuePadding = Math.max(0.04, valueRange * 0.14);
      const domainMin = Math.max(0, minValue - valuePadding);
      const domainMax = Math.min(1, maxValue + valuePadding);
      const safeValueRange = domainMax - domainMin || 1;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const safeTimeRange = maxTime - minTime || 1;
      const plotRight = width - labelGutter;
      const plotBottom = height - PLOT_BOTTOM_INSET;
      const plotHeight = plotBottom - PLOT_TOP;
      const plotWidth = plotRight + continuationWidth;
      const x = (time: number) =>
        -continuationWidth + ((time - minTime) / safeTimeRange) * plotWidth;
      const y = (value: number) =>
        plotBottom - ((value - domainMin) / safeValueRange) * plotHeight;
      const curve = curveCatmullRom.alpha(0.45);
      const lineGenerator = line<PredictMarketChartPoint>()
        .x((point) => x(point.time))
        .y((point) => y(point.value))
        .curve(curve);
      const areaGenerator = area<PredictMarketChartPoint>()
        .x((point) => x(point.time))
        .y0(plotBottom)
        .y1((point) => y(point.value))
        .curve(curve);
      const endpoints = drawableSeries.map((entry) => {
        const point = entry.data[entry.data.length - 1];
        return { x: x(point.time), y: y(point.value), value: point.value };
      });
      const labelPositions = separateLabelPositions(
        endpoints.map((endpoint) => endpoint.y),
        LABEL_BLOCK_HEIGHT / 2,
        height - LABEL_BLOCK_HEIGHT / 2,
      );

      return drawableSeries.map((entry, index) => ({
        ...entry,
        linePath: lineGenerator([...entry.data]) ?? '',
        areaPath: areaGenerator([...entry.data]) ?? '',
        endpoint: {
          ...endpoints[index],
          labelY: labelPositions[index],
        },
      }));
    }, [continuationWidth, height, labelGutter, renderedSeries, width]);

    const accessibilityLabel = preparedSeries
      .map((entry) => `${entry.label} ${formatValue(entry.endpoint.value)}`)
      .join(', ');
    const plotRight = Math.max(0, width - labelGutter);
    const clipId = `${idPrefix}-plot-clip`;

    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Market probability history. ${accessibilityLabel}`}
        onLayout={handleLayout}
        style={[styles.container, { height }]}
        testID={testID}
      >
        {width > 0 && preparedSeries.length > 0 ? (
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <ClipPath id={clipId}>
                <Rect width={plotRight} height={height} />
              </ClipPath>
              {preparedSeries.map((entry, index) => (
                <LinearGradient
                  key={`gradient-${entry.id}`}
                  id={getGradientId(idPrefix, entry.id, index)}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <Stop
                    offset="0%"
                    stopColor={entry.color}
                    stopOpacity={fillOpacity}
                  />
                  <Stop offset="100%" stopColor={entry.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>

            <G clipPath={`url(#${clipId})`}>
              {preparedSeries.map((entry, index) => (
                <Path
                  key={`area-${entry.id}`}
                  d={entry.areaPath}
                  fill={`url(#${getGradientId(idPrefix, entry.id, index)})`}
                />
              ))}
              {preparedSeries.map((entry) => (
                <Path
                  key={`line-${entry.id}`}
                  d={entry.linePath}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={lineWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </G>

            {preparedSeries.map((entry, index) => {
              const labelX = plotRight + ENDPOINT_LABEL_GAP;
              return (
                <G key={`endpoint-${entry.id}`}>
                  <PulsingEndpoint
                    x={entry.endpoint.x}
                    y={entry.endpoint.y}
                    color={entry.color}
                    live={live}
                    index={index}
                  />
                  <Circle
                    cx={entry.endpoint.x}
                    cy={entry.endpoint.y}
                    r={ENDPOINT_RADIUS}
                    fill={entry.color}
                    stroke={colors.background.default}
                    strokeWidth={3}
                  />
                  <SvgText
                    fill={entry.color}
                    fontSize={16}
                    fontWeight="600"
                    transform={`translate(${labelX} ${entry.endpoint.labelY - 6})`}
                  >
                    {entry.label}
                  </SvgText>
                  <SvgText
                    fill={entry.color}
                    fontSize={32}
                    fontWeight="700"
                    transform={`translate(${labelX} ${entry.endpoint.labelY + 28})`}
                  >
                    {formatValue(entry.endpoint.value)}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    );
  },
);

PredictMarketChartPrototype.displayName = 'PredictMarketChartPrototype';
