import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  View,
} from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
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

  // Interactive chart state
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const chartWidthRef = React.useRef<number>(0);
  const isHorizontalGestureRef = React.useRef<boolean>(false);

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

  // Handle chart layout to track width
  const handleChartLayout = (event: any) => {
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
        onMoveShouldSetPanResponderCapture: (event, gestureState) => {
          // Only capture (block ScrollView) if movement is more horizontal than vertical
          const { dx, dy } = gestureState;
          const isHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
          isHorizontalGestureRef.current = isHorizontal;
          return isHorizontal;
        },
        
        // Allow ScrollView to take over if user scrolls vertically
        onPanResponderTerminationRequest: (event, gestureState) => {
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

  // Tooltip component for interactive chart
  const Tooltip = ({ x, y, ticks }: any) => {
    if (activeIndex < 0 || !primaryData[activeIndex]) return null;

    const activePoint = primaryData[activeIndex];

    return (
      <G x={x(activeIndex)} key="tooltip">
        {/* Vertical crosshair line */}
        <Line
          y1={ticks[0]}
          y2={ticks[ticks.length - 1]}
          stroke={colors.primary.default}
          strokeWidth={2}
          strokeDasharray={[6, 3]}
        />

        {/* Render circles for all series at active index */}
        {nonEmptySeries.map((series, seriesIndex) => {
          const seriesData = series.data[activeIndex];
          if (!seriesData) return null;

          return (
            <Circle
              key={`circle-${seriesIndex}`}
              cy={y(seriesData.value)}
              r={6}
              stroke={colors.background.default}
              strokeWidth={2}
              fill={series.color}
            />
          );
        })}

        {/* Display tooltip text */}
        <G x={10} y={20}>
          <SvgText
            fill={colors.text.alternative}
            fontSize={12}
            fontWeight="400"
          >
            {activePoint.label}
          </SvgText>
          {nonEmptySeries.map((series, seriesIndex) => {
            const seriesData = series.data[activeIndex];
            if (!seriesData) return null;

            return (
              <SvgText
                key={`text-${seriesIndex}`}
                y={16 + seriesIndex * 16}
                fill={series.color}
                fontSize={14}
                fontWeight="bold"
              >
                {isSingleSeries ? '' : `${series.label}: `}
                {seriesData.value.toFixed(2)}%
              </SvgText>
            );
          })}
        </G>
      </G>
    );
  };

  const renderGraph = () => {
    if (isLoading || !hasData) {
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
    const axisLabels = primaryData.filter(
      (_, index) =>
        index % axisLabelStep === 0 || index === primaryData.length - 1,
    );

    return (
      <Box twClassName="mb-4">
        {isMultipleSeries && (
          <ChartLegend series={nonEmptySeries} range={range} />
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
            <Tooltip />
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
        </View>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4"
        >
          {axisLabels.map((point, index) => (
            <Text
              key={`${point.timestamp}-${index}`}
              color={TextColor.Alternative}
              style={tw.style('text-[11px]')}
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
