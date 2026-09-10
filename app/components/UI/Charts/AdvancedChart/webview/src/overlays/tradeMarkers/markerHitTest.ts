// Marker tap detection — turns a chart tap into a TRADE_MARKER_PRESSED
// message so the RN side can scroll the trades list to the tapped trade.
//
// Ported from chartLogic.js findTradeMarkerIdNearPoint (~lines 3007-3072) for
// the pure hit-test. Tap capture is DOM-based: TradingView's crosshair only
// fires on a long-press-and-hold on mobile, so a quick tap never produced a
// point. We listen for real DOM taps on the chart document(s) instead and
// hit-test the release point against the drawn markers. Listeners are
// capture-phase + passive and NEVER call preventDefault, so chart pan / zoom
// keep working untouched.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import { getOhlcvData, getWidget, isChartReady } from '../../core/state';
import { normalizeChartUnixSec } from '../../core/timeUtils';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../core/types';
import type { TradeMarker } from '../../messages/contract';
import { getMarkers, getShapesByMarkerId } from './state';
import { snapMarkerToNearestBar } from './index';

/** Pixel radius (Euclidean) for matching a tap to a marker. */
const TAP_RADIUS_PX = 26;
/** Max press duration (ms) still treated as a tap rather than a long-press. */
const TAP_MAX_DURATION_MS = 350;
/** Max finger travel (px) still treated as a tap rather than a drag / pan. */
const TAP_MAX_MOVE_PX = 10;
/**
 * Window (ms) during which a repeat hit for the same id is dropped — absorbs
 * the synthetic `click` a browser fires right after a touch `touchend`.
 */
const SAME_ID_DEDUPE_MS = 500;

interface TouchStartPoint {
  x: number;
  y: number;
  at: number;
}

/** Finger-down position of the in-progress press, or null between presses. */
let touchStart: TouchStartPoint | null = null;
/** Last emitted marker id + timestamp, for the synthetic-click dedupe. */
let lastPressedId: string | null = null;
let lastPressedAt = 0;
/** Documents already wired with tap listeners (per-doc install guard). */
const installedDocs = new Set<Document>();

interface VisibleTimeRangeSec {
  lo: number;
  hi: number;
}

/**
 * Extract a normalized time range from a TradingView bar/visible range result.
 * Returns the range or null if the values are missing or non-normalizable.
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

function getVisibleTimeRangeSec(
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

/**
 * Compute the Y coordinate for a price given a linear price scale.
 * Returns null when the height is non-positive or the scale range is degenerate.
 */
function linearPriceToY(
  lo: number,
  hi: number,
  price: number,
  h: number,
  inverted: boolean,
): number | null {
  if (inverted) return ((price - lo) / (hi - lo)) * h;
  return ((hi - price) / (hi - lo)) * h;
}

/**
 * Compute the Y coordinate for a price given a logarithmic price scale.
 * Returns null when any value is non-positive or the log range is degenerate.
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
 * Y coordinate (main-pane overlay pixels) for a price. Mirrors chartLogic.js
 * `getPriceYForLastCloseOverlay`. Returns null when the pane / scale /
 * range isn't available. Log-scale mode uses log mapping.
 */
function priceToY(chart: TVActiveChart, price: number): number | null {
  if (!Number.isFinite(price)) return null;
  if (typeof chart.getPanes !== 'function') return null;
  try {
    const panes = chart.getPanes();
    if (!panes?.length) return null;
    const pane = panes[0];
    const scale = pane.getMainSourcePriceScale();
    if (!scale) return null;
    const range = scale.getVisiblePriceRange();
    if (range?.from === undefined || range?.to === undefined) {
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
      return logPriceToY(lo, hi, clamped, h, inverted);
    }
    return linearPriceToY(lo, hi, clamped, h, inverted);
  } catch {
    return null;
  }
}

/** Resolve the plot width (in pixels) from the chart's time scale. */
function getPlotWidth(chart: TVActiveChart): number {
  try {
    const ts = chart.getTimeScale();
    if (ts && typeof ts.width === 'function') return ts.width();
  } catch {
    // ignore — caller treats 0 as unavailable
  }
  return 0;
}

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

