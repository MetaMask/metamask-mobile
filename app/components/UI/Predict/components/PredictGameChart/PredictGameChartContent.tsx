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

// Replace any non-finite point with `null` so it becomes a single gap (via the
// chart's `.defined` check) instead of injecting a NaN/Infinity coordinate that
// would invalidate the entire SVG path and blank the whole line. Mapping to
// null (rather than filtering) keeps indices aligned with timestamps/activeIndex.
const toRenderable = (values: (number | null)[]): (number | null)[] =>
  values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));

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
    // Filter out any non-finite values before computing the domain. A single
    // NaN/Infinity would otherwise turn Math.min/Math.max into NaN and collapse
    // the y-scale to [NaN, NaN], blanking every line.
    const chartValues = nonEmptySeries
      .flatMap((series) => series.data.map((point) => point.value))
      .filter((value) => Number.isFinite(value));

    if (!hasData || chartValues.length === 0) {
      return { chartMin: 0, chartMax: 100, maxValue: 0 };
    }

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
    ? toRenderable(primaryData.map((point) => point.value))
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

  // The base layer below always draws each series in full color. When the
  // tooltip is active we only need to paint the "future" (>= activeIndex)
  // portion gray on top, so a single inactive helper is enough.
  const getInactiveData = (values: (number | null)[]) =>
    values.map((v, i) => (i >= activeIndex ? v : null));

  const isTooltipActive = activeIndex >= 0;

  return (
    <Box twClassName="w-full" testID={testID}>
      <View
        style={tw.style(`h-[${CHART_HEIGHT}px]`)}
        testID={PREDICT_GAME_CHART_CONTENT_TEST_IDS.SURFACE}
        {...panResponder.panHandlers}
        onLayout={handleChartLayout}
      >
        {/*
         * Base layer: the primary and overlay lines are ALWAYS mounted in the
         * same positions regardless of tooltip state. Activating the tooltip
         * used to swap to a different element tree, which reordered/remounted
         * the overlay charts; on remount `react-native-svg-charts` resets its
         * measured size and draws nothing until the next layout pass, blanking
         * the overlay lines for a frame on every scroll-driven toggle.
         */}
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
          {!isTooltipActive && (
            <EndpointDots
              nonEmptySeries={nonEmptySeries}
              primaryDataLength={primaryData.length}
            />
          )}
        </LineChart>

        {overlaySeries.map((series, index) => (
          <LineChart
            key={`overlay-${index}`}
            style={tw.style('absolute inset-0')}
            data={toRenderable(series.data.map((point) => point.value))}
            svg={{ stroke: series.color, strokeWidth: 2 }}
            contentInset={contentInset}
            yMin={chartMin}
            yMax={chartMax}
            curve={LINE_CURVE}
          />
        ))}

        {/*
         * Tooltip layer: additive only. We paint the "future" portion of each
         * line gray on top of the always-present base lines and render the
         * crosshair. Mounting/unmounting these extra layers never tears down
         * the base lines, so they stay visible while scrubbing.
         *
         * Draw order: the gray overlay segments are rendered after the gray
         * primary segment, so at line crossings in the grayed region the
         * overlays stay visually on top - matching the previous split render.
         */}
        {isTooltipActive && (
          <>
            <LineChart
              style={tw.style('absolute inset-0')}
              data={getInactiveData(primaryChartData)}
              svg={{ stroke: grayColor, strokeWidth: 2 }}
              contentInset={contentInset}
              yMin={chartMin}
              yMax={chartMax}
              curve={LINE_CURVE}
            />

            {overlaySeries.map((series, index) => (
              <LineChart
                key={`overlay-inactive-${index}`}
                style={tw.style('absolute inset-0')}
                data={getInactiveData(
                  toRenderable(series.data.map((point) => point.value)),
                )}
                svg={{ stroke: grayColor, strokeWidth: 2 }}
                contentInset={contentInset}
                yMin={chartMin}
                yMax={chartMax}
                curve={LINE_CURVE}
              />
            ))}

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
