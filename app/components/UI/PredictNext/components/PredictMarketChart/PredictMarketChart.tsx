import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  PanResponder,
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
  Line,
  Mask,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { area, curveStepAfter, line } from 'd3-shape';
import I18n from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { useTheme } from '../../../../../util/theme';
import { roundProbabilityToWhole } from '../../utils/formatProbability';

const DEFAULT_HEIGHT = 150;
const DEFAULT_LABEL_GUTTER = 116;
const DEFAULT_CONTINUATION_WIDTH = 0;
const PLOT_TOP = 12;
const PLOT_BOTTOM_INSET = 12;
const ENDPOINT_LABEL_GAP = 18;
const ENDPOINT_RADIUS = 6;
const ENDPOINT_PULSE_RADIUS = ENDPOINT_RADIUS * 3.2;
const ENDPOINT_PULSE_DURATION = 3200;
const ENDPOINT_PULSE_OPACITY = 0.55;
const LABEL_BLOCK_HEIGHT = 42;
const MIN_LABEL_SPACING = 46;
const LABEL_NAME_BASELINE_OFFSET = -5;
const LABEL_VALUE_BASELINE_OFFSET = 24;
const LABEL_VALUE_BOTTOM_INSET = 10;
const SCRUB_TIME_BOTTOM_INSET = 4;
const SCRUB_RIGHT_OPACITY = 0.3;
const VALUE_TICK_COUNT = 5;

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
  formatTime?: (time: number) => string;
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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PulsingEndpointProps {
  x: number;
  y: number;
  color: string;
  backgroundColor: string;
  testID: string;
  active: boolean;
}

const PulsingEndpoint = ({
  x,
  y,
  color,
  backgroundColor,
  testID,
  active,
}: PulsingEndpointProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (active) {
      progress.value = withRepeat(
        withTiming(1, {
          duration: ENDPOINT_PULSE_DURATION,
          easing: Easing.out(Easing.ease),
        }),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      );
    }

    return () => cancelAnimation(progress);
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    opacity:
      progress.value < 0.15
        ? (progress.value / 0.15) * ENDPOINT_PULSE_OPACITY
        : ENDPOINT_PULSE_OPACITY * (1 - (progress.value - 0.15) / 0.85),
    r:
      ENDPOINT_RADIUS +
      progress.value * (ENDPOINT_PULSE_RADIUS - ENDPOINT_RADIUS),
  }));

  return (
    <G>
      {active ? (
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={x}
          cy={y}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          testID={`${testID}-pulse`}
        />
      ) : null}
      <Circle
        cx={x}
        cy={y}
        r={ENDPOINT_RADIUS}
        fill={color}
        stroke={backgroundColor}
        strokeWidth={2}
        testID={testID}
      />
    </G>
  );
};

