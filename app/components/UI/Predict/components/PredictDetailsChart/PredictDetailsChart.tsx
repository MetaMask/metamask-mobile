import React from 'react';
import { StyleSheet } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import TimeframeSelector from './components/TimeframeSelector';
import ChartGrid from './components/ChartGrid';
import ChartArea from './components/ChartArea';
import ChartLegend from './components/ChartLegend';
import {
  DEFAULT_EMPTY_LABEL,
  LINE_CURVE,
  CHART_HEIGHT,
  CHART_CONTENT_INSET,
  MAX_SERIES,
  formatPriceHistoryLabel,
} from './utils';

export interface ChartSeries {
  label: string;
  color: string;
  data: { timestamp: number; value: number }[];
}

interface PredictDetailsChartProps {
  data: ChartSeries[];
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

const PredictDetailsChart: React.FC<PredictDetailsChartProps> = ({
  data,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  isLoading = false,
  emptyLabel = DEFAULT_EMPTY_LABEL,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  // Limit to MAX_SERIES
  const seriesToRender = React.useMemo(() => data.slice(0, MAX_SERIES), [data]);
  const isSingleSeries = seriesToRender.length === 1;
  const isMultipleSeries = seriesToRender.length > 1;

  // Process data with labels
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

  // Filter out empty series
  const nonEmptySeries = seriesWithLabels.filter(
    (series) => series.data.length > 0,
  );
  const hasData = nonEmptySeries.length > 0;

  // Calculate chart bounds
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

  // Primary series for chart axis and labels
  const primarySeries = nonEmptySeries[0] ?? seriesWithLabels[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [0, 0];

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
          {isMultipleSeries && (
            <ChartLegend series={seriesWithLabels} range={range} />
          )}
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
              <ChartGrid colors={colors} range={range} />
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

    // Determine if we should show area (only for single series)
    const showArea = isSingleSeries && primaryData.length > 0;

    // Get overlay series (all except the primary)
    const overlaySeries = isMultipleSeries ? nonEmptySeries.slice(1) : [];

    // Calculate axis labels
    const axisLabelStep = Math.max(1, Math.floor(primaryData.length / 4) || 1);
    const axisLabels = primaryData.filter(
      (_, index) =>
        index % axisLabelStep === 0 || index === primaryData.length - 1,
    );

    return (
      <Box twClassName="mb-6">
        {isMultipleSeries && (
          <ChartLegend series={nonEmptySeries} range={range} />
        )}
        <Box twClassName="h-48 bg-default rounded-lg mb-4 relative overflow-hidden">
          <LineChart
            style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
            data={primaryChartData}
            svg={{
              stroke: primarySeries?.color || colors.success.default,
              strokeWidth: isSingleSeries ? 2 : 1,
            }}
            contentInset={CHART_CONTENT_INSET}
            yMin={chartMin}
            yMax={chartMax}
            numberOfTicks={4}
            curve={LINE_CURVE}
          >
            {showArea && (
              <ChartArea
                chartMin={chartMin}
                color={primarySeries?.color || colors.success.default}
                opacity={0.6}
              />
            )}
            <ChartGrid colors={colors} range={range} />
          </LineChart>
          {overlaySeries.map((series, index) => (
            <LineChart
              key={`${series.label}-${index}`}
              style={StyleSheet.absoluteFillObject}
              data={series.data.map((point) => point.value)}
              svg={{ stroke: series.color, strokeWidth: 2 }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              numberOfTicks={4}
              curve={LINE_CURVE}
            />
          ))}
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
      <TimeframeSelector
        timeframes={timeframes}
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={onTimeframeChange}
      />
    </Box>
  );
};

export default PredictDetailsChart;
