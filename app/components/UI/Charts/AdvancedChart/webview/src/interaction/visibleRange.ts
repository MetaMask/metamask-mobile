// Visible-range / bar-spacing → CHART_INTERACTED analytics.
//
// Subscribes to TradingView's barSpacingChanged (zoom) and
// onVisibleRangeChanged (pan), debouncing each by 450ms and skipping pan
// events that fire within 500ms of a zoom (the same finger gesture often
// triggers both).
//
// Ported from chartLogic.js zoom/pan debounce code in onChartReady
// (~lines 5587-5661), trimmed of the legacy `__mmSuppressChartInteractUntil`
// suppression (which gated analytics during OHLCV reloads — we emit
// CHART_LAYOUT_SETTLED on each reload directly, so analytics can ignore
// that gate).

import { postToRN, reportErrorToRN } from '../core/bridge';
import { notifyDataLifecycle } from '../core/dataLifecycle';
import { resolutionToIntervalMs } from '../core/resolution';
import { getCurrentResolution, getWidget, isChartReady } from '../core/state';
import type { TVActiveChart } from '../core/types';

const DEBOUNCE_MS = 450;
const PAN_SKIP_AFTER_ZOOM_MS = 500;
const MIN_VISIBLE_CANDLES = 10;
const MAX_VISIBLE_CANDLES = 250;

interface DebounceState {
  zoomTimer: ReturnType<typeof setTimeout> | null;
  panTimer: ReturnType<typeof setTimeout> | null;
  zoomLastFiredAt: number;
}

const debounce: DebounceState = {
  zoomTimer: null,
  panTimer: null,
  zoomLastFiredAt: 0,
};

let attachedChart: TVActiveChart | null = null;

/**
 * Visible candle count from TradingView's unix-second visible range and the
 * current resolution. Returns undefined when the range or resolution is unusable.
 */
export function computeVisibleCandleCount(
  chart: TVActiveChart,
): number | undefined {
  try {
    const range = chart.getVisibleRange?.();
    if (
      !range ||
      !Number.isFinite(range.from) ||
      !Number.isFinite(range.to) ||
      range.to <= range.from
    ) {
      return undefined;
    }
    const intervalMs = resolutionToIntervalMs(getCurrentResolution());
    if (!intervalMs) {
      return undefined;
    }
    const count = Math.round(((range.to - range.from) * 1000) / intervalMs);
    if (!Number.isFinite(count) || count <= 0) {
      return undefined;
    }
    return Math.min(MAX_VISIBLE_CANDLES, Math.max(MIN_VISIBLE_CANDLES, count));
  } catch {
    return undefined;
  }
}

function fireZoom(): void {
  if (!getWidget() || !isChartReady()) return;
  const candleCount = attachedChart
    ? computeVisibleCandleCount(attachedChart)
    : undefined;
  postToRN('CHART_INTERACTED', {
    interaction_type: 'zoom',
    ...(candleCount !== undefined ? { candleCount } : {}),
  });
  debounce.zoomLastFiredAt = Date.now();
}

function firePan(): void {
  if (!getWidget() || !isChartReady()) return;
  if (Date.now() - debounce.zoomLastFiredAt < PAN_SKIP_AFTER_ZOOM_MS) {
    return;
  }
  postToRN('CHART_INTERACTED', { interaction_type: 'pan' });
}

function scheduleZoom(): void {
  if (debounce.zoomTimer) clearTimeout(debounce.zoomTimer);
  debounce.zoomTimer = setTimeout(() => {
    debounce.zoomTimer = null;
    fireZoom();
  }, DEBOUNCE_MS);
}

function schedulePan(): void {
  if (Date.now() - debounce.zoomLastFiredAt < PAN_SKIP_AFTER_ZOOM_MS) return;
  if (debounce.panTimer) clearTimeout(debounce.panTimer);
  debounce.panTimer = setTimeout(() => {
    debounce.panTimer = null;
    firePan();
  }, DEBOUNCE_MS);
}

/**
 * Subscribes zoom (barSpacingChanged) and pan (onVisibleRangeChanged) to the
 * debounced CHART_INTERACTED emitters. Safe to call once per chart-ready.
 */
export function attachVisibleRangeListeners(chart: TVActiveChart): void {
  attachedChart = chart;
  try {
    chart.getTimeScale().barSpacingChanged().subscribe(null, scheduleZoom);
  } catch (error) {
    reportErrorToRN(error);
  }
  try {
    chart.onVisibleRangeChanged().subscribe(null, () => {
      // Notify overlays (trade markers etc.) immediately so panned-in
      // shapes get re-placed without waiting on the analytics debounce.
      notifyDataLifecycle('visibleRangeChanged');
      schedulePan();
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}

/** Test-only: reset the debounce state between cases. */
export function __resetVisibleRangeForTests(): void {
  attachedChart = null;
  if (debounce.zoomTimer) clearTimeout(debounce.zoomTimer);
  if (debounce.panTimer) clearTimeout(debounce.panTimer);
  debounce.zoomTimer = null;
  debounce.panTimer = null;
  debounce.zoomLastFiredAt = 0;
}