const getGradientId = (prefix: string, seriesId: string, index: number) =>
  `${prefix}-gradient-${index}-${seriesId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

const getTimeDomain = (
  series: readonly PredictMarketChartSeries[],
): [number, number] | undefined => {
  const starts = series.map((entry) => entry.data[0]?.time);
  const ends = series.map((entry) => entry.data[entry.data.length - 1]?.time);
  if (starts.some((time) => time === undefined)) return undefined;
  if (ends.some((time) => time === undefined)) return undefined;

  const start = Math.min(...(starts as number[]));
  const end = Math.max(...(ends as number[]));
  return start < end ? [start, end] : undefined;
};

const sampleAtTime = (
  data: readonly PredictMarketChartPoint[],
  time: number,
): number | undefined => {
  const exact = data.find((point) => point.time === time);
  if (exact) return exact.value;

  return [...data].reverse().find((point) => point.time < time)?.value;
};

const clipToTimeDomain = (
  data: readonly PredictMarketChartPoint[],
  minTime: number,
  maxTime: number,
): PredictMarketChartPoint[] => {
  const points = data.filter(
    (point) => point.time >= minTime && point.time <= maxTime,
  );
  const startValue = sampleAtTime(data, minTime);
  const endValue = sampleAtTime(data, maxTime);

  if (startValue !== undefined && points[0]?.time !== minTime) {
    points.unshift({ time: minTime, value: startValue });
  }
  if (endValue !== undefined && points[points.length - 1]?.time !== maxTime) {
    points.push({ time: maxTime, value: endValue });
  }

  return points;
};

const getValueDomain = (
  series: readonly PredictMarketChartSeries[],
): [number, number] | undefined => {
  const values = series.flatMap((entry) =>
    entry.data.map((point) => Math.max(0, Math.min(1, point.value))),
  );
  if (values.length === 0) return undefined;

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (minValue >= maxValue) return [minValue, maxValue];

  const targetInteriorSpan =
    (maxValue - minValue) / (VALUE_TICK_COUNT - (VALUE_TICK_COUNT > 3 ? 3 : 2));
  const targetStep = (maxValue - minValue) / (VALUE_TICK_COUNT - 1);
  const maxExponent = Math.floor(Math.log10(targetInteriorSpan));
  const minExponent = Math.max(maxExponent - 3, -10);
  let bestTicks: number[] | undefined;
  let bestIntervalCount = 0;

  for (let exponent = maxExponent; exponent >= minExponent; exponent -= 1) {
    for (const multiple of [10, 5, 2.5, 2]) {
      const increment = multiple * 10 ** exponent;
      let step = Math.floor(targetStep / increment) * increment;

      while (step + increment < targetInteriorSpan) {
        step += increment;
        const tickMin = Math.floor(minValue / step) * step;
        const intervalCount = Math.ceil((maxValue - tickMin) / step);
        if (intervalCount > VALUE_TICK_COUNT - 1) continue;

        const ticks: number[] = [];
        for (let index = 0; index < VALUE_TICK_COUNT; index += 1) {
          ticks.push(tickMin + index * step);
        }
        if (ticks[ticks.length - 1] > 1) continue;
        if (intervalCount === VALUE_TICK_COUNT - 1) {
          return [
            Math.max(0, Math.min(minValue, ticks[0])),
            Math.min(1, Math.max(maxValue, ticks[ticks.length - 1])),
          ];
        }
        if (intervalCount > bestIntervalCount) {
          bestIntervalCount = intervalCount;
          bestTicks = ticks;
        }
      }
    }
  }

  if (!bestTicks) return [minValue, maxValue];
  return [
    Math.max(0, Math.min(minValue, bestTicks[0])),
    Math.min(1, Math.max(maxValue, bestTicks[bestTicks.length - 1])),
  ];
};

const scaleValue = (
  value: number,
  valueDomain: [number, number],
  plotBottom: number,
  plotHeight: number,
  strokeInset: number,
) => {
  const [minValue, maxValue] = valueDomain;
  if (minValue === maxValue) {
    return PLOT_TOP + plotHeight / 2;
  }
  const normalizedValue =
    (Math.max(minValue, Math.min(maxValue, value)) - minValue) /
    (maxValue - minValue);

  return Math.max(
    PLOT_TOP + strokeInset,
    Math.min(
      plotBottom - strokeInset,
      plotBottom - normalizedValue * plotHeight,
    ),
  );
};

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
  formatTime = (time) =>
    getIntlDateTimeFormatter(I18n.locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(time)),
  testID = 'predict-market-chart',
}: PredictMarketChartProps) => {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<{ time: number; x: number }>();
  const idPrefix = useId().replace(/:/g, '');
  const labelFontScale = Math.max(1, fontScale);
  const effectiveHeight = height + (labelFontScale - 1) * LABEL_BLOCK_HEIGHT;
  const effectiveLabelGutter =
    labelGutter + (labelFontScale - 1) * ENDPOINT_LABEL_GAP;
  const endpointLabelGap = ENDPOINT_LABEL_GAP * labelFontScale;

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const drawableSeries = useMemo(
    () => series.filter((entry) => entry.data.length >= 2),
    [series],
  );
  const timeDomain = useMemo(
    () => getTimeDomain(drawableSeries),
    [drawableSeries],
  );
  const valueDomain = useMemo(
    () => getValueDomain(drawableSeries),
    [drawableSeries],
  );
  const updateScrub = useCallback(
    (xCoord: number) => {
      if (!timeDomain || width <= effectiveLabelGutter) return;

      const [minTime, maxTime] = timeDomain;
      const plotRight = width - effectiveLabelGutter;
      const plotWidth = plotRight + continuationWidth;
      const x = Math.max(0, Math.min(plotRight, xCoord));
      const time = Math.max(
        minTime,
        Math.min(
          maxTime,
          minTime + ((x + continuationWidth) / plotWidth) * (maxTime - minTime),
        ),
      );
      setScrub({ time, x });
    },
    [continuationWidth, effectiveLabelGutter, timeDomain, width],
  );
  const clearScrub = useCallback(() => setScrub(undefined), []);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 5,
        onPanResponderTerminationRequest: (_event, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: (event) => {
          updateScrub(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event, gestureState) => {
          if (
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
            Math.abs(gestureState.dy) > 10
          ) {
            clearScrub();
          } else {
            updateScrub(event.nativeEvent.locationX);
          }
        },
        onPanResponderRelease: clearScrub,
        onPanResponderTerminate: clearScrub,
      }),
    [clearScrub, updateScrub],
  );

  const preparedSeries = useMemo((): PreparedSeries[] => {
    if (width <= effectiveLabelGutter) return [];

    if (!timeDomain || !valueDomain) return [];

    const [minTime, maxTime] = timeDomain;
    const safeTimeRange = maxTime - minTime || 1;
    const plotRight = width - effectiveLabelGutter;
    const plotBottom = effectiveHeight - PLOT_BOTTOM_INSET;
    const plotHeight = plotBottom - PLOT_TOP;
    const plotWidth = plotRight + continuationWidth;
    const strokeInset = lineWidth / 2;
    const x = (time: number) =>
      -continuationWidth + ((time - minTime) / safeTimeRange) * plotWidth;
    const y = (value: number) =>
      scaleValue(value, valueDomain, plotBottom, plotHeight, strokeInset);
    const lineGenerator = line<PredictMarketChartPoint>()
      .x((point) => x(point.time))
      .y((point) => y(point.value))
      .curve(curveStepAfter);
    const areaGenerator = area<PredictMarketChartPoint>()
      .x((point) => x(point.time))
      .y0(plotBottom)
      .y1((point) => y(point.value))
      .curve(curveStepAfter);
    const endpoints = drawableSeries.map((entry) => {
      const value =
        sampleAtTime(entry.data, maxTime) ??
        entry.data[entry.data.length - 1].value;
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
    drawableSeries,
    effectiveHeight,
    effectiveLabelGutter,
    labelFontScale,
    lineWidth,
    timeDomain,
    valueDomain,
    width,
  ]);

  const displayedSeries = useMemo((): PreparedSeries[] => {
    if (!scrub) return preparedSeries;

    const plotBottom = effectiveHeight - PLOT_BOTTOM_INSET;
    const plotHeight = plotBottom - PLOT_TOP;
    if (!valueDomain) return preparedSeries;

    const endpoints = preparedSeries.flatMap((entry) => {
      const value = sampleAtTime(entry.data, scrub.time);
      return value === undefined
        ? []
        : [
            {
              entry,
              x: scrub.x,
              y: scaleValue(
                value,
                valueDomain,
                plotBottom,
                plotHeight,
                lineWidth / 2,
              ),
              value,
            },
          ];
    });
    const labelPositions = separateLabelPositions(
      endpoints.map((endpoint) => endpoint.y),
      (LABEL_BLOCK_HEIGHT * labelFontScale) / 2,
      effectiveHeight -
        (LABEL_VALUE_BASELINE_OFFSET + LABEL_VALUE_BOTTOM_INSET) *
          labelFontScale,
    );

    return endpoints.map((endpoint, index) => ({
      ...endpoint.entry,
      endpoint: {
        x: endpoint.x,
        y: endpoint.y,
        value: endpoint.value,
        labelY: labelPositions[index],
      },
    }));
  }, [
    effectiveHeight,
    labelFontScale,
    lineWidth,
    preparedSeries,
    scrub,
    valueDomain,
  ]);

  const accessibilityLabel = displayedSeries
    .map((entry) => `${entry.label} ${formatValue(entry.endpoint.value)}`)
    .join(', ');
  const plotRight = Math.max(0, width - effectiveLabelGutter);
  const clipId = `${idPrefix}-plot-clip`;
  const edgeFadeId = `${idPrefix}-edge-fade`;
  const edgeFadeMaskId = `${idPrefix}-edge-fade-mask`;
  const scrubLeftClipId = `${idPrefix}-scrub-left-clip`;
  const scrubRightClipId = `${idPrefix}-scrub-right-clip`;

  const renderSeries = (
    clipPath?: string,
    opacity?: number,
    groupTestID?: string,
  ) => (
    <G
      clipPath={clipPath ?? `url(#${clipId})`}
      mask={`url(#${edgeFadeMaskId})`}
      opacity={opacity}
      testID={groupTestID}
    >
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
          testID={
            clipPath === undefined ? `${testID}-line-${entry.id}` : undefined
          }
        />
      ))}
    </G>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        scrub
          ? `Market probability history at ${formatTime(scrub.time)}. ${accessibilityLabel}`
          : `Market probability history. ${accessibilityLabel}`
      }
      onLayout={handleLayout}
      style={[styles.container, { height: effectiveHeight }]}
      testID={testID}
      {...panResponder.panHandlers}
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
            {scrub ? (
              <>
                <ClipPath id={scrubLeftClipId}>
                  <Rect width={scrub.x} height={effectiveHeight} />
                </ClipPath>
                <ClipPath id={scrubRightClipId}>
                  <Rect
                    width={Math.max(0, plotRight - scrub.x)}
                    height={effectiveHeight}
                    transform={[{ translateX: scrub.x }]}
                  />
                </ClipPath>
              </>
            ) : null}
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

          {scrub ? (
            <>
              {renderSeries(`url(#${scrubLeftClipId})`)}
              {renderSeries(
                `url(#${scrubRightClipId})`,
                SCRUB_RIGHT_OPACITY,
                `${testID}-scrub-future`,
              )}
            </>
          ) : (
            renderSeries()
          )}

          {scrub ? (
            <G>
              <Line
                x1={scrub.x}
                x2={scrub.x}
                y1={PLOT_TOP}
                y2={effectiveHeight - 28 * labelFontScale}
                stroke={colors.border.muted}
                strokeWidth={1}
              />
              <SvgText
                fill={colors.text.muted}
                fontSize={13 * labelFontScale}
                fontWeight="600"
                textAnchor="middle"
                transform={[
                  { translateX: scrub.x },
                  {
                    translateY:
                      effectiveHeight -
                      SCRUB_TIME_BOTTOM_INSET * labelFontScale,
                  },
                ]}
                testID={`${testID}-scrub-time`}
              >
                {formatTime(scrub.time)}
              </SvgText>
            </G>
          ) : null}

          {displayedSeries.map((entry, index) => {
            const labelX = scrub
              ? Math.min(
                  plotRight + endpointLabelGap,
                  entry.endpoint.x + endpointLabelGap,
                )
              : plotRight + endpointLabelGap;
            return (
              <G key={`endpoint-${entry.id}`}>
                <PulsingEndpoint
                  x={entry.endpoint.x}
                  y={entry.endpoint.y}
                  color={entry.color}
                  backgroundColor={colors.background.default}
                  active={!scrub}
                  testID={`${testID}-endpoint-${entry.id}`}
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
