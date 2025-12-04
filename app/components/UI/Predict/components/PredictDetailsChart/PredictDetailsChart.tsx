import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  View,
} from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';
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
import type { Colors } from '../../../../../util/theme/models';
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
  getTimestampInMs,
} from './utils';

export interface ChartSeries {
  label: string;
  color: string;
  data: { timestamp: number; value: number; label?: string }[];
}

interface PredictDetailsChartProps {
  data: ChartSeries[];
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

interface TooltipManualProps {
  activeIndex: number;
  primaryData: { timestamp: number; value: number; label: string }[];
  nonEmptySeries: ChartSeries[];
  colors: Colors;
}

interface TooltipInjectedProps {
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: number[];
}

type TooltipProps = TooltipManualProps & Partial<TooltipInjectedProps>;

// Tooltip component for interactive chart - defined outside to avoid re-renders
const ChartTooltip: React.FC<TooltipProps> = ({
  x,
  y,
  ticks,
  activeIndex,
  primaryData,
  nonEmptySeries,
  colors,
}) => {
  if (!x || !y || !ticks) return null; // Injected props not yet available
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const activePoint = primaryData[activeIndex];
  const xPos = x(activeIndex);

  // Calculate label dimensions
  const labelPadding = 6;
  const fontSize = 12;
  const labelHeight = fontSize + labelPadding * 2;
  const labelOffset = 10;

  // Determine if we should show labels on the left or right
  // If we're in the right half of the chart, show labels on the left
  const maxDataIndex = primaryData.length - 1;
  const isRightSide = activeIndex > maxDataIndex / 2;

  // Theme-aware colors for crosshair
  const lineColor = colors.border.muted;
  const textColor = colors.text.alternative;

  return (
    <G key="tooltip">
      {/* Top solid line connecting to timestamp */}
      <Line
        x1={xPos}
        x2={xPos}
        y1={0}
        y2={ticks[0]}
        stroke={lineColor}
        strokeWidth={2}
      />

      {/* Main vertical crosshair line through data area */}
      <Line
        x1={xPos}
        x2={xPos}
        y1={ticks[0]}
        y2={ticks[ticks.length - 1]}
        stroke={lineColor}
        strokeWidth={2}
      />

      {/* Bottom line extending to chart bottom */}
      <Line
        x1={xPos}
        x2={xPos}
        y1={ticks[ticks.length - 1]}
        y2={CHART_HEIGHT}
        stroke={lineColor}
        strokeWidth={2}
      />

      {/* Display timestamp at very top - adjust position based on side */}
      <G x={isRightSide ? xPos - 60 : xPos + 10} y={8}>
        <SvgText fill={textColor} fontSize={11} fontWeight="600">
          {activePoint.label}
        </SvgText>
      </G>

      {/* Render circles and labels for each series - positioned at their line points */}
      {(() => {
        const maxLabelChars = 25; // Maximum characters for label title

        // Calculate initial positions for all labels
        const labelData = nonEmptySeries
          .map((series, seriesIndex) => {
            const seriesData = series.data[activeIndex];
            if (!seriesData) return null;

            const lineYPos = y(seriesData.value);
            // Truncate label if too long
            const truncatedLabel =
              series.label.length > maxLabelChars
                ? `${series.label.substring(0, maxLabelChars)}...`
                : series.label;
            const labelText = `${truncatedLabel}: ${seriesData.value.toFixed(2)}%`;
            const textWidth = labelText.length * (fontSize * 0.55);
            const labelWidth = textWidth + labelPadding * 2;

            return {
              series,
              seriesIndex,
              seriesData,
              lineYPos,
              labelText,
              labelWidth,
              truncatedLabel,
              adjustedY: lineYPos - labelHeight / 2, // Initial position
            };
          })
          .filter(Boolean);

        // Sort by Y position to detect collisions
        const sortedLabels = [...labelData]
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => a.adjustedY - b.adjustedY);

        // Adjust positions to prevent overlap
        const minSpacing = 4; // Minimum pixels between labels
        for (let i = 1; i < sortedLabels.length; i++) {
          const current = sortedLabels[i];
          const previous = sortedLabels[i - 1];

          if (!current || !previous) continue;

          const overlap =
            previous.adjustedY + labelHeight + minSpacing - current.adjustedY;

          if (overlap > 0) {
            // Shift current label down
            current.adjustedY += overlap;
          }
        }

        // Apply adjusted positions back to original array
        sortedLabels.forEach((label) => {
          if (!label) return;
          const original = labelData.find(
            (l) => l?.seriesIndex === label.seriesIndex,
          );
          if (original) {
            original.adjustedY = label.adjustedY;
          }
        });

        // Render all labels
        return labelData.map((data) => {
          if (!data) return null;

          const {
            series,
            seriesIndex,
            lineYPos,
            labelText,
            labelWidth,
            adjustedY,
          } = data;

          // Position label based on which side of the chart we're on
          const labelX = isRightSide
            ? xPos - labelWidth - labelOffset // Left side of crosshair
            : xPos + labelOffset; // Right side of crosshair

          return (
            <G key={`series-${seriesIndex}`}>
              {/* Circle on the line */}
              <Circle
                cx={xPos}
                cy={lineYPos}
                r={6}
                stroke={colors.background.default}
                strokeWidth={2}
                fill={series.color}
              />

              {/* Background rectangle with series color */}
              <Rect
                x={labelX}
                y={adjustedY}
                width={labelWidth}
                height={labelHeight}
                fill={series.color}
                rx={4}
                ry={4}
              />

              {/* White text */}
              <SvgText
                x={labelX + labelPadding}
                y={adjustedY + labelHeight / 2 + fontSize / 3}
                fill={colors.background.default}
                fontSize={fontSize}
                fontWeight="600"
              >
                {labelText}
              </SvgText>
            </G>
          );
        });
      })()}
    </G>
  );
};

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

  // Interactive chart state
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const chartWidthRef = React.useRef<number>(0);
  const isHorizontalGestureRef = React.useRef<boolean>(false);

  // Limit to MAX_SERIES
  const seriesToRender = React.useMemo(() => data.slice(0, MAX_SERIES), [data]);
  const isSingleSeries = seriesToRender.length === 1;
  const isMultipleSeries = seriesToRender.length > 1;

  // Process data with labels
  const chartTimeRangeMs = React.useMemo(() => {
    const timestamps = seriesToRender
      .flatMap((series) => series.data)
      .map((point) => getTimestampInMs(point.timestamp));

    if (!timestamps.length) {
      return 0;
    }

    return Math.max(...timestamps) - Math.min(...timestamps);
  }, [seriesToRender]);

  const seriesWithLabels = React.useMemo(
    () =>
      seriesToRender.map((series) => ({
        ...series,
        data: series.data.map((point) => ({
          ...point,
          label: formatPriceHistoryLabel(point.timestamp, selectedTimeframe, {
            timeRangeMs: chartTimeRangeMs,
          }),
        })),
      })),
    [seriesToRender, selectedTimeframe, chartTimeRangeMs],
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

  // Handle chart layout to track width
  const handleChartLayout = (event: {
    nativeEvent: { layout: { width: number } };
  }) => {
    const { width } = event.nativeEvent.layout;
    chartWidthRef.current = width;
  };

  // Update active position based on touch X coordinate
  const updatePosition = React.useCallback(
    (x: number) => {
      if (primaryData.length === 0) return;

      const adjustedX = x - CHART_CONTENT_INSET.left;
      const chartDataWidth =
        chartWidthRef.current -
        CHART_CONTENT_INSET.left -
        CHART_CONTENT_INSET.right;

      if (chartDataWidth <= 0) return;

      const index = Math.round(
        (adjustedX / chartDataWidth) * (primaryData.length - 1),
      );

      const clampedIndex = Math.max(0, Math.min(primaryData.length - 1, index));
      setActiveIndex(clampedIndex);
    },
    [primaryData.length],
  );

  // PanResponder for handling touch gestures
  // Responds to touches but only blocks ScrollView for horizontal gestures
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        // Claim gesture on initial touch
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,

        // Determine if we should keep the gesture based on direction
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          // Only capture (block ScrollView) if movement is more horizontal than vertical
          const { dx, dy } = gestureState;
          const isHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
          isHorizontalGestureRef.current = isHorizontal;
          return isHorizontal;
        },

        // Allow ScrollView to take over if user scrolls vertically
        onPanResponderTerminationRequest: (_event, gestureState) => {
          const { dx, dy } = gestureState;
          const isVertical = Math.abs(dy) > Math.abs(dx);
          return isVertical; // Allow termination for vertical scrolls
        },

        onPanResponderGrant: (event) => {
          isHorizontalGestureRef.current = true; // Assume horizontal initially
          updatePosition(event.nativeEvent.locationX);
        },

        onPanResponderMove: (event, gestureState) => {
          const { dx, dy } = gestureState;
          // Check if gesture is still horizontal
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
            // User is scrolling vertically, stop updating
            isHorizontalGestureRef.current = false;
            setActiveIndex(-1);
          } else {
            // Continue with horizontal interaction
            updatePosition(event.nativeEvent.locationX);
          }
        },

        onPanResponderRelease: () => {
          setActiveIndex(-1);
          isHorizontalGestureRef.current = false;
        },

        onPanResponderTerminate: () => {
          setActiveIndex(-1);
          isHorizontalGestureRef.current = false;
        },
      }),
    [updatePosition],
  );

  const renderGraph = () => {
    if (isLoading || !hasData) {
      return (
        <Box twClassName="mb-6">
          {isMultipleSeries && (
            <ChartLegend
              series={seriesWithLabels}
              range={range}
              activeIndex={-1}
            />
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
              {isLoading ? (
                <ActivityIndicator color={colors.primary.alternative} />
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {emptyLabel}
                </Text>
              )}
            </Box>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-4 pt-4 pb-0 min-h-[31px]"
          />
        </Box>
      );
    }

    // Determine if we should show area (only for single series)
    const showArea = isSingleSeries && primaryData.length > 0;

    // Get overlay series (all except the primary)
    const overlaySeries = isMultipleSeries ? nonEmptySeries.slice(1) : [];

    // Calculate axis labels
    const axisLabelStep = Math.max(1, Math.floor(primaryData.length / 4) || 1);
    const axisLabelEntries = primaryData
      .map((point, index) => ({
        point,
        label: point.label ?? '',
        key: `${point.timestamp}-${index}`,
        index,
      }))
      .filter(
        (entry) =>
          entry.index % axisLabelStep === 0 ||
          entry.index === primaryData.length - 1,
      );

    const dedupedAxisLabels = axisLabelEntries.filter((entry, idx, arr) => {
      if (!entry.label) {
        return true;
      }
      const previous = arr[idx - 1];
      return !previous || previous.label !== entry.label;
    });

    return (
      <Box twClassName="mb-4">
        {isMultipleSeries && (
          <ChartLegend
            series={nonEmptySeries}
            range={range}
            activeIndex={activeIndex}
          />
        )}
        <View
          style={tw.style(
            'h-48 bg-default rounded-lg mb-3 relative overflow-hidden',
          )}
          {...panResponder.panHandlers}
          onLayout={handleChartLayout}
        >
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
          {/* Tooltip overlay - rendered last to appear on top */}
          <LineChart
            style={StyleSheet.absoluteFillObject}
            data={primaryChartData}
            svg={{ stroke: 'transparent', strokeWidth: 0 }}
            contentInset={CHART_CONTENT_INSET}
            yMin={chartMin}
            yMax={chartMax}
            numberOfTicks={4}
            curve={LINE_CURVE}
          >
            <ChartTooltip
              activeIndex={activeIndex}
              primaryData={primaryData}
              nonEmptySeries={nonEmptySeries}
              colors={colors}
            />
          </LineChart>
        </View>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4"
        >
          {dedupedAxisLabels.map(({ label, key }) => (
            <Text
              key={key}
              color={TextColor.Alternative}
              style={tw.style('text-[11px]')}
            >
              {label}
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
