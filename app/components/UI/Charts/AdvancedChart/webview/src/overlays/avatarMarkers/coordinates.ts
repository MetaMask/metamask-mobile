// Pixel-coordinate math for the avatar DOM overlay.
//
// The v30.1.0 Advanced Charts API (the version MetaMask loads) exposes no
// public price→pixel converter on the main-source price scale:
// IPriceScaleApi.priceToCoordinate only appears in newer Advanced Charts
// releases (it's documented under /latest/ = v33.x, is absent from the v30.1.0
// changelog, and is not present on the scale object at runtime). So we derive Y
// from the visible price range + pane height — the same technique
// overlays/tradeMarkers/markerHitTest.ts uses. Likewise the time scale only
// exposes coordinateToTime (reverse), so X is derived from bar-index geometry
// (barSpacing/rightOffset) in index.ts. Revisit both if the hosted
// charting_library is upgraded to a version that adds priceToCoordinate.

import { normalizeChartUnixSec } from '../../core/timeUtils';
import type { TVActiveChart } from '../../core/types';

export interface VisibleTimeRangeSec {
  lo: number;
  hi: number;
}

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
 * last *bars* on screen — because we map markers in bar-INDEX space (TradingView
 * lays candles out by index, evenly spaced, ignoring time gaps). Falls back to
 * `getVisibleRange()` (viewport-edge times) when the bars range is unavailable.
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
    // fall through
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
    // ignore
  }
  return 0;
}

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
 * Y pixel (relative to main pane top) for a price. Honors linear/log/inverted
 * price scales. Returns null when the pane/scale/range isn't available.
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
    if (mode === 1 && lo > 0 && hi > 0 && clamped > 0) {
      return logPriceToY(lo, hi, clamped, h, inverted);
    }
    return linearPriceToY(lo, hi, clamped, h, inverted);
  } catch {
    return null;
  }
}
