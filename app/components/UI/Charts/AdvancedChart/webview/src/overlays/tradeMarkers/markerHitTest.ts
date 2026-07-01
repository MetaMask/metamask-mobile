// Marker tap detection — turns a chart press into a TRADE_MARKER_PRESSED
// message so the RN side can scroll the trades list to the pressed trade.
//
// Ported from chartLogic.js:
//   findTradeMarkerIdNearPoint (~lines 3007-3072),
//   crossHairMoved + mouse_up handlers (~lines 5692-5762).
//
// This owns its own crossHairMoved + mouse_up subscriptions rather than
// piggy-backing on interaction/crosshair.ts, so overlays/tradeMarkers
// stays self-contained and interaction/* has no knowledge of the
// overlay's data.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import { getOhlcvData, getWidget, isChartReady } from '../../core/state';
import { normalizeChartUnixSec } from '../../core/timeUtils';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVCrosshairParams,
} from '../../core/types';
import { getMarkers, getShapesByMarkerId } from './state';
import { snapMarkerToNearestBar } from './index';

/** Pixel radius (Euclidean) for matching a tap to a marker. */
const TAP_RADIUS_PX = 26;
/** Max delay between last crosshair point and mouse_up to consider it a tap. */
const TAP_MAX_AGE_MS = 700;

interface LastTapPoint {
  timeSec: number;
  offsetY: number | undefined;
  at: number;
}

let lastTapPoint: LastTapPoint | null = null;

interface VisibleTimeRangeSec {
  lo: number;
  hi: number;
}

