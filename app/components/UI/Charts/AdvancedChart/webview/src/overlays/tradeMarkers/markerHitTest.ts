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
import {
  getPlotWidth,
  getVisibleTimeRangeSec,
  priceToY,
  type VisibleTimeRangeSec,
} from '../../core/chartCoordinates';
import { getOhlcvData, getWidget, isChartReady } from '../../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
  TVCrosshairParams,
} from '../../core/types';
import type { TradeMarker } from '../../messages/contract';
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

/**
 * Resolve the price to use for Y-distance calculation for a marker.
 * Returns null when no usable price is available.
 */
function resolveMarkerPrice(
  snapped: { close: number } | null,
  markerPrice: number | undefined | null,
): number | null {
  if (snapped != null) return snapped.close;
  if (markerPrice != null && Number.isFinite(markerPrice)) return markerPrice;
  return null;
}

/**
 * Compute the Y pixel distance between a marker and the tap point.
 * Returns 0 when Y cannot be determined (falls back to X-only matching).
 */
function computeYDistance(
  chart: TVActiveChart,
  offsetY: number | undefined,
  snapped: { timeSec: number; close: number } | null,
  markerPrice: number | undefined | null,
): number {
  if (offsetY == null || !Number.isFinite(offsetY)) return 0;
  const price = resolveMarkerPrice(snapped, markerPrice);
  if (price == null) return 0;
  const markerY = priceToY(chart, price);
  if (markerY == null || !Number.isFinite(markerY)) return 0;
  return markerY - offsetY;
}

interface HitTestContext {
  chart: TVActiveChart;
  range: VisibleTimeRangeSec;
  pxPerSec: number;
  drawn: Map<string, unknown>;
  data: readonly OHLCVBar[];
  timeSec: number;
  offsetY: number | undefined;
}

function computeMarkerDistance(
  ctx: HitTestContext,
  marker: TradeMarker,
): { key: string; dist: number } | null {
  if (marker?.id == null || !Number.isFinite(marker?.time)) return null;
  const markerKey = String(marker.id);
  if (!ctx.drawn.has(markerKey)) return null;
  const snapped = snapMarkerToNearestBar(ctx.data, marker.time);
  const mSec = snapped ? snapped.timeSec : marker.time / 1000;
  if (mSec < ctx.range.lo || mSec > ctx.range.hi) return null;
  const dxPx = (mSec - ctx.timeSec) * ctx.pxPerSec;
  const dyPx = computeYDistance(ctx.chart, ctx.offsetY, snapped, marker.price);
  return { key: markerKey, dist: Math.hypot(dxPx, dyPx) };
}

export function findTradeMarkerIdNearPoint(
  timeSec: number,
  offsetY: number | undefined,
): string | null {
  const markers = getMarkers();
  if (!markers?.length) return null;
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

  const plotW = getPlotWidth(chart);
  if (plotW <= 0) return null;

  const drawn = getShapesByMarkerId();
  if (!drawn.size) return null;

  const ctx: HitTestContext = {
    chart,
    range,
    pxPerSec: plotW / (range.hi - range.lo),
    drawn,
    data: getOhlcvData(),
    timeSec,
    offsetY,
  };

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const marker of markers) {
    const result = computeMarkerDistance(ctx, marker);
    if (result && result.dist < bestDist) {
      bestDist = result.dist;
      bestId = result.key;
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
      if (params?.price === undefined || params?.time === undefined) {
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
