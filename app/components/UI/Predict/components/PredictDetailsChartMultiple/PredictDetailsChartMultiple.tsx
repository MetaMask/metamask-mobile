import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { curveCatmullRom, area } from 'd3-shape';
import {
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { PredictPriceHistoryInterval } from '../../types';

export interface PredictDetailsChartMultiplePoint {
  timestamp: number;
  value: number;
}

const formatPriceHistoryLabel = (
  timestamp: number,
  interval: PredictPriceHistoryInterval | string,
) => {
  const isMilliseconds = timestamp > 1_000_000_000_000;
  const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);

  switch (interval) {
    case PredictPriceHistoryInterval.ONE_HOUR:
    case PredictPriceHistoryInterval.SIX_HOUR:
    case PredictPriceHistoryInterval.ONE_DAY:
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    case PredictPriceHistoryInterval.ONE_WEEK:
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
      }).format(date);
    case PredictPriceHistoryInterval.ONE_MONTH:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    case PredictPriceHistoryInterval.MAX:
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
      }).format(date);
  }
};

export interface PredictDetailsChartMultipleSeries {
  label: string;
  color: string;
  data: PredictDetailsChartMultiplePoint[];
}

const formatTickValue = (value: number, range: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (range < 1) {
    return value.toFixed(2);
  }

  if (range < 10) {
    return value.toFixed(1);
  }

  return value.toFixed(0);
};

interface PredictDetailsChartMultipleProps {
  data: PredictDetailsChartMultipleSeries[];
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

const DEFAULT_EMPTY_LABEL = '';
const LINE_CURVE = curveCatmullRom.alpha(0.3);
const MAX_SERIES = 3;
const CHART_HEIGHT = 192;
const CHART_CONTENT_INSET = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 32,
};

const PredictDetailsChartMultiple: React.FC<
  PredictDetailsChartMultipleProps
