import React, { useId, useMemo, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { area, curveCatmullRom, line } from 'd3-shape';
import { useTheme } from '../../../../../util/theme';
import { roundProbabilityToWhole } from '../../utils/formatProbability';

const DEFAULT_HEIGHT = 240;
const DEFAULT_LABEL_GUTTER = 104;
const DEFAULT_CONTINUATION_WIDTH = 42;
const PLOT_TOP = 12;
const PLOT_BOTTOM_INSET = 12;
const ENDPOINT_LABEL_GAP = 18;
const ENDPOINT_RADIUS = 6;
const LABEL_BLOCK_HEIGHT = 42;
const MIN_LABEL_SPACING = 46;
const LABEL_NAME_BASELINE_OFFSET = -5;
const LABEL_VALUE_BASELINE_OFFSET = 24;
const LABEL_VALUE_BOTTOM_INSET = 10;

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

interface PredictMarketChartProps {
  series: readonly PredictMarketChartSeries[];
  height?: number;
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

const getGradientId = (prefix: string, seriesId: string, index: number) =>
  `${prefix}-gradient-${index}-${seriesId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

const getSharedTimeDomain = (
  series: readonly PredictMarketChartSeries[],
): [number, number] | undefined => {
  const starts = series.map((entry) => entry.data[0]?.time);
  const ends = series.map((entry) => entry.data[entry.data.length - 1]?.time);
  if (starts.some((time) => time === undefined)) return undefined;
  if (ends.some((time) => time === undefined)) return undefined;

  const start = Math.max(...(starts as number[]));
  const end = Math.min(...(ends as number[]));
  return start < end ? [start, end] : undefined;
};

const sampleAtTime = (
  data: readonly PredictMarketChartPoint[],
  time: number,
): number => {
  const exact = data.find((point) => point.time === time);
  if (exact) return exact.value;

  return (
    [...data].reverse().find((point) => point.time < time)?.value ??
    data[0]?.value ??
    0
  );
};

const clipToTimeDomain = (
  data: readonly PredictMarketChartPoint[],
  minTime: number,
  maxTime: number,
): PredictMarketChartPoint[] => [
  { time: minTime, value: sampleAtTime(data, minTime) },
  ...data.filter((point) => point.time > minTime && point.time < maxTime),
  { time: maxTime, value: sampleAtTime(data, maxTime) },
];

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

/**
 * Native multi-series probability chart. Data selection and fetching remain
 * with the caller so the renderer is reusable across Event compositions.
 */
export const PredictMarketChart = ({
  series,
  height = DEFAULT_HEIGHT,
  labelGutter = DEFAULT_LABEL_GUTTER,
  continuationWidth = DEFAULT_CONTINUATION_WIDTH,
  lineWidth = 2,
  fillOpacity = 0.16,
  formatValue = (value) => `${roundProbabilityToWhole(value)}%`,
  testID = 'predict-market-chart',
}: PredictMarketChartProps) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const idPrefix = useId().replace(/:/g, '');
  const labelFontScale = Math.max(1, fontScale);
  const effectiveHeight = height + (labelFontScale - 1) * LABEL_BLOCK_HEIGHT;
  const effectiveLabelGutter =
    labelGutter + (labelFontScale - 1) * ENDPOINT_LABEL_GAP;
  const endpointLabelGap = ENDPOINT_LABEL_GAP * labelFontScale;

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const preparedSeries = useMemo((): PreparedSeries[] => {
    if (width <= effectiveLabelGutter) return [];

    const drawableSeries = series.filter((entry) => entry.data.length >= 2);
    const timeDomain = getSharedTimeDomain(drawableSeries);
    if (!timeDomain) return [];

    const [minTime, maxTime] = timeDomain;
    const safeTimeRange = maxTime - minTime || 1;
    const plotRight = width - effectiveLabelGutter;
    const plotBottom = effectiveHeight - PLOT_BOTTOM_INSET;
    const plotHeight = plotBottom - PLOT_TOP;
    const plotWidth = plotRight + continuationWidth;
    const x = (time: number) =>
      -continuationWidth + ((time - minTime) / safeTimeRange) * plotWidth;
    const y = (value: number) =>
      plotBottom - Math.max(0, Math.min(1, value)) * plotHeight;
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
      const value = sampleAtTime(entry.data, maxTime);
      return { x: x(maxTime), y: y(value), value };
    });
    const labelPositions = separateLabelPositions(
      endpoints.map((endpoint) => endpoint.y),
      (LABEL_BLOCK_HEIGHT * labelFontScale) / 2,
      effectiveHeight -
        (LABEL_VALUE_BASELINE_OFFSET + LABEL_VALUE_BOTTOM_INSET) *
          labelFontScale,
    );

    return drawableSeries.map((entry, index) => {
      const data = clipToTimeDomain(entry.data, minTime, maxTime);
      return {
        ...entry,
        linePath: lineGenerator(data) ?? '',
        areaPath: areaGenerator(data) ?? '',
        endpoint: {
          ...endpoints[index],
          labelY: labelPositions[index],
        },
      };
    });
  }, [
    continuationWidth,
    effectiveHeight,
    effectiveLabelGutter,
    labelFontScale,
    series,
    width,
  ]);

  const accessibilityLabel = preparedSeries
    .map((entry) => `${entry.label} ${formatValue(entry.endpoint.value)}`)
    .join(', ');
  const plotRight = Math.max(0, width - effectiveLabelGutter);
  const clipId = `${idPrefix}-plot-clip`;
  const edgeFadeId = `${idPrefix}-edge-fade`;
  const edgeFadeMaskId = `${idPrefix}-edge-fade-mask`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Market probability history. ${accessibilityLabel}`}
      onLayout={handleLayout}
      style={[styles.container, { height: effectiveHeight }]}
      testID={testID}
    >
      {width > 0 && preparedSeries.length > 0 ? (
        <Svg
          width={width}
          height={effectiveHeight}
          viewBox={`0 0 ${width} ${effectiveHeight}`}
        >
          <Defs>
            <ClipPath id={clipId}>
              <Rect width={plotRight} height={effectiveHeight} />
            </ClipPath>
            <LinearGradient id={edgeFadeId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="white" stopOpacity={0} />
              <Stop offset="14%" stopColor="white" stopOpacity={1} />
              <Stop offset="100%" stopColor="white" stopOpacity={1} />
            </LinearGradient>
            <Mask id={edgeFadeMaskId}>
              <Rect
                width={plotRight}
                height={effectiveHeight}
                fill={`url(#${edgeFadeId})`}
              />
            </Mask>
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

          <G clipPath={`url(#${clipId})`} mask={`url(#${edgeFadeMaskId})`}>
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
                testID={`${testID}-line-${entry.id}`}
              />
            ))}
          </G>

          {preparedSeries.map((entry, index) => {
            const labelX = plotRight + endpointLabelGap;
            return (
              <G key={`endpoint-${entry.id}`}>
                <Circle
                  cx={entry.endpoint.x}
                  cy={entry.endpoint.y}
                  r={ENDPOINT_RADIUS}
                  fill={entry.color}
                  stroke={colors.background.default}
                  strokeWidth={2}
                />
                <SvgText
                  fill={entry.color}
                  fontSize={14 * labelFontScale}
                  fontWeight="600"
                  transform={[
                    { translateX: labelX },
                    {
                      translateY:
                        entry.endpoint.labelY +
                        LABEL_NAME_BASELINE_OFFSET * labelFontScale,
                    },
                  ]}
                >
                  {entry.label}
                </SvgText>
                <SvgText
                  fill={entry.color}
                  fontSize={28 * labelFontScale}
                  fontWeight="700"
                  transform={[
                    { translateX: labelX },
                    {
                      translateY:
                        entry.endpoint.labelY +
                        LABEL_VALUE_BASELINE_OFFSET * labelFontScale,
                    },
                  ]}
                  testID={`${testID}-value-${entry.id}`}
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
};
