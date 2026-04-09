/**
 * Polyline that follows the same rounded-rect border as `buildRoundedRectPath`
 * (stroke-centered). Used so `strokeDashoffset` arc length matches
 * `pointAtLength` for trail-aligned gradients.
 */

const ARC_STEPS = 14;
const MAX_STRAIGHT_STEP = 5;

export interface BorderPolylineSamples {
  xs: readonly number[];
  ys: readonly number[];
  cum: readonly number[];
  n: number;
  perimeter: number;
}

function angleAt(x: number, y: number, cx: number, cy: number): number {
  return Math.atan2(cy - y, x - cx);
}

function pushDistinct(
  pts: { x: number; y: number }[],
  x: number,
  y: number,
): void {
  const last = pts[pts.length - 1];
  if (!last || last.x !== x || last.y !== y) {
    pts.push({ x, y });
  }
}

function lineSample(
  pts: { x: number; y: number }[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(2, Math.ceil(len / MAX_STRAIGHT_STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pushDistinct(pts, x0 + t * (x1 - x0), y0 + t * (y1 - y0));
  }
}

function arcSample(
  pts: { x: number; y: number }[],
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): void {
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const aEnd = a0 + delta;
  for (let i = 1; i <= ARC_STEPS; i++) {
    const t = i / ARC_STEPS;
    const a = a0 + t * (aEnd - a0);
    pushDistinct(pts, cx + r * Math.cos(a), cy - r * Math.sin(a));
  }
}

export function buildRoundedRectBorderPolyline(
  width: number,
  height: number,
  r: number,
  strokeWidth: number,
): BorderPolylineSamples {
  const hw = strokeWidth / 2;
  const er = Math.max(r - hw, 1e-6);

  const yBottom = height - hw - er;
  const yTop = hw + er;
  const xLeft = hw;
  const xRight = width - hw;
  const yTopLine = hw;
  const yBottomLine = height - hw;

  const pts: { x: number; y: number }[] = [];

  pushDistinct(pts, xLeft, yBottom);
  lineSample(pts, xLeft, yBottom, xLeft, yTop);

  const cxTL = hw + er;
  const cyTL = hw + er;
  arcSample(
    pts,
    cxTL,
    cyTL,
    er,
    angleAt(xLeft, yTop, cxTL, cyTL),
    angleAt(xLeft + er, yTopLine, cxTL, cyTL),
  );

  lineSample(pts, xLeft + er, yTopLine, xRight - er, yTopLine);

  const cxTR = width - hw - er;
  const cyTR = hw + er;
  arcSample(
    pts,
    cxTR,
    cyTR,
    er,
    angleAt(xRight - er, yTopLine, cxTR, cyTR),
    angleAt(xRight, yTop, cxTR, cyTR),
  );

  lineSample(pts, xRight, yTop, xRight, yBottomLine - er);

  const cxBR = width - hw - er;
  const cyBR = height - hw - er;
  arcSample(
    pts,
    cxBR,
    cyBR,
    er,
    angleAt(xRight, yBottomLine - er, cxBR, cyBR),
    angleAt(xRight - er, yBottomLine, cxBR, cyBR),
  );

  lineSample(pts, xRight - er, yBottomLine, xLeft + er, yBottomLine);

  const cxBL = hw + er;
  const cyBL = height - hw - er;
  arcSample(
    pts,
    cxBL,
    cyBL,
    er,
    angleAt(xLeft + er, yBottomLine, cxBL, cyBL),
    angleAt(xLeft, yBottomLine - er, cxBL, cyBL),
  );

  lineSample(pts, xLeft, yBottomLine - er, xLeft, yBottom);

  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    pushDistinct(pts, first.x, first.y);
  }

  const n = pts.length;
  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  const cum = new Array<number>(n);
  cum[0] = 0;
  xs[0] = pts[0].x;
  ys[0] = pts[0].y;
  let acc = 0;
  for (let i = 1; i < n; i++) {
    xs[i] = pts[i].x;
    ys[i] = pts[i].y;
    acc += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    cum[i] = acc;
  }

  return {
    xs,
    ys,
    cum,
    n,
    perimeter: acc,
  };
}

/**
 * Open `d` (no `Z`), matching the legacy arc path: dash phase starts at the
 * first vertex; closing duplicate vertex omitted to avoid a zero-length
 * segment.
 */
export function buildOpenBorderPathD(poly: BorderPolylineSamples): string {
  const { xs, ys, n } = poly;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const dupClose = i === n - 1 && xs[i] === xs[0] && ys[i] === ys[0];
    if (dupClose) {
      break;
    }
    d += ` L ${xs[i]} ${ys[i]}`;
  }
  return d;
}

export function pointAtLengthOnBorderPolyline(
  s: number,
  xs: number[],
  ys: number[],
  cum: number[],
  n: number,
  P: number,
): { x: number; y: number } {
  'worklet';
  let u = s;
  while (u > P) u -= P;
  while (u < 0) u += P;
  if (n < 2) {
    return { x: xs[0], y: ys[0] };
  }
  if (u <= 0) {
    return { x: xs[0], y: ys[0] };
  }
  if (u >= P) {
    return { x: xs[n - 1], y: ys[n - 1] };
  }
  // Binary search — cum[] is monotonically increasing so O(log n) suffices.
  let lo = 0;
  let hi = n - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid + 1] < u) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const c0 = cum[lo];
  const c1 = cum[lo + 1];
  const denom = c1 - c0 || 1;
  const tt = (u - c0) / denom;
  return {
    x: xs[lo] + tt * (xs[lo + 1] - xs[lo]),
    y: ys[lo] + tt * (ys[lo + 1] - ys[lo]),
  };
}