interface HitTestGeometry {
  chart: TVActiveChart;
  range: VisibleTimeRangeSec;
  pxPerSec: number;
  drawn: Map<string, unknown>;
  data: readonly OHLCVBar[];
  markers: readonly TradeMarker[];
}

/**
 * Resolve the shared chart geometry (visible range, px-per-second, drawn
 * shapes, cached markers) both hit-test entry points need. Returns null when
 * the chart isn't ready or nothing is drawable.
 */
function resolveHitTestGeometry(): HitTestGeometry | null {
  const markers = getMarkers();
  if (!markers?.length) return null;
  const widget = getWidget();
  if (!widget || !isChartReady()) return null;

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

  return {
    chart,
    range,
    pxPerSec: plotW / (range.hi - range.lo),
    drawn,
    data: getOhlcvData(),
    markers,
  };
}

/**
 * Nearest drawn marker id to (timeSec, offsetY), or null when none sits within
 * TAP_RADIUS_PX.
 */
function findNearestMarkerId(
  geo: HitTestGeometry,
  timeSec: number,
  offsetY: number | undefined,
): string | null {
  const ctx: HitTestContext = {
    chart: geo.chart,
    range: geo.range,
    pxPerSec: geo.pxPerSec,
    drawn: geo.drawn,
    data: geo.data,
    timeSec,
    offsetY,
  };

  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const marker of geo.markers) {
    const result = computeMarkerDistance(ctx, marker);
    if (result && result.dist < bestDist) {
      bestDist = result.dist;
      bestId = result.key;
    }
  }
  return bestDist <= TAP_RADIUS_PX ? bestId : null;
}

/**
 * Nearest drawn trade-marker id to a tap expressed as (chart-time seconds,
 * main-pane offsetY pixels), or null when none sits within TAP_RADIUS_PX.
 */
export function findTradeMarkerIdNearPoint(
  timeSec: number,
  offsetY: number | undefined,
): string | null {
  if (!Number.isFinite(timeSec)) return null;
  const geo = resolveHitTestGeometry();
  if (!geo) return null;
  return findNearestMarkerId(geo, timeSec, offsetY);
}

/**
 * Nearest drawn trade-marker id to a tap expressed as plot-relative pixels.
 * Converts offsetX → chart-time via the visible range
 * (timeSec = range.lo + offsetX / pxPerSec) then reuses the shared
 * nearest-marker search.
 */
export function findTradeMarkerIdNearPixel(
  offsetX: number,
  offsetY: number | undefined,
): string | null {
  if (!Number.isFinite(offsetX)) return null;
  const geo = resolveHitTestGeometry();
  if (!geo) return null;
  const timeSec = geo.range.lo + offsetX / geo.pxPerSec;
  return findNearestMarkerId(geo, timeSec, offsetY);
}

/**
 * Run `fn` for the host document and, when present, the TradingView
 * same-origin iframe document. Mirrors widget/tvDomHelpers.eachChartDocument
 * locally so overlays/* stay independent of widget/*.
 */
function eachChartTapDocument(fn: (doc: Document) => void): void {
  fn(document);
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector('iframe');
    if (iframe?.contentDocument) fn(iframe.contentDocument);
  } catch {
    // iframe access can fail for detached / cross-origin frames.
  }
}

/**
 * Resolve the plot element (outer `.chart-markup-table`, falling back to the
 * chart container) whose top-left corner is the origin for pane-relative
 * offsets. The right price scale + bottom time axis layout (see initChart)
 * keeps the plot origin aligned with the container top-left, so
 * clientX/Y − plotRect.left/top yields the plot-relative offset.
 */
function findPlotElement(doc: Document | null | undefined): Element | null {
  if (!doc) return null;
  const list = doc.querySelectorAll('.chart-markup-table');
  for (const el of Array.from(list)) {
    const className = el.className ? String(el.className) : '';
    if (el.classList.contains('pane')) continue;
    if (className.includes('price-axis-container')) continue;
    if (className.includes('time-axis')) continue;
    return el;
  }
  if (list.length) return list[0];
  return doc.getElementById?.('tv_chart_container') ?? null;
}

