// Shared pixel-coordinate math for DOM overlays and hit-testing drawn on top of
// the TradingView chart (overlays/avatarMarkers, overlays/tradeMarkers).
//
// The v30.x Advanced Charts API (the version MetaMask loads) exposes no public
// price→pixel converter: IPriceScaleApi has getVisiblePriceRange / getMode /
// isInverted but no priceToCoordinate (that only appears in newer releases,
// documented under /latest/). So Y is derived from the visible price range +
// pane height. Likewise ITimeScaleApi only exposes coordinateToTime (pixel →
// time), not the reverse, so callers derive X from bar geometry
// (barSpacing/rightOffset/width).
//
// Keep ALL such math in this file: if the hosted charting_library is upgraded
// to a version with priceToCoordinate, swap the implementation of `priceToY`
// here and every overlay picks it up.

import { normalizeChartUnixSec } from './timeUtils';
import type { TVActiveChart } from './types';

/** TradingView `PriceScaleMode.Log`. */
const PRICE_SCALE_MODE_LOG = 1;

export interface VisibleTimeRangeSec {
  lo: number;
  hi: number;
}

/**
 * Normalizes a TradingView `{ from, to }` range (seconds or ms) into an ordered
 * `{ lo, hi }` pair in seconds. Returns null when either bound is missing or
 * can't be normalized.
 */
function normalizeRange(
  raw: { from?: number; to?: number } | null | undefined,
): VisibleTimeRangeSec | null {
  if (raw?.from === undefined || raw?.to === undefined) return null;
  const from = normalizeChartUnixSec(raw.from);
  const to = normalizeChartUnixSec(raw.to);
  if (from === null || to === null) return null;
  return { lo: Math.min(from, to), hi: Math.max(from, to) };
}

/**
 * Visible time range (seconds). Prefers `getVisibleBarsRange()` — the first and
 * last *bars* on screen — because TradingView lays candles out by index, evenly
 * spaced, ignoring time gaps. Falls back to `getVisibleRange()` (viewport-edge
 * times) when the bars range is unavailable.
 */
export function getVisibleTimeRangeSec(
  chart: TVActiveChart,
): VisibleTimeRangeSec | null {
  try {
    if (typeof chart.getVisibleBarsRange === 'function') {
      const result = normalizeRange(chart.getVisibleBarsRange());
      if (result) return result;
    }
  } catch {
    // fall through to getVisibleRange
  }
  try {
    if (typeof chart.getVisibleRange === 'function') {
      return normalizeRange(chart.getVisibleRange());
    }
  } catch {
    return null;
  }
  return null;
}

/** Plot width in pixels (time-scale width), or 0 when unavailable. */
export function getPlotWidth(chart: TVActiveChart): number {
  try {
    const ts = chart.getTimeScale();
    if (ts && typeof ts.width === 'function') return ts.width();
  } catch {
    // ignore — callers treat 0 as unavailable
  }
  return 0;
}

/** Y for `price` on a linear scale spanning [lo, hi] over `h` pixels. */
function linearPriceToY(
  lo: number,
  hi: number,
  price: number,
  h: number,
  inverted: boolean,
): number {
  if (inverted) return ((price - lo) / (hi - lo)) * h;
  return ((hi - price) / (hi - lo)) * h;
}

/**
 * Y for `price` on a log scale spanning [lo, hi] over `h` pixels. Callers must
 * pass strictly positive lo/hi/price. A degenerate range maps to the middle (or
 * top when inverted).
 */
function logPriceToY(
  lo: number,
  hi: number,
  price: number,
  h: number,
  inverted: boolean,
): number {
  const logLo = Math.log(lo);
  const logHi = Math.log(hi);
  const logP = Math.log(price);
  if (logHi === logLo) return inverted ? 0 : h / 2;
  const t = (logP - logLo) / (logHi - logLo);
  return inverted ? t * h : (1 - t) * h;
}

/**
 * Y pixel (relative to the main pane top) for a price. Honors linear, log and
 * inverted price scales; prices outside the visible range are clamped to its
 * edge. Returns null when the pane / scale / range / height isn't available.
 */
export function priceToY(chart: TVActiveChart, price: number): number | null {
  if (!Number.isFinite(price)) return null;
  if (typeof chart.getPanes !== 'function') return null;
  try {
    const panes = chart.getPanes();
    if (!panes?.length) return null;
    const pane = panes[0];
    const scale = pane.getMainSourcePriceScale();
    if (!scale) return null;
    const range = scale.getVisiblePriceRange();
    if (range?.from === undefined || range?.to === undefined) return null;
    const lo = Math.min(range.from, range.to);
    const hi = Math.max(range.from, range.to);
    const h = pane.getHeight();
    if (!h || h <= 0) return null;
    const clamped = Math.min(hi, Math.max(lo, price));
    const inverted =
      typeof scale.isInverted === 'function' && scale.isInverted();
    const mode = typeof scale.getMode === 'function' ? scale.getMode() : 0;
    if (mode === PRICE_SCALE_MODE_LOG && lo > 0 && hi > 0 && clamped > 0) {
      return logPriceToY(lo, hi, clamped, h, inverted);
    }
    return linearPriceToY(lo, hi, clamped, h, inverted);
  } catch {
    return null;
  }
}
