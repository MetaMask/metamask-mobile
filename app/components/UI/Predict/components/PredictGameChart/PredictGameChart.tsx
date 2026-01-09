import React, { useMemo, useRef, useCallback, useState } from 'react';
import { PanResponder, View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { Circle, G, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import type { Colors } from '../../../../../util/theme/models';
import * as shape from 'd3-shape';

const CHART_HEIGHT = 160;
const CHART_CONTENT_INSET = { top: 20, bottom: 20, left: 0, right: 0 };
const LINE_CURVE = shape.curveMonotoneX;

export interface GameChartSeries {
  label: string;
  color: string;
  data: { timestamp: number; value: number }[];
}

interface PredictGameChartProps {
  data: GameChartSeries[];
  isLoading?: boolean;
}

interface TooltipManualProps {
  activeIndex: number;
  primaryData: { timestamp: number; value: number }[];
  nonEmptySeries: GameChartSeries[];
  colors: Colors;
}

interface TooltipInjectedProps {
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: number[];
}

type TooltipProps = TooltipManualProps & Partial<TooltipInjectedProps>;

const ChartTooltip: React.FC<TooltipProps> = ({
  x,
  y,
  ticks,
  activeIndex,
  primaryData,
  nonEmptySeries,
  colors,
}) => {
  if (!x || !y || !ticks) return null;
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const xPos = x(activeIndex);
  const labelPadding = 6;
  const fontSize = 12;
  const labelHeight = fontSize + labelPadding * 2;
  const labelOffset = 10;

  const maxDataIndex = primaryData.length - 1;
  const isRightSide = activeIndex > maxDataIndex / 2;

  const lineColor = colors.border.muted;

  return (
    <G key="tooltip">
      <Line
        x1={xPos}
        x2={xPos}
        y1={0}
        y2={CHART_HEIGHT}
        stroke={lineColor}
        strokeWidth={2}
      />

      {(() => {
        const labelData = nonEmptySeries
          .map((series, seriesIndex) => {
            const seriesData = series.data[activeIndex];
            if (!seriesData) return null;

            const lineYPos = y(seriesData.value);
            const labelText = `${series.label}: ${seriesData.value.toFixed(0)}%`;
            const textWidth = labelText.length * (fontSize * 0.55);
            const labelWidth = textWidth + labelPadding * 2;

            return {
              series,
              seriesIndex,
              seriesData,
              lineYPos,
              labelText,
              labelWidth,
              adjustedY: lineYPos - labelHeight / 2,
            };
          })
          .filter(Boolean);

        const sortedLabels = [...labelData]
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => a.adjustedY - b.adjustedY);

        const minSpacing = 4;
        for (let i = 1; i < sortedLabels.length; i++) {
          const current = sortedLabels[i];
          const previous = sortedLabels[i - 1];

          if (!current || !previous) continue;

          const overlap =
            previous.adjustedY + labelHeight + minSpacing - current.adjustedY;

          if (overlap > 0) {
            current.adjustedY += overlap;
          }
        }

        sortedLabels.forEach((label) => {
          if (!label) return;
          const original = labelData.find(
            (l) => l?.seriesIndex === label.seriesIndex,
          );
          if (original) {
            original.adjustedY = label.adjustedY;
          }
        });

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

          const labelX = isRightSide
            ? xPos - labelWidth - labelOffset
            : xPos + labelOffset;

          return (
            <G key={`series-${seriesIndex}`}>
              <Circle
                cx={xPos}
                cy={lineYPos}
                r={6}
                stroke={colors.background.default}
                strokeWidth={2}
                fill={series.color}
              />
              <Rect
                x={labelX}
                y={adjustedY}
                width={labelWidth}
                height={labelHeight}
                fill={series.color}
                rx={4}
                ry={4}
              />
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

interface EndpointDotsProps {
  nonEmptySeries: GameChartSeries[];
}

interface EndpointDotsInjectedProps {
  x: (index: number) => number;
  y: (value: number) => number;
}

type EndpointDotsAllProps = EndpointDotsProps &
  Partial<EndpointDotsInjectedProps>;

const EndpointDots: React.FC<EndpointDotsAllProps> = ({
  x,
  y,
  nonEmptySeries,
}) => {
  if (!x || !y) return null;

  return (
    <G>
      {nonEmptySeries.map((series, seriesIndex) => {
        const lastIndex = series.data.length - 1;
        const lastPoint = series.data[lastIndex];
        if (!lastPoint) return null;

        return (
          <Circle
            key={`endpoint-${seriesIndex}`}
            cx={x(lastIndex)}
            cy={y(lastPoint.value)}
            r={6}
            fill={series.color}
          />
        );
      })}
    </G>
  );
};

const PredictGameChart: React.FC<PredictGameChartProps> = ({
  data,
  isLoading = false,
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
      chartMin: minValue - padding,
      chartMax: maxValue + padding,
    };
  }, [hasData, nonEmptySeries]);

  const primarySeries = nonEmptySeries[0] ?? seriesToRender[0];
  const primaryData = primarySeries?.data ?? [];
  const primaryChartData = primaryData.length
    ? primaryData.map((point) => point.value)
    : [0, 0];

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

  if (isLoading || !hasData) {
    return (
      <Box twClassName="flex-1 justify-center">
        <View style={tw.style(`h-[${CHART_HEIGHT}px]`)} />
      </Box>
    );
  }

  const overlaySeries = nonEmptySeries.slice(1);

  return (
    <Box twClassName="flex-1">
      <View
        style={tw.style(`h-[${CHART_HEIGHT}px]`)}
        {...panResponder.panHandlers}
        onLayout={handleChartLayout}
      >
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
          {activeIndex < 0 && <EndpointDots nonEmptySeries={nonEmptySeries} />}
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

        {activeIndex >= 0 && (
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
              colors={colors}
            />
          </LineChart>
        )}
      </View>
    </Box>
  );
};

export default PredictGameChart;
