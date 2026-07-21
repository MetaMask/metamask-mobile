// Social trade-marker overlay: places colored circles (with black rings)
// on the chart for each of the user's trades, at the price of the candle
// their trade timestamp falls in.
//
// Ported from chartLogic.js (~lines 2633-2896):
//   TRADE_MARKER_ICON, TRADE_MARKER_SIZE, TRADE_MARKER_RING_SIZE,
//   TRADE_MARKER_RING_COLOR, createTradeMarkerIcon, clearTradeMarkers,
//   handleSetTradeMarkers, placeTradeMarkers, scheduleTradeMarkerRefresh.
//
// State lives in ./state.ts (no window.* globals). The overlay reacts to
// three data-lifecycle events emitted by widget/pagination/interaction
// modules — see registerTradeMarkerOverlay(). Overlays never import from
// widget/*; the lifecycle bus decouples them.
//
// Sequential ring/fill draw order: creating ring1, fill1, ring2, fill2, …
// with every shape at zOrder 'top' keeps a black rim visible between
// touching circles (otherwise adjacent fills merge into one blob).

import { reportErrorToRN } from '../../core/bridge';
import { onDataLifecycle } from '../../core/dataLifecycle';
import {
  getOhlcvData,
  getTheme,
  getWidget,
  isChartReady,
} from '../../core/state';
import { registerHandler } from '../../messages/handler';
import type {
  ChartTheme,
  OHLCVBar,
  TVActiveChart,
  TVShapeId,
} from '../../core/types';
import type {
  SetTradeMarkersPayload,
  TradeMarker,
} from '../../messages/contract';
import {
  bumpPlacementGeneration,
  clearShapes,
  getMarkers,
  getPlacementGeneration,
  getShapeIds,
  getShapesByMarkerId,
  pushShapeId,
  setMarkers,
  setShapesForMarkerId,
} from './state';

/** FontAwesome fa-circle glyph — same icon used elsewhere for the line-end dot. */
const TRADE_MARKER_ICON = 0xf111;
/** Inner colored circle diameter (px). */
export const TRADE_MARKER_SIZE = 10;
/** Outer ring diameter (px). The colored circle sits on top, leaving a ~2px rim. */
export const TRADE_MARKER_RING_SIZE = 14;
/** Ring/outline color drawn behind every colored circle. */
export const TRADE_MARKER_RING_COLOR = 'rgb(0, 0, 0)';
/** Debounce delay for a re-placement after pan / zoom / pagination. */
const REFRESH_DEBOUNCE_MS = 150;

let refreshDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * Bar (from `data`) closest in time to `tMs`. Ties favor the earlier bar
 * — the candle the trade actually falls within. Returns null when the
 * series is empty, `tMs` is non-finite, or the nearest close is not a
 * number.
 */
export function snapMarkerToNearestBar(
  data: readonly OHLCVBar[],
  tMs: number,
): { timeSec: number; close: number } | null {
  if (!data.length || !Number.isFinite(tMs)) return null;

  let lo = 0;
  let hi = data.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].time < tMs) lo = mid + 1;
    else hi = mid;
  }
  let best = lo;
  if (lo > 0) {
    const prevDiff = tMs - data[lo - 1].time;
    const curDiff = data[lo].time - tMs;
    if (prevDiff <= curDiff) best = lo - 1;
  }
  const close = Number(data[best].close);
  if (!Number.isFinite(close)) return null;
  return { timeSec: Math.floor(data[best].time / 1000), close };
}

function createTradeMarkerIcon(
  chart: TVActiveChart,
  timeSec: number,
  price: number,
  color: string,
  size: number,
): Promise<TVShapeId> {
  return chart.createShape(
    { time: timeSec, price },
    {
      shape: 'icon',
      icon: TRADE_MARKER_ICON,
      lock: true,
      overrides: { color, size },
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      showInObjectsTree: false,
      zOrder: 'top',
    },
  );
}

function removeEntitySafe(
  chart: TVActiveChart,
  entityId: TVShapeId | null | undefined,
): void {
  if (!entityId) return;
  try {
    chart.removeEntity(entityId);
  } catch {
    // Shape may already be removed.
  }
}

export function clearTradeMarkers(): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;

  try {
    const chart = widget.activeChart();
    for (const id of getShapeIds()) {
      try {
        chart.removeEntity(id);
      } catch {
        // Already removed.
      }
    }
    clearShapes();
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function handleSetTradeMarkers(payload: SetTradeMarkersPayload): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) {
    // Not ready yet — stash the markers and place them once the widget
    // reports ready via the ohlcvReset lifecycle event.
    setMarkers(payload?.markers?.length ? payload.markers : null);
    return;
  }
  setMarkers(payload?.markers?.length ? payload.markers : null);
  if (getMarkers() === null) {
    clearTradeMarkers();
    return;
  }
  placeTradeMarkers();
}

interface DesiredMarker {
  id: string;
  timeSec: number;
  price: number;
  color: string;
}

function resolveSnappedPrice(
  snapped: { timeSec: number; close: number } | null,
  markerPrice: number | undefined,
): number | null {
  if (snapped !== null) return snapped.close;
  if (markerPrice != null && Number.isFinite(markerPrice)) {
    return markerPrice as number;
  }
  return null;
}

