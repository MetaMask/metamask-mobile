import React from 'react';
import { G, Circle, Line } from 'react-native-svg';
import { useTheme } from '../../../../../../../util/theme';

interface TooltipProps {
  dailyAprs: number[];
  currentX: number;
  lineColor?: string;
  circleColor?: string;
  // Props below are passed in implicitly by <AreaChart/> from react-native-svg-charts
  // src: https://github.com/JesperLekland/react-native-svg-charts
  x?: (index: number) => number;
  y?: (value: number) => number;
  ticks?: number[];
}

const Tooltip = ({
  dailyAprs,
  currentX,
  x,
  y,
  lineColor,
  circleColor,
}: TooltipProps) => {
  const { colors } = useTheme();

  const defaultColor = colors.success.default;

  if ((currentX && currentX < 0) || !dailyAprs) return null;

  const selectedDailyApr = dailyAprs[currentX];

  // Prevents <Circle/> crash when attempting to parse small floating point numbers (e.g. 0.0123)
  if (!selectedDailyApr) return null;

  return (
    <G x={x?.(currentX)} key="tooltip">
      <G>
        <Line
          y1={1}
          y2={'100%'}
          stroke={lineColor ?? defaultColor}
          strokeWidth={1}
        />
        <Circle
          cy={y?.(selectedDailyApr)}
          r={5}
          stroke={circleColor ?? defaultColor}
          strokeWidth={1}
          fill={circleColor ?? defaultColor}
        />
      </G>
    </G>
  );
};

export default Tooltip;
