import React from 'react';
import { area } from 'd3-shape';
import { G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { LINE_CURVE } from '../utils';

interface ChartAreaProps {
  x?: (value: number) => number;
  y?: (value: number) => number;
  data?: number[];
  chartMin: number;
  color: string;
  opacity?: number;
}

const ChartArea: React.FC<ChartAreaProps> = ({
  x,
  y,
  data,
  chartMin,
  color,
  opacity = 0.6,
}) => {
  if (!x || !y || !data) return null;

  const baseline = y(chartMin);
  const areaGenerator = area<number>()
    .x((_: number, index: number) => x(index))
    .y0(() => baseline)
    .y1((value: number) => y(value))
    .curve(LINE_CURVE);

  const areaPath = areaGenerator(data) ?? '';

  return (
    <G>
      <Defs>
        <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="45%" stopColor={color} stopOpacity={opacity * 0.4} />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#gradient)" />
    </G>
  );
};

export default ChartArea;
