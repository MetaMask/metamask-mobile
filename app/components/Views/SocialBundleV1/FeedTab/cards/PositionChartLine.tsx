import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { PositionChart } from '../mocks/types';

interface PositionChartLineProps {
  chart: PositionChart;
  height?: number;
}

const PADDING_Y = 6;

/**
 * Lightweight price arc used by the big-position cards. Renders the asset's
 * mocked price series as a smooth SVG line with a marker circle where the
 * trader opened the position (`openMarkerIndex`), an end-dot at the latest
 * price, and a dashed baseline at the position-open price so the reader can
 * visually compare current vs. entry. Widths are measured on layout so this
 * can slot into any card width.
 */
const PositionChartLine: React.FC<PositionChartLineProps> = ({
  chart,
  height = 88,
}) => {
  const tw = useTailwind();
  const [width, setWidth] = useState(0);

  const stroke =
    chart.trend === 'up'
      ? tw.color('bg-success-default')
      : tw.color('bg-error-default');

  const usableHeight = height - PADDING_Y * 2;

  const toX = (nx: number) => nx * width;
  const toY = (ny: number) => PADDING_Y + (1 - ny) * usableHeight;

  const path = chart.points
    .map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${toX(p.x).toFixed(2)} ${toY(p.y).toFixed(2)}`;
    })
    .join(' ');

  const lastPoint = chart.points[chart.points.length - 1];
  const openPoint =
    chart.openMarkerIndex != null
      ? chart.points[chart.openMarkerIndex]
      : undefined;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* Dashed baseline at the open price for at-a-glance comparison. */}
          {openPoint ? (
            <Path
              d={`M0 ${toY(openPoint.y)} L${width} ${toY(openPoint.y)}`}
              stroke={tw.color('bg-border-muted')}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ) : null}
          <Path
            d={path}
            stroke={stroke}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Position-open marker (a small ringed dot along the line). */}
          {openPoint ? (
            <Circle
              cx={toX(openPoint.x)}
              cy={toY(openPoint.y)}
              r={5}
              fill={tw.color('bg-background-default')}
              stroke={stroke}
              strokeWidth={2}
            />
          ) : null}
          {/* Current-price end dot. */}
          <Circle
            cx={toX(lastPoint.x)}
            cy={toY(lastPoint.y)}
            r={4}
            fill={stroke}
          />
        </Svg>
      ) : null}
    </View>
  );
};

export default PositionChartLine;
