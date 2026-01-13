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
  LABEL_HEIGHT,
  MIN_LABEL_GAP,
  DOT_RADIUS,
  DOT_STROKE_WIDTH,
  GLOW_RADIUS,
  GLOW_OPACITY,
  LABEL_TEXT_OFFSET_Y,
  VALUE_TEXT_OFFSET_Y,
  TIMESTAMP_Y,
  CROSSHAIR_START_Y,
  CROSSHAIR_STROKE_WIDTH,
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

  const adjustedLabelYPositions = useMemo(() => {
    if (dotPositions.length < 2) {
      return dotPositions.map((pos) => pos.dotY);
    }

    const [first, second] = dotPositions;
    const gap = Math.abs(first.dotY - second.dotY);

    if (gap >= LABEL_HEIGHT + MIN_LABEL_GAP) {
      return [first.dotY, second.dotY];
    }

    const midPoint = (first.dotY + second.dotY) / 2;
    const offset = (LABEL_HEIGHT + MIN_LABEL_GAP) / 2;

    if (first.dotY < second.dotY) {
      return [midPoint - offset, midPoint + offset];
    }
    return [midPoint + offset, midPoint - offset];
  }, [dotPositions]);

  if (!x || !y) return null;
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const xPos = x(activeIndex);
  const timestamp = primaryData[activeIndex].timestamp;
  const labelStartX = chartWidth - contentInset.right + RIGHT_LABEL_OFFSET;

  return (
    <G>
      <SvgText
        x={xPos}
        y={TIMESTAMP_Y}
        fill={colors.text.alternative}
        fontSize={FONT_SIZE_LABEL}
        fontWeight="400"
        textAnchor="middle"
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
