import React, { useMemo, useRef, useCallback, useState } from 'react';
import { ActivityIndicator, PanResponder, View } from 'react-native';
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
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { curveStepAfter } from 'd3-shape';
import { PredictGameChartContentProps } from './PredictGameChart.types';
import TimeframeSelector from './TimeframeSelector';
import ChartTooltip from './ChartTooltip';
import EndpointDots from './EndpointDots';
import {
  CHART_HEIGHT,
  CHART_WITH_TIMEFRAME_SELECTOR_HEIGHT,
  CHART_INSET_TOP,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  CHART_INSET_RIGHT_MIN,
  getChartRightInset,
} from './PredictGameChart.constants';
import { PREDICT_GAME_CHART_CONTENT_TEST_IDS } from './PredictGameChartContent.testIds';

const LINE_CURVE = curveStepAfter;

const PredictGameChartContent: React.FC<PredictGameChartContentProps> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
  timeframe = 'live',
  onTimeframeChange,
  disabledTimeframeSelector = false,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const chartWidthRef = useRef<number>(0);
  const primaryDataLengthRef = useRef<number>(0);
  const contentInsetRightRef = useRef<number>(CHART_INSET_RIGHT_MIN);
  const loadingContainerMinHeight = onTimeframeChange
    ? CHART_WITH_TIMEFRAME_SELECTOR_HEIGHT
    : CHART_HEIGHT;

  const seriesToRender = data;
  const nonEmptySeries = useMemo(
    () => seriesToRender.filter((series) => series.data.length > 0),
    [seriesToRender],
  );
  const hasData = nonEmptySeries.length > 0;

  const { chartMin, chartMax, maxValue } = useMemo(() => {
    if (!hasData) {
      return { chartMin: 0, chartMax: 100, maxValue: 0 };
    }

    const chartValues = nonEmptySeries.flatMap((series) =>
      series.data.map((point) => point.value),
    );
    const minValue = Math.min(...chartValues);
    const maxChartValue = Math.max(...chartValues);
    const range = maxChartValue - minValue;
    const padding =
      range === 0 ? Math.max(maxChartValue * 0.1, 1) : range * 0.1;

    return {
      chartMin: Math.max(0, minValue - padding),
      chartMax: Math.min(100, maxChartValue + padding),
      maxValue: maxChartValue,
    };
  }, [hasData, nonEmptySeries]);

  // Size the right gutter to the widest label that will render (team name or
  // value) so long names ("UDVARDY") and "100%" are not clipped, while shorter
  // content keeps the gutter tight instead of leaving a large empty gap.
  const contentInset = useMemo(
    () => ({
      top: CHART_INSET_TOP,
      bottom: CHART_INSET_BOTTOM,
      left: CHART_INSET_LEFT,
      right: getChartRightInset(
        nonEmptySeries.map((series) => series.label),
        maxValue,
      ),
    }),
    [nonEmptySeries, maxValue],
  );

  // Keep ref in sync so the stable PanResponder reads the current inset.
  contentInsetRightRef.current = contentInset.right;

  const primarySeries = nonEmptySeries[0] ?? seriesToRender[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [50, 50];

  // Keep ref in sync for stable PanResponder (avoids recreation on data length changes)
  primaryDataLengthRef.current = primaryData.length;

  const handleChartLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      chartWidthRef.current = event.nativeEvent.layout.width;
    },
    [],
  );

  const updatePosition = useCallback((xCoord: number) => {
    const dataLength = primaryDataLengthRef.current;
    if (dataLength === 0) return;

    const adjustedX = xCoord - CHART_INSET_LEFT;
    const chartDataWidth =
      chartWidthRef.current - CHART_INSET_LEFT - contentInsetRightRef.current;

    if (chartDataWidth <= 0) return;

    const index = Math.round((adjustedX / chartDataWidth) * (dataLength - 1));

    const clampedIndex = Math.max(0, Math.min(dataLength - 1, index));
    setActiveIndex(clampedIndex);
  }, []);

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
      <Box
        twClassName="w-full"
        style={{ minHeight: loadingContainerMinHeight }}
        testID={testID}
      >
        <Box
          twClassName={`h-[${CHART_HEIGHT}px] bg-transparent rounded-lg items-center justify-center`}
        >
          <ActivityIndicator color={colors.primary.default} />
        </Box>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
            disabled={disabledTimeframeSelector || isLoading}
          />
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Box twClassName="w-full justify-center items-center" testID={testID}>
        <Box twClassName={`h-[${CHART_HEIGHT}px] justify-center items-center`}>
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
            <Button
              variant={ButtonVariant.Primary}
              onPress={onRetry}
              twClassName="mt-3"
              testID={PREDICT_GAME_CHART_CONTENT_TEST_IDS.RETRY_BUTTON}
            >
              Retry
            </Button>
          )}
        </Box>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
            disabled={disabledTimeframeSelector}
          />
        )}
      </Box>
    );
  }

  if (!hasData) {
    return (
      <Box twClassName="w-full justify-center items-center" testID={testID}>
        <Box twClassName={`h-[${CHART_HEIGHT}px] justify-center items-center`}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            No price history available
          </Text>
        </Box>
        {onTimeframeChange && (
          <TimeframeSelector
            selected={timeframe}
            onSelect={onTimeframeChange}
            disabled={disabledTimeframeSelector}
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
    <Box twClassName="w-full" testID={testID}>
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
              contentInset={contentInset}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            >
              <EndpointDots
                nonEmptySeries={nonEmptySeries}
                primaryDataLength={primaryData.length}
              />
            </LineChart>

            {overlaySeries.map((series, index) => (
              <LineChart
                key={`overlay-${index}`}
                style={tw.style('absolute inset-0')}
                data={series.data.map((point) => point.value)}
                svg={{ stroke: series.color, strokeWidth: 2 }}
                contentInset={contentInset}
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
              contentInset={contentInset}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            />
            <LineChart
              style={tw.style('absolute inset-0')}
              data={getInactiveData(primaryChartData)}
              svg={{ stroke: grayColor, strokeWidth: 2 }}
              contentInset={contentInset}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            />

            {overlaySeries.map((series, index) => {
              const seriesValues = series.data.map((point) => point.value);
              return (
                <React.Fragment key={`overlay-split-${index}`}>
                  <LineChart
                    style={tw.style('absolute inset-0')}
                    data={getActiveData(seriesValues)}
                    svg={{ stroke: series.color, strokeWidth: 2 }}
                    contentInset={contentInset}
                    yMin={chartMin}
                    yMax={chartMax}
                    curve={LINE_CURVE}
                  />
                  <LineChart
                    style={tw.style('absolute inset-0')}
                    data={getInactiveData(seriesValues)}
                    svg={{ stroke: grayColor, strokeWidth: 2 }}
                    contentInset={contentInset}
                    yMin={chartMin}
                    yMax={chartMax}
                    curve={LINE_CURVE}
                  />
                </React.Fragment>
              );
            })}

            <LineChart
              style={tw.style('absolute inset-0')}
              data={primaryChartData}
              svg={{ stroke: 'transparent', strokeWidth: 0 }}
              contentInset={contentInset}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            >
              <ChartTooltip
                activeIndex={activeIndex}
                primaryData={primaryData}
                nonEmptySeries={nonEmptySeries}
                chartWidth={chartWidthRef.current}
                contentInset={contentInset}
              />
            </LineChart>
          </>
        )}
      </View>

      {onTimeframeChange && (
        <TimeframeSelector
          selected={timeframe}
          onSelect={onTimeframeChange}
          disabled={disabledTimeframeSelector}
        />
      )}
    </Box>
  );
};

export default PredictGameChartContent;
