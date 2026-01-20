import React, { useMemo } from 'react';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import dayjs from 'dayjs';
import { useTheme } from '../../../../../util/theme';
import { ChartTooltipProps } from './PredictGameChart.types';
import {
  CHART_HEIGHT,
  FONT_SIZE_LABEL,
  FONT_SIZE_VALUE,
  RIGHT_LABEL_OFFSET,
  DOT_RADIUS,
  DOT_STROKE_WIDTH,
  GLOW_RADIUS,
  GLOW_OPACITY,
  LABEL_TEXT_OFFSET_Y,
  VALUE_TEXT_OFFSET_Y,
  TIMESTAMP_Y,
  CROSSHAIR_START_Y,
  CROSSHAIR_STROKE_WIDTH,
  TIMESTAMP_TEXT_HALF_WIDTH,
  getSeparatedLabelYPositions,
} from './PredictGameChart.constants';

const formatTimestamp = (timestamp: number): string =>
  dayjs(timestamp).format('MMM D [at] h:mm A');

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  activeIndex,
  primaryData,
  nonEmptySeries,
  chartWidth,
  contentInset,
}) => {
  const { colors } = useTheme();

  const dotPositions = useMemo(() => {
    if (!x || !y) return [];

    return nonEmptySeries
      .map((series) => {
        const seriesData = series.data[activeIndex];
        if (!seriesData) return null;

        return {
          dotY: y(seriesData.value),
          value: seriesData.value,
          color: series.color,
          label: series.label,
        };
      })
      .filter(Boolean) as {
      dotY: number;
      value: number;
      color: string;
      label: string;
    }[];
  }, [x, y, activeIndex, nonEmptySeries]);

  const adjustedLabelYPositions = useMemo(
    () => getSeparatedLabelYPositions(dotPositions),
    [dotPositions],
  );

  if (!x || !y) return null;
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const xPos = x(activeIndex);
  const timestamp = primaryData[activeIndex].timestamp;
  const labelStartX = chartWidth - contentInset.right + RIGHT_LABEL_OFFSET;

  const chartDataRight = chartWidth - contentInset.right;
  const isNearLeftEdge = xPos < contentInset.left + TIMESTAMP_TEXT_HALF_WIDTH;
  const isNearRightEdge = xPos > chartDataRight - TIMESTAMP_TEXT_HALF_WIDTH;

  const timestampAnchor = isNearLeftEdge
    ? 'start'
    : isNearRightEdge
      ? 'end'
      : 'middle';
  const timestampX = isNearLeftEdge
    ? contentInset.left
    : isNearRightEdge
      ? chartDataRight
      : xPos;

  return (
    <G>
      <SvgText
        x={timestampX}
        y={TIMESTAMP_Y}
        fill={colors.text.alternative}
        fontSize={FONT_SIZE_LABEL}
        fontWeight="400"
        textAnchor={timestampAnchor}
      >
        {formatTimestamp(timestamp)}
      </SvgText>

      <Line
        x1={xPos}
        x2={xPos}
        y1={CROSSHAIR_START_Y}
        y2={CHART_HEIGHT - contentInset.bottom}
        stroke={colors.text.alternative}
        strokeWidth={CROSSHAIR_STROKE_WIDTH}
      />

      {dotPositions.map((pos, index) => {
        const labelY = adjustedLabelYPositions[index];

        return (
          <G key={`series-${index}`}>
            <Circle
              cx={xPos}
              cy={pos.dotY}
              r={GLOW_RADIUS}
              fill={pos.color}
              opacity={GLOW_OPACITY}
            />
            <Circle
              cx={xPos}
              cy={pos.dotY}
              r={DOT_RADIUS}
              stroke={colors.background.default}
              strokeWidth={DOT_STROKE_WIDTH}
              fill={pos.color}
            />
            <SvgText
              x={labelStartX}
              y={labelY - LABEL_TEXT_OFFSET_Y}
              fill={colors.text.alternative}
              fontSize={FONT_SIZE_LABEL}
              fontWeight="500"
            >
              {pos.label}
            </SvgText>
            <SvgText
              x={labelStartX}
              y={labelY + VALUE_TEXT_OFFSET_Y}
              fill={colors.text.default}
              fontSize={FONT_SIZE_VALUE}
              fontWeight="700"
            >
              {`${pos.value.toFixed(0)}%`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

export default ChartTooltip;
