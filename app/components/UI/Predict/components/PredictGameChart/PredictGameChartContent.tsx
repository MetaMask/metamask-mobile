import React, { useMemo, useRef, useCallback, useState } from 'react';
import { PanResponder, View, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { curveStepAfter } from 'd3-shape';
import { PredictGameChartContentProps } from './PredictGameChart.types';
import TimeframeSelector from './TimeframeSelector';
import ChartTooltip from './ChartTooltip';
import EndpointDots from './EndpointDots';
import { CHART_HEIGHT } from './PredictGameChart.constants';

const CHART_CONTENT_INSET = { top: 30, bottom: 20, left: 10, right: 80 };
const LINE_CURVE = curveStepAfter;

const PredictGameChartContent: React.FC<PredictGameChartContentProps> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
  timeframe = 'live',
  onTimeframeChange,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const chartWidthRef = useRef<number>(0);

  const seriesToRender = useMemo(() => data.slice(0, 2), [data]);
  const nonEmptySeries = useMemo(
    () => seriesToRender.filter((series) => series.data.length > 0),
    [seriesToRender],
  );
  const hasData = nonEmptySeries.length > 0;

  const { chartMin, chartMax } = useMemo(() => {
    if (!hasData) {
      return { chartMin: 0, chartMax: 100 };
    }

    const chartValues = nonEmptySeries.flatMap((series) =>
      series.data.map((point) => point.value),
    );
    const minValue = Math.min(...chartValues);
    const maxValue = Math.max(...chartValues);
    const range = maxValue - minValue;
    const padding = range === 0 ? Math.max(maxValue * 0.1, 1) : range * 0.1;

    return {
      chartMin: Math.max(0, minValue - padding),
      chartMax: Math.min(100, maxValue + padding),
    };
  }, [hasData, nonEmptySeries]);

  const primarySeries = nonEmptySeries[0] ?? seriesToRender[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [50, 50];

  const handleChartLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      chartWidthRef.current = event.nativeEvent.layout.width;
    },
    [],
  );

  const updatePosition = useCallback(
    (xCoord: number) => {
      if (primaryData.length === 0) return;

      const adjustedX = xCoord - CHART_CONTENT_INSET.left;
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
        },
        onPanResponderTerminationRequest: (_event, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderGrant: (event) => {
          updatePosition(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event, gestureState) => {
          const { dx, dy } = gestureState;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
            setActiveIndex(-1);
          } else {
            updatePosition(event.nativeEvent.locationX);
          }
        },
        onPanResponderRelease: () => {
          setActiveIndex(-1);
        },
        onPanResponderTerminate: () => {
          setActiveIndex(-1);
        },
      }),
    [updatePosition],
  );

  if (isLoading) {
    return (
      <Box twClassName="flex-1" testID={testID}>
        <View
          style={tw.style(
            `h-[${CHART_HEIGHT}px] bg-background-alternative rounded-lg`,
          )}
        />
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
            disabled
          />
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Box twClassName="flex-1 justify-center items-center" testID={testID}>
        <View
          style={tw.style(`h-[${CHART_HEIGHT}px] justify-center items-center`)}
        >
          <Icon
            name={IconName.Warning}
            size={IconSize.Lg}
            color={IconColor.IconMuted}
          />
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2 text-center px-4"
          >
            Unable to load price history
          </Text>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              style={tw.style('mt-3 px-4 py-2 rounded-lg bg-primary-default')}
              testID="retry-button"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryInverse}
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
          />
        )}
      </Box>
    );
  }

  if (!hasData) {
    return (
      <Box twClassName="flex-1 justify-center items-center" testID={testID}>
        <View
          style={tw.style(`h-[${CHART_HEIGHT}px] justify-center items-center`)}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            No price history available
          </Text>
        </View>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
          />
        )}
      </Box>
    );
  }

  const overlaySeries = nonEmptySeries.slice(1);
  const grayColor = colors.text.muted;

  const getActiveData = (values: number[]) =>
    values.map((v, i) => (i <= activeIndex ? v : null));

  const getInactiveData = (values: number[]) =>
    values.map((v, i) => (i >= activeIndex ? v : null));

  const isTooltipActive = activeIndex >= 0;

  return (
    <Box twClassName="flex-1" testID={testID}>
      <View
        style={tw.style(`h-[${CHART_HEIGHT}px]`)}
        {...panResponder.panHandlers}
        onLayout={handleChartLayout}
      >
        {!isTooltipActive ? (
          <>
            <LineChart
              style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
              data={primaryChartData}
              svg={{
                stroke: primarySeries?.color || colors.primary.default,
                strokeWidth: 2,
              }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            >
              <EndpointDots nonEmptySeries={nonEmptySeries} />
            </LineChart>

            {overlaySeries.map((series, index) => (
              <LineChart
                key={`overlay-${index}`}
                style={StyleSheet.absoluteFillObject}
                data={series.data.map((point) => point.value)}
                svg={{ stroke: series.color, strokeWidth: 2 }}
                contentInset={CHART_CONTENT_INSET}
                yMin={chartMin}
                yMax={chartMax}
                curve={LINE_CURVE}
              />
            ))}
          </>
        ) : (
          <>
            <LineChart
              style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
              data={getActiveData(primaryChartData)}
              svg={{
                stroke: primarySeries?.color || colors.primary.default,
                strokeWidth: 2,
              }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            />
            <LineChart
              style={StyleSheet.absoluteFillObject}
              data={getInactiveData(primaryChartData)}
              svg={{ stroke: grayColor, strokeWidth: 2 }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            />

            {overlaySeries.map((series, index) => {
              const seriesValues = series.data.map((point) => point.value);
              return (
                <React.Fragment key={`overlay-split-${index}`}>
                  <LineChart
                    style={StyleSheet.absoluteFillObject}
                    data={getActiveData(seriesValues)}
                    svg={{ stroke: series.color, strokeWidth: 2 }}
                    contentInset={CHART_CONTENT_INSET}
                    yMin={chartMin}
                    yMax={chartMax}
                    curve={LINE_CURVE}
                  />
                  <LineChart
                    style={StyleSheet.absoluteFillObject}
                    data={getInactiveData(seriesValues)}
                    svg={{ stroke: grayColor, strokeWidth: 2 }}
                    contentInset={CHART_CONTENT_INSET}
                    yMin={chartMin}
                    yMax={chartMax}
                    curve={LINE_CURVE}
                  />
                </React.Fragment>
              );
            })}

            <LineChart
              style={StyleSheet.absoluteFillObject}
              data={primaryChartData}
              svg={{ stroke: 'transparent', strokeWidth: 0 }}
              contentInset={CHART_CONTENT_INSET}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            >
              <ChartTooltip
                activeIndex={activeIndex}
                primaryData={primaryData}
                nonEmptySeries={nonEmptySeries}
                chartWidth={chartWidthRef.current}
                contentInset={CHART_CONTENT_INSET}
              />
            </LineChart>
          </>
        )}
      </View>

      {onTimeframeChange && (
        <TimeframeSelector selected={timeframe} onSelect={onTimeframeChange} />
      )}
    </Box>
  );
};

export default PredictGameChartContent;
