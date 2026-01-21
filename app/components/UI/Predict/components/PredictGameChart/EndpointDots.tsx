import React, { useMemo } from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';
import { EndpointDotsProps } from './PredictGameChart.types';
import {
  LABEL_OFFSET_X,
  FONT_SIZE_LABEL,
  FONT_SIZE_VALUE,
  DOT_RADIUS,
  GLOW_RADIUS,
  GLOW_OPACITY,
  LABEL_TEXT_OFFSET_Y,
  VALUE_TEXT_OFFSET_Y,
  getSeparatedLabelYPositions,
} from './PredictGameChart.constants';

const EndpointDots: React.FC<EndpointDotsProps> = ({
  x,
  y,
  nonEmptySeries,
  primaryDataLength,
}) => {
  const { colors } = useTheme();

  const dotPositions = useMemo(() => {
    if (!x || !y || primaryDataLength === 0) return [];

    // Use primary data's last index for x-positioning so all dots align at the right edge
    // This prevents misalignment when series have different lengths (e.g., during live WebSocket updates)
    const primaryLastIndex = primaryDataLength - 1;
    const dotX = x(primaryLastIndex);

    return nonEmptySeries
      .map((series) => {
        const lastPoint = series.data[series.data.length - 1];
        if (!lastPoint) return null;

        return {
          dotX,
          dotY: y(lastPoint.value),
          value: lastPoint.value,
          color: series.color,
          label: series.label,
        };
      })
      .filter(Boolean) as {
      dotX: number;
      dotY: number;
      value: number;
      color: string;
      label: string;
    }[];
  }, [x, y, nonEmptySeries, primaryDataLength]);

  const adjustedLabelYPositions = useMemo(
    () => getSeparatedLabelYPositions(dotPositions),
    [dotPositions],
  );

  if (!x || !y) return null;

  return (
    <G>
      {dotPositions.map((pos, index) => {
        const labelX = pos.dotX + LABEL_OFFSET_X;
        const labelY = adjustedLabelYPositions[index];

        return (
          <G key={`endpoint-${index}`}>
            <Circle
              cx={pos.dotX}
              cy={pos.dotY}
              r={GLOW_RADIUS}
              fill={pos.color}
              opacity={GLOW_OPACITY}
            />
            <Circle
              cx={pos.dotX}
              cy={pos.dotY}
              r={DOT_RADIUS}
              fill={pos.color}
            />
            <SvgText
              x={labelX}
              y={labelY - LABEL_TEXT_OFFSET_Y}
              fill={colors.text.default}
              fontSize={FONT_SIZE_LABEL}
              fontWeight="500"
            >
              {pos.label.toUpperCase()}
            </SvgText>
            <SvgText
              x={labelX}
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

export default EndpointDots;