function collectDesiredMarkers(
  markers: readonly TradeMarker[],
  data: readonly OHLCVBar[],
  theme: ChartTheme,
): DesiredMarker[] {
  if (!data.length) return [];
  const firstT = data[0].time;
  const lastBar = data.at(-1);
  if (!lastBar) return [];
  const lastT = lastBar.time;

  const eligible = markers.filter(
    (m) =>
      m?.id != null &&
      Number.isFinite(m.time) &&
      m.time >= firstT &&
      m.time <= lastT,
  );

  const ordered = eligible.slice().sort((a, b) => a.time - b.time);
  const desired: DesiredMarker[] = [];
  for (const marker of ordered) {
    const snapped = snapMarkerToNearestBar(data, marker.time);
    const timeSec = snapped ? snapped.timeSec : Math.floor(marker.time / 1000);
    const rawPrice = resolveSnappedPrice(snapped, marker.price);
    if (rawPrice === null) continue;
    const color =
      marker.intent === 'exit' ? theme.errorColor : theme.successColor;
    desired.push({
      id: String(marker.id),
      timeSec,
      price: rawPrice,
      color,
    });
  }
  return desired;
}

export function placeTradeMarkers(): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  let chart: TVActiveChart;
  try {
    chart = widget.activeChart();
  } catch (error) {
    reportErrorToRN(error);
    return;
  }
  if (!chart) return;

  const markers = getMarkers() ?? [];
  const data = getOhlcvData();
  if (!data.length) return; // no candles loaded yet — re-runs after data / pan
  const theme = getTheme();
  if (!theme) return;

  const desired = collectDesiredMarkers(markers, data, theme);

  // Skip when the drawn set already matches — prevents pan flicker.
  const desiredKey = desired
    .map((d) => d.id)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
  const drawnKey = Array.from(getShapesByMarkerId().keys())
    .sort((a, b) => a.localeCompare(b))
    .join('|');
  if (desiredKey === drawnKey) return;

  const gen = bumpPlacementGeneration();
  clearTradeMarkers();

  const paint = (): void => {
    if (gen !== getPlacementGeneration()) return;
    if (!getWidget() || !isChartReady()) return;
    let activeChart: TVActiveChart;
    try {
      activeChart = widget.activeChart();
    } catch (error) {
      reportErrorToRN(error);
      return;
    }
    if (!activeChart) return;

    // Draw ring1 → fill1 → ring2 → fill2 sequentially. Every new shape is
    // created at zOrder 'top', so the next ring lands ON TOP of the
    // previous fill — keeps a black seam between touching circles.
    const drawRingAndFill = async (marker: DesiredMarker): Promise<void> => {
      if (gen !== getPlacementGeneration()) return;

      const ringId = await createTradeMarkerIcon(
        activeChart,
        marker.timeSec,
        marker.price,
        TRADE_MARKER_RING_COLOR,
        TRADE_MARKER_RING_SIZE,
      );

      if (gen !== getPlacementGeneration()) {
        removeEntitySafe(activeChart, ringId);
        return;
      }

      const fillId = await createTradeMarkerIcon(
        activeChart,
        marker.timeSec,
        marker.price,
        marker.color,
        TRADE_MARKER_SIZE,
      );

      if (gen !== getPlacementGeneration()) {
        removeEntitySafe(activeChart, ringId);
        removeEntitySafe(activeChart, fillId);
        return;
      }

      if (ringId) pushShapeId(ringId);
      if (fillId) pushShapeId(fillId);
      setShapesForMarkerId(marker.id, {
        fill: fillId ?? null,
        ring: ringId ?? null,
      });
    };

    let chain: Promise<unknown> = Promise.resolve();
    for (const marker of desired) {
      chain = chain.then(() => drawRingAndFill(marker));
    }
    chain.catch(() => {
      // Swallow — createShape failures are non-fatal for individual markers.
    });
  };

  // Defer to dataReady when available so createShape has bars to snap X to.
  try {
    if (typeof chart.dataReady === 'function') {
      chart.dataReady(paint);
    } else {
      paint();
    }
  } catch {
    paint();
  }
}

export function scheduleTradeMarkerRefresh(): void {
  if (!getMarkers()) return;
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(() => {
    refreshDebounce = null;
    placeTradeMarkers();
  }, REFRESH_DEBOUNCE_MS);
}

/**
 * Wires the trade-marker message handlers and lifecycle subscriptions.
 * Called once from bootstrap. Idempotent registerHandler replaces prior
 * bindings — safe to call twice in tests without leaking listeners.
 */
export function registerTradeMarkerOverlay(): void {
  registerHandler('SET_TRADE_MARKERS', (payload) => {
    handleSetTradeMarkers(payload);
  });

  // OHLCV reset drops every shape entity — clear our tracking (so
  // placeTradeMarkers doesn't skip a redraw with a matching id set) and
  // re-schedule a draw once the new data lands.
  onDataLifecycle('ohlcvReset', () => {
    clearShapes();
    scheduleTradeMarkerRefresh();
  });

  // Older history paginated in → draw any markers that now sit in range.
  onDataLifecycle('ohlcvPrepended', scheduleTradeMarkerRefresh);

  // Pan / zoom may bring previously off-screen markers into the loaded
  // range — re-place after the debounce settles.
  onDataLifecycle('visibleRangeChanged', scheduleTradeMarkerRefresh);
}

/** Test-only: clear any pending refresh so timers don't leak between cases. */
export function __resetTradeMarkerRefreshForTests(): void {
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = null;
}
