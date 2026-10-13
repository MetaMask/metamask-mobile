export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartFrame {
  width: number;
  height: number;
  /** Vertical breathing room so the line and pills never touch the edges. */
  insetTop: number;
  insetBottom: number;
}

export interface ChartScale {
  toX: (index: number) => number;
  toY: (value: number) => number;
  indexAtX: (x: number) => number;
}

/** Headroom above and below the data range, as a share of the range. */
const RANGE_PADDING_RATIO = 0.08;

/**
 * Linear index → x and value → y mapping. The y domain covers the line and
 * every reference level, so an entry far from the current price still lands
 * on the chart instead of off its edge.
 */
export function buildChartScale({
  values,
  extraValues = [],
  frame,
}: {
  values: readonly number[];
  extraValues?: readonly number[];
  frame: ChartFrame;
}): ChartScale | null {
  const count = values.length;
  if (count < 2 || frame.width <= 0 || frame.height <= 0) return null;

  const domain = [...values, ...extraValues].filter(Number.isFinite);
  let min = Math.min(...domain);
  let max = Math.max(...domain);
  if (min === max) {
    const flatPad = Math.abs(min) * 0.01 || 1;
    min -= flatPad;
    max += flatPad;
  }
  const pad = (max - min) * RANGE_PADDING_RATIO;
  min -= pad;
  max += pad;

  const plotHeight = frame.height - frame.insetTop - frame.insetBottom;
  const lastIndex = count - 1;

  return {
    toX: (index) => (index / lastIndex) * frame.width,
    toY: (value) =>
      frame.insetTop + (1 - (value - min) / (max - min)) * plotHeight,
    indexAtX: (x) => {
      const clamped = Math.min(Math.max(x, 0), frame.width);
      return Math.round((clamped / frame.width) * lastIndex);
    },
  };
}

export function buildLinePoints(
  values: readonly number[],
  scale: ChartScale,
): ChartPoint[] {
  return values.map((value, index) => ({
    x: scale.toX(index),
    y: scale.toY(value),
  }));
}

export function buildLinePath(points: readonly ChartPoint[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(' ');
}

/** Exact length of the polyline, which the line-draw dash animation needs. */
export function measurePolylineLength(points: readonly ChartPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return length;
}

/**
 * Centre y for each level's pill. Pills keep their line's y when they fit,
 * and are pushed apart (then pulled back inside the chart) when two levels
 * sit closer than one pill height — e.g. Exit and Current right after a close.
 */
export function layoutLevelPills(
  ys: readonly number[],
  pillHeight: number,
  chartHeight: number,
): number[] {
  const half = pillHeight / 2;
  const order = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y);

  const placed = order.map(({ y }) =>
    Math.min(Math.max(y, half), chartHeight - half),
  );
  for (let i = 1; i < placed.length; i++) {
    placed[i] = Math.max(placed[i], placed[i - 1] + pillHeight);
  }
  const overflow = placed.length
    ? placed[placed.length - 1] - (chartHeight - half)
    : 0;
  if (overflow > 0) {
    for (let i = placed.length - 1; i >= 0; i--) {
      const ceiling =
        i === placed.length - 1
          ? chartHeight - half
          : placed[i + 1] - pillHeight;
      placed[i] = Math.max(Math.min(placed[i], ceiling), half);
    }
  }

  const result = new Array<number>(ys.length);
  order.forEach(({ index }, i) => {
    result[index] = placed[i];
  });
  return result;
}

/** Index of the marker closest to `x` within `threshold`, else `-1`. */
export function findNearestMarkerIndex(
  markerXs: readonly number[],
  x: number,
  threshold: number,
): number {
  let bestIndex = -1;
  let bestDistance = threshold;
  markerXs.forEach((markerX, index) => {
    const distance = Math.abs(markerX - x);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
