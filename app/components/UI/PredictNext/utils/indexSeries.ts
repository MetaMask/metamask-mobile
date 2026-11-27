import type { PredictIndexPoint } from '../contracts/v1/liveData';

/**
 * Most points a window series holds. The snapshot already covers a whole
 * window at one point per 5 seconds (about 180 for 15 minutes), so this is
 * that plus room for a longer window. An older point falls off the front.
 */
export const PREDICT_INDEX_SERIES_MAX_POINTS = 240;

/**
 * Least time between two points of the series. It matches the snapshot's
 * spacing, so history and live points have one density. A tick that arrives
 * sooner still updates the latest value; it just adds no point.
 */
export const PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS = 5000;

export interface IndexSeriesOptions {
  maxPoints?: number;
  minPointGapMs?: number;
}

const timeOf = (point: PredictIndexPoint): number => Date.parse(point.time);

/**
 * Appends `point` to `buffer` in place and keeps the newest `maxPoints`.
 * The buffer stays in strict time order: a point that is not newer than the
 * last one (a late or repeated tick), has an invalid time, or comes inside
 * `minPointGapMs` of the last point is dropped.
 *
 * It does one push, and one splice only when the buffer is over its size, so a
 * tick never rebuilds the series.
 *
 * @returns Whether the buffer changed.
 */
export const appendIndexPoint = (
  buffer: PredictIndexPoint[],
  point: PredictIndexPoint,
  {
    maxPoints = PREDICT_INDEX_SERIES_MAX_POINTS,
    minPointGapMs = PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS,
  }: IndexSeriesOptions = {},
): boolean => {
  const pointTime = timeOf(point);
  if (!Number.isFinite(pointTime)) {
    return false;
  }

  const last = buffer[buffer.length - 1];
  if (last) {
    const gap = pointTime - timeOf(last);
    if (gap <= 0 || gap < minPointGapMs) {
      return false;
    }
  }

  buffer.push(point);
  if (buffer.length > maxPoints) {
    buffer.splice(0, buffer.length - maxPoints);
  }
  return true;
};

/**
 * Builds a new ordered buffer from a snapshot's points. It drops invalid and
 * out-of-order points and keeps the newest `maxPoints`. It does not thin, so
 * the server's spacing stands.
 */
export const toOrderedIndexPoints = (
  points: readonly PredictIndexPoint[],
  { maxPoints = PREDICT_INDEX_SERIES_MAX_POINTS }: IndexSeriesOptions = {},
): PredictIndexPoint[] => {
  const ordered: PredictIndexPoint[] = [];
  let lastTime = -Infinity;

  points.forEach((point) => {
    const pointTime = timeOf(point);
    if (Number.isFinite(pointTime) && pointTime > lastTime) {
      ordered.push(point);
      lastTime = pointTime;
    }
  });

  return ordered.length > maxPoints
    ? ordered.slice(ordered.length - maxPoints)
    : ordered;
};
