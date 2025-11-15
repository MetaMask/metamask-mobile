import React from 'react';
import { Line, Text as SvgText, G } from 'react-native-svg';
import { formatTickValue } from '../utils';
import type { Colors } from '../../../../../../util/theme/models';

interface ChartGridProps {
  x?: (value: number) => number;
  y?: (value: number) => number;
  data?: number[];
  ticks?: number[];
  colors: Colors;
  range: number;
}

const ChartGrid: React.FC<ChartGridProps> = ({
  x,
  y,
  data,
  ticks,
  colors,
  range,
}) => {
  if (!x || !y || !data || !ticks) return null;
  const lastIndex = Math.max(data.length - 1, 0);

  return (
    <G>
      {ticks.map((tick: number, index: number) => (
        <Line
          key={`grid-${tick}-${index}`}
          x1={0}
          x2={x(lastIndex)}
          y1={y(tick)}
          y2={y(tick)}
          stroke={colors.border.muted}
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      ))}
      {ticks.map((tick: number, index: number) => (
        <SvgText
          key={`label-${tick}-${index}`}
          x={x(lastIndex) + 4}
          y={y(tick)}
          fontSize="12"
          fill={colors.text.default}
          textAnchor="start"
          alignmentBaseline="middle"
        >
          {formatTickValue(tick, range)}%
        </SvgText>
      ))}
    </G>
  );
};

export default ChartGrid;