> = ({
  data,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  isLoading = false,
  emptyLabel = DEFAULT_EMPTY_LABEL,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const seriesToRender = React.useMemo(() => data.slice(0, MAX_SERIES), [data]);
  const seriesWithLabels = React.useMemo(
    () =>
      seriesToRender.map((series) => ({
        ...series,
        data: series.data.map((point) => ({
          ...point,
          label: formatPriceHistoryLabel(point.timestamp, selectedTimeframe),
        })),
      })),
    [seriesToRender, selectedTimeframe],
  );

  const nonEmptySeries = seriesWithLabels.filter(
    (series) => series.data.length > 0,
  );
  const hasData = nonEmptySeries.length > 0;
  const chartValues = hasData
    ? nonEmptySeries.flatMap((series) =>
        series.data.map((point) => point.value),
      )
    : [0];
  const minValue = Math.min(...chartValues);
  const maxValue = Math.max(...chartValues);
  const range = maxValue - minValue;
  const padding = range === 0 ? Math.max(maxValue * 0.1, 1) : range * 0.1;
  const chartMin = minValue - padding;
  const chartMax = maxValue + padding;

  const primarySeries = nonEmptySeries[0] ?? seriesWithLabels[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [0];

  const axisLabelSource = primaryData.length
    ? primaryData
    : seriesWithLabels[0]?.data ?? [];

  const Gradient = () => (
    <Defs>
      <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop
          offset="0%"
          stopColor={colors.success.default}
          stopOpacity="0.3"
        />
        <Stop
          offset="100%"
          stopColor={colors.background.default}
          stopOpacity="0"
        />
      </LinearGradient>
    </Defs>
  );

  const CustomGrid = ({
    x,
    y,
    data: chartData,
    ticks,
  }: {
    x?: (value: number) => number;
    y?: (value: number) => number;
    data?: number[];
    ticks?: number[];
  }) => {
    if (!x || !y || !chartData || !ticks) return null;
    const lastIndex = Math.max(chartData.length - 1, 0);

    return (
      <G>
        {ticks.map((tick: number, index: number) => (
          <Line
            key={`grid-${tick}-${index}`}
            x1={0}
            x2={x(lastIndex)}
            y1={y(tick)}
            y2={y(tick)}
            stroke={colors.border.muted}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        ))}
        {ticks.map((tick: number, index: number) => (
          <SvgText
            key={`label-${tick}-${index}`}
            x={x(lastIndex) + 4}
            y={y(tick)}
            fontSize="12"
            fill={colors.text.default}
            textAnchor="start"
            alignmentBaseline="middle"
          >
            {formatTickValue(tick, range)}%
          </SvgText>
        ))}
      </G>
    );
  };

  const CustomArea = ({
    x,
    y,
    data: chartData,
  }: {
    x?: (value: number) => number;
    y?: (value: number) => number;
    data?: number[];
  }) => {
    if (!x || !y || !chartData) return null;
    const baseline = y(chartMin);
    const areaGenerator = area<number>()
      .x((_: number, index: number) => x(index))
      .y0(() => baseline)
      .y1((value: number) => y(value))
      .curve(LINE_CURVE);

    const areaPath = areaGenerator(chartData) ?? '';

    return (
      <G>
        <Gradient />
        <Path d={areaPath} fill="url(#gradient)" />
      </G>
    );
  };

  const renderTimeframeSelector = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        {timeframes.map((timeframe) => (
          <Pressable
            key={timeframe}
            onPress={() => onTimeframeChange(timeframe)}
            style={({ pressed }) =>
              tw.style(
                'flex-1 py-2 rounded-lg',
                selectedTimeframe === timeframe ? 'bg-muted' : 'bg-default',
                pressed && 'bg-pressed',
              )
            }
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                selectedTimeframe === timeframe
                  ? TextColor.Default
                  : TextColor.Alternative
              }
              style={tw.style('text-center')}
            >
              {timeframe.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );

  const renderLegend = () => {
    if (!seriesWithLabels.length || (!hasData && !isLoading)) {
      return null;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 mb-3 flex-wrap"
      >
        {seriesWithLabels.map((series, index) => {
          const lastPoint = series.data[series.data.length - 1];
          const seriesColor = series.color || colors.success.default;
          const valueLabel = lastPoint
            ? `${formatTickValue(lastPoint.value, range)}%`
            : '\u2014';

          return (
            <Box
              key={`${series.label}-${index}`}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mr-4 mb-2 gap-2"
            >
              <Box
                twClassName="rounded-full w-2 h-2"
                style={{
                  backgroundColor: seriesColor,
                }}
              />
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {`${series.label} ${valueLabel}`}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderGraph = () => {
    if (isLoading || !hasData) {
      const placeholderLabel = isLoading
        ? 'Loading price history...'
        : emptyLabel;
      const placeholderAxisLabel = isLoading ? 'Loading...' : '\u00A0';
      const placeholderLabels = Array.from(
        { length: 4 },
        () => placeholderAxisLabel,
      );

      return (
        <Box twClassName="mb-6">
          {renderLegend()}
          <Box twClassName="h-48 bg-default rounded-lg relative overflow-hidden">
            <LineChart
              style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
              data={[0, 0]}
              svg={{ stroke: colors.border.muted, strokeWidth: 1 }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              numberOfTicks={4}
              curve={LINE_CURVE}
            >
              <CustomGrid />
            </LineChart>
            <Box twClassName="absolute inset-0 items-center justify-center px-4">
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {placeholderLabel}
              </Text>
            </Box>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-4 pt-4 pb-0"
          >
            {placeholderLabels.map((label, index) => (
              <Text
                key={`placeholder-${index}`}
                variant={TextVariant.BodyXS}
                color={TextColor.Alternative}
              >
                {label}
              </Text>
            ))}
          </Box>
        </Box>
      );
    }

    const showArea =
      seriesWithLabels.length === 1 && (primarySeries?.data.length ?? 0) > 0;
    const overlaySeries = seriesWithLabels.filter(
      (series) => series !== primarySeries && series.data.length > 0,
    );
    const axisLabelStep = Math.max(
      1,
      Math.floor(axisLabelSource.length / 4) || 1,
    );
    const axisLabels = axisLabelSource.filter(
      (_, index) =>
        index % axisLabelStep === 0 || index === axisLabelSource.length - 1,
    );

    return (
      <Box twClassName="mb-6">
        {renderLegend()}
        <Box twClassName="h-48 bg-default rounded-lg mb-4 relative overflow-hidden">
          <LineChart
            style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
            data={primaryChartData}
            svg={{
              stroke: primarySeries?.color || colors.success.default,
              strokeWidth: 1,
            }}
            contentInset={CHART_CONTENT_INSET}
            yMin={chartMin}
            yMax={chartMax}
            numberOfTicks={4}
            curve={LINE_CURVE}
          >
            {showArea && <CustomArea />}
            <CustomGrid />
          </LineChart>
          {overlaySeries.map((series, index) => {
            const seriesColor = series.color || colors.success.default;

            return (
              <LineChart
                key={`${series.label}-${index}`}
                style={StyleSheet.absoluteFillObject}
                data={series.data.map((point) => point.value)}
                svg={{ stroke: seriesColor, strokeWidth: 2 }}
                contentInset={CHART_CONTENT_INSET}
                yMin={chartMin}
                yMax={chartMax}
                numberOfTicks={4}
                curve={LINE_CURVE}
              />
            );
          })}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4"
        >
          {axisLabels.map((point, index) => (
            <Text
              key={`${point.timestamp}-${index}`}
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
            >
              {point.label}
            </Text>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {renderGraph()}
      {renderTimeframeSelector()}
    </Box>
  );
};

export default PredictDetailsChartMultiple;