/**
 * Hit-test a tap at client coordinates and emit TRADE_MARKER_PRESSED on a hit.
 * Drops a repeat of the same id inside SAME_ID_DEDUPE_MS to absorb the
 * synthetic click a browser fires right after a touch tap.
 */
function handleTapAt(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): void {
  const doc = (target as Node | null)?.ownerDocument ?? document;
  const plot = findPlotElement(doc);
  if (!plot) return;
  const rect = plot.getBoundingClientRect();
  const id = findTradeMarkerIdNearPixel(
    clientX - rect.left,
    clientY - rect.top,
  );
  if (id == null) return;
  const now = Date.now();
  if (id === lastPressedId && now - lastPressedAt < SAME_ID_DEDUPE_MS) return;
  lastPressedId = id;
  lastPressedAt = now;
  postToRN('TRADE_MARKER_PRESSED', { id });
}

function onTouchStart(ev: Event): void {
  const touch = (ev as TouchEvent).touches?.[0];
  if (!touch) {
    touchStart = null;
    return;
  }
  touchStart = { x: touch.clientX, y: touch.clientY, at: Date.now() };
}

function onTouchEnd(ev: Event): void {
  const start = touchStart;
  touchStart = null;
  if (!start) return;
  const touch = (ev as TouchEvent).changedTouches?.[0];
  if (!touch) return;
  // Reject long-press-and-hold and drag / pan gestures — only a quick,
  // near-stationary release counts as a tap.
  if (Date.now() - start.at > TAP_MAX_DURATION_MS) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.hypot(dx, dy) > TAP_MAX_MOVE_PX) return;
  handleTapAt(ev.target, touch.clientX, touch.clientY);
}

function onClick(ev: Event): void {
  const mouse = ev as MouseEvent;
  handleTapAt(ev.target, mouse.clientX, mouse.clientY);
}

/** Passive capture options — read-only, never blocks TV's own handlers. */
const PASSIVE_CAPTURE: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

function installTapListeners(doc: Document): void {
  if (!doc?.addEventListener || installedDocs.has(doc)) return;
  try {
    doc.addEventListener('touchstart', onTouchStart, PASSIVE_CAPTURE);
    doc.addEventListener('touchend', onTouchEnd, PASSIVE_CAPTURE);
    // Mouse fallback (dev / web). Deduped against the synthetic post-touch
    // click via handleTapAt's SAME_ID_DEDUPE_MS window.
    doc.addEventListener('click', onClick, true);
    installedDocs.add(doc);
  } catch (error) {
    reportErrorToRN(error);
  }
}

function applyTapDetectionOnce(): void {
  eachChartTapDocument(installTapListeners);
}

/**
 * Wire DOM tap detection so a single tap on a drawn marker emits
 * TRADE_MARKER_PRESSED. Reapplies on the iframe `load` event and after
 * 200 / 800 / 2000ms because TradingView mounts (and may swap) its iframe
 * document asynchronously — mirrors externalLinkBridge's retry pattern.
 * `widget` / `chart` are unused now that capture is DOM-based, but kept for
 * signature stability with the crosshair-based predecessor and the caller.
 */
export function attachMarkerHitTest(
  widget: TVChartingLibraryWidget,
  chart: TVActiveChart,
): void {
  applyTapDetectionOnce();
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector('iframe');
    if (iframe) iframe.addEventListener('load', applyTapDetectionOnce);
  } catch {
    // container / iframe may not exist yet on early calls.
  }
  setTimeout(applyTapDetectionOnce, 200);
  setTimeout(applyTapDetectionOnce, 800);
  setTimeout(applyTapDetectionOnce, 2000);
}

/**
 * Test-only: forget in-flight tap state + dedupe memory and detach any
 * installed listeners so the next attachMarkerHitTest re-installs exactly one.
 */
export function __resetMarkerHitTestForTests(): void {
  touchStart = null;
  lastPressedId = null;
  lastPressedAt = 0;
  for (const doc of installedDocs) {
    try {
      doc.removeEventListener('touchstart', onTouchStart, PASSIVE_CAPTURE);
      doc.removeEventListener('touchend', onTouchEnd, PASSIVE_CAPTURE);
      doc.removeEventListener('click', onClick, true);
    } catch {
      // Document may already be gone during teardown.
    }
  }
  installedDocs.clear();
}
