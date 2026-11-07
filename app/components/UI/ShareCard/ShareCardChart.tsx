import React, { useMemo } from 'react';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import type { ShareCardChartModel } from './ShareCard.types';
import type { ShareCardTheme } from './shareCardTheme';
import {
  buildSmoothPath,
  downsampleChart,
  projectChartPoints,
  type ChartPoint,
} from './shareCardChartGeometry';

/** Chart drawing space, in card units (the card is 1080 wide). */
export const SHARE_CARD_CHART_WIDTH = 1000;
export const SHARE_CARD_CHART_HEIGHT = 200;
const PADDING_Y = 32;
const LINE_WIDTH = 8;
const MARKER_RADIUS = 22;
const MARKER_RING = 4;
const GLYPH_LENGTH = 22;
const GLYPH_THICKNESS = 4;

interface MarkerProps {
  point: ChartPoint;
  kind: 'entry' | 'exit';
  theme: ShareCardTheme;
}

/** Round caps add half the thickness at each end, so the stroke is shorter. */
const GLYPH_HALF_STROKE = (GLYPH_LENGTH - GLYPH_THICKNESS) / 2;

const Marker = ({ point, kind, theme }: MarkerProps) => (
  <G transform={`translate(${point.x} ${point.y})`}>
    <Circle
      r={MARKER_RADIUS}
      fill={theme.accent}
      stroke={theme.panel}
      strokeWidth={MARKER_RING}
    />
    <Line
      x1={-GLYPH_HALF_STROKE}
      x2={GLYPH_HALF_STROKE}
      y1={0}
      y2={0}
      stroke={theme.onAccent}
      strokeWidth={GLYPH_THICKNESS}
      strokeLinecap="round"
    />
    {kind === 'entry' ? (
      <Line
        x1={0}
        x2={0}
        y1={-GLYPH_HALF_STROKE}
        y2={GLYPH_HALF_STROKE}
        stroke={theme.onAccent}
        strokeWidth={GLYPH_THICKNESS}
        strokeLinecap="round"
      />
    ) : null}
  </G>
);

export interface ShareCardChartProps {
  chart: ShareCardChartModel;
  theme: ShareCardTheme;
  /** Rendered width in points. Height follows the 5:1 chart ratio. */
  width: number;
  testID?: string;
}

/**
 * Sparkline with a dashed entry level and + / − trade markers. Markers sit on
 * the line, so they share the line's projection rather than their own scale.
 */
const ShareCardChart = ({
  chart,
  theme,
  width,
  testID,
}: ShareCardChartProps) => {
  const { path, entry, exit } = useMemo(() => {
    const sampled = downsampleChart(chart);
    const points = projectChartPoints(sampled.points, {
      width: SHARE_CARD_CHART_WIDTH,
      height: SHARE_CARD_CHART_HEIGHT,
      paddingY: PADDING_Y,
    });
    const pointAt = (index: number | undefined) =>
      index === undefined ? undefined : points[index];
    return {
      path: buildSmoothPath(points),
      entry: pointAt(sampled.entryIndex),
      exit: pointAt(sampled.exitIndex),
    };
  }, [chart]);

  return (
    <Svg
      width={width}
      height={(width * SHARE_CARD_CHART_HEIGHT) / SHARE_CARD_CHART_WIDTH}
      viewBox={`0 0 ${SHARE_CARD_CHART_WIDTH} ${SHARE_CARD_CHART_HEIGHT}`}
      testID={testID}
    >
      {entry ? (
        <Line
          x1={0}
          x2={SHARE_CARD_CHART_WIDTH}
          y1={entry.y}
          y2={entry.y}
          stroke={theme.soft}
          strokeOpacity={0.3}
          strokeWidth={3}
          strokeDasharray="6 8"
        />
      ) : null}
      {path ? (
        <Path
          d={path}
          stroke={theme.accent}
          strokeWidth={LINE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
      {entry ? <Marker point={entry} kind="entry" theme={theme} /> : null}
      {exit ? <Marker point={exit} kind="exit" theme={theme} /> : null}
    </Svg>
  );
};

export default ShareCardChart;