function getVisibleTimeRangeSec(
  chart: TVActiveChart,
): VisibleTimeRangeSec | null {
  try {
    if (typeof chart.getVisibleBarsRange === 'function') {
      const br = chart.getVisibleBarsRange();
      if (br && br.from !== undefined && br.to !== undefined) {
        const from = normalizeChartUnixSec(br.from);
        const to = normalizeChartUnixSec(br.to);
        if (from !== null && to !== null) {
          return { lo: Math.min(from, to), hi: Math.max(from, to) };
        }
      }
    }
  } catch {
    // fall through to getVisibleRange
  }
  try {
    if (typeof chart.getVisibleRange === 'function') {
      const vr = chart.getVisibleRange();
      if (vr && vr.from !== undefined && vr.to !== undefined) {
        const from = normalizeChartUnixSec(vr.from);
        const to = normalizeChartUnixSec(vr.to);
        if (from !== null && to !== null) {
          return { lo: Math.min(from, to), hi: Math.max(from, to) };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Y coordinate (main-pane overlay pixels) for a price. Mirrors chartLogic.js
 * `getPriceYForLastCloseOverlay`. Returns null when the pane / scale /
 * range isn't available. Log-scale mode uses log mapping.
 */
function priceToY(chart: TVActiveChart, price: number): number | null {
  if (!Number.isFinite(price)) return null;
  if (typeof chart.getPanes !== 'function') return null;
  try {
    const panes = chart.getPanes();
    if (!panes || !panes.length) return null;
    const pane = panes[0];
    const scale = pane.getMainSourcePriceScale();
    if (!scale) return null;
    const range = scale.getVisiblePriceRange();
    if (!range || range.from === undefined || range.to === undefined) {
      return null;
    }
    const lo = Math.min(range.from, range.to);
    const hi = Math.max(range.from, range.to);
    const h = pane.getHeight();
    if (!h || h <= 0) return null;
    const clamped = Math.min(hi, Math.max(lo, price));
    const inverted =
      typeof scale.isInverted === 'function' && scale.isInverted();
    const mode = typeof scale.getMode === 'function' ? scale.getMode() : 0;
    if (mode === 1 && lo > 0 && hi > 0 && clamped > 0) {
      const logLo = Math.log(lo);
      const logHi = Math.log(hi);
      const logP = Math.log(clamped);
      if (logHi === logLo) return inverted ? 0 : h / 2;
      const t = (logP - logLo) / (logHi - logLo);
      return inverted ? t * h : (1 - t) * h;
    }
    if (inverted) return ((clamped - lo) / (hi - lo)) * h;
    return ((hi - clamped) / (hi - lo)) * h;
  } catch {
    return null;
  }
}

export function findTradeMarkerIdNearPoint(
  timeSec: number,
  offsetY: number | undefined,
): string | null {
  const markers = getMarkers();
  if (!markers || !markers.length) return null;
  const widget = getWidget();
  if (!widget || !isChartReady()) return null;
  if (!Number.isFinite(timeSec)) return null;

  let chart: TVActiveChart;
  try {
    chart = widget.activeChart();
  } catch {
    return null;
  }
  if (!chart) return null;

  const range = getVisibleTimeRangeSec(chart);
  if (!range || range.hi <= range.lo) return null;

  let plotW = 0;
  try {
    const ts = chart.getTimeScale();
    if (ts && typeof ts.width === 'function') plotW = ts.width();
  } catch {
    plotW = 0;
  }
  if (!(plotW > 0)) return null;
  const pxPerSec = plotW / (range.hi - range.lo);

  const drawn = getShapesByMarkerId();
  if (!drawn.size) return null;

  const data = getOhlcvData();
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const marker of markers) {
    if (!marker || marker.id == null || !Number.isFinite(marker.time)) continue;
    const markerKey = String(marker.id);
    // Only match markers that actually have a circle on screen. Off-range
    // markers are tracked but not drawn — a tap where one *would* be must
    // not fire a press for an invisible circle.
    if (!drawn.has(markerKey)) continue;
    const snapped = snapMarkerToNearestBar(data, marker.time);
    const mSec = snapped ? snapped.timeSec : marker.time / 1000;
    if (mSec < range.lo || mSec > range.hi) continue;
    const dxPx = (mSec - timeSec) * pxPerSec;
    let dyPx = 0;
    if (offsetY != null && Number.isFinite(offsetY)) {
      const price =
        snapped != null
          ? snapped.close
          : marker.price != null && Number.isFinite(marker.price)
            ? marker.price
            : null;
      if (price != null) {
        const markerY = priceToY(chart, price);
        if (markerY != null && Number.isFinite(markerY))
          dyPx = markerY - offsetY;
      }
    }
    const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = markerKey;
    }
  }
  return bestDist <= TAP_RADIUS_PX ? bestId : null;
}

/**
 * Subscribes crossHairMoved (to capture the last tap point) and mouse_up
 * (to hit-test and emit TRADE_MARKER_PRESSED). The captured point is
 * consumed on release so a subsequent mouse_up without a fresh crosshair
 * update can't re-fire the same press.
 */
export function attachMarkerHitTest(
  widget: TVChartingLibraryWidget,
  chart: TVActiveChart,
): void {
  try {
    chart.crossHairMoved().subscribe(null, (params: TVCrosshairParams) => {
      if (!params || params.price === undefined || params.time === undefined) {
        return;
      }
      lastTapPoint = {
        timeSec: params.time,
        offsetY: params.offsetY,
        at: Date.now(),
      };
    });
  } catch (error) {
    reportErrorToRN(error);
  }
  try {
    widget.subscribe('mouse_up', () => {
      const tap = lastTapPoint;
      lastTapPoint = null;
      if (!tap) return;
      if (Date.now() - tap.at > TAP_MAX_AGE_MS) return;
      const pressedId = findTradeMarkerIdNearPoint(tap.timeSec, tap.offsetY);
      if (pressedId != null) {
        postToRN('TRADE_MARKER_PRESSED', { id: pressedId });
      }
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}

/** Test-only: forget any captured tap between test cases. */
export function __resetMarkerHitTestForTests(): void {
  lastTapPoint = null;
}
