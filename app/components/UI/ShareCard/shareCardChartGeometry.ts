import type { ShareCardChartModel } from './ShareCard.types';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartBox {
  width: number;
  height: number;
  /** Vertical space kept free above and below the line for the markers. */
  paddingY: number;
}

/** Enough points for a smooth line at card size without a heavy path. */
export const SHARE_CARD_CHART_MAX_POINTS = 60;

/**
 * Evenly samples a series down to `maxPoints`, keeping the first and last
 * values and remapping marker indices onto the sampled series.
 */
export function downsampleChart(
  chart: ShareCardChartModel,
  maxPoints: number = SHARE_CARD_CHART_MAX_POINTS,
): ShareCardChartModel {
  const { points } = chart;
  if (points.length <= maxPoints || maxPoints < 2) {
    return chart;
  }

  const lastSource = points.length - 1;
  const lastTarget = maxPoints - 1;
  const sampled = Array.from(
    { length: maxPoints },
    (_, index) => points[Math.round((index * lastSource) / lastTarget)],
  );
  const remap = (index: number | undefined) =>
    index === undefined
      ? undefined
      : Math.round(
          (Math.min(Math.max(index, 0), lastSource) * lastTarget) / lastSource,
        );

  return {
    points: sampled,
    entryIndex: remap(chart.entryIndex),
    exitIndex: remap(chart.exitIndex),
  };
}

/** Projects a series into the chart box. A flat series sits in the middle. */
export function projectChartPoints(
  points: number[],
  { width, height, paddingY }: ChartBox,
): ChartPoint[] {
  if (points.length < 2) {
    return [];
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const usableHeight = height - paddingY * 2;
  const step = width / (points.length - 1);

  return points.map((value, index) => ({
    x: index * step,
    y:
      range === 0
        ? height / 2
        : paddingY + (1 - (value - min) / range) * usableHeight,
  }));
}

/**
 * Smooth SVG path through every point using horizontal-tangent cubic segments,
 * which never overshoot the data the way Catmull-Rom curves can.
 */
export function buildSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const format = (value: number) => Number(value.toFixed(2));
  const [first, ...rest] = points;
  let path = `M${format(first.x)} ${format(first.y)}`;
  let previous = first;

  for (const point of rest) {
    const midX = (previous.x + point.x) / 2;
    path += ` C${format(midX)} ${format(previous.y)} ${format(midX)} ${format(
      point.y,
    )} ${format(point.x)} ${format(point.y)}`;
    previous = point;
  }

  return path;
}
