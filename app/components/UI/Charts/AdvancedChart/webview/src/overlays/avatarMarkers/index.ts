// Follower avatar marker overlay for the candlestick (TradingView) chart —
// ASSETS-4102 Phase 2.
//
// TradingView's Drawing API (createShape) can only render icon glyphs, stickers
// and emojis — never a remote image — so avatars cannot use the dot path in
// overlays/tradeMarkers. Instead we render a DOM layer: one absolutely-
// positioned <img> (circular + buy/sell badge) per marker, inside a container
// overlaid on #tv_chart_container. X comes from the time scale's continuous
// barSpacing()/rightOffset() geometry (smooth on zoom) and Y from the visible
// price range (coordinates.ts). Positions are re-synced on pan/zoom/data and
// every animation frame while the user is actively dragging the chart (TV
// exposes no per-frame pan hook).

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
  AvatarMarker,
  SetAvatarMarkersPayload,
} from '../../messages/contract';
import type {
  ChartTheme,
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../core/types';
import { getPlotWidth, getVisibleTimeRangeSec, priceToY } from './coordinates';
import {
  clearAvatarElements,
  getAvatarElements,
  getAvatarMarkers,
  setAvatarMarkers,
} from './state';

const OVERLAY_ID = 'avatar-marker-overlay';
/** Avatar circle diameter (px). */
const AVATAR_SIZE = 24;
/** Buy/sell badge diameter (px). */
const BADGE_SIZE = 12;
/** Debounce for re-positioning after a settled pan/zoom/pagination. */
const REFRESH_DEBOUNCE_MS = 120;
/** Gap (px) between the candle's high and the bottom edge of the avatar. */
const MARKER_GAP_PX = 10;
/**
 * How long (ms) to keep the per-frame reposition loop alive after the last
 * pan/zoom signal. Pinch-zoom and inertial pan don't reliably bracket with
 * mouse_down/mouse_up on touch, so we tick a little past the last range change
 * before going idle.
 */
const SETTLE_MS = 300;

let refreshDebounce: ReturnType<typeof setTimeout> | null = null;
let rafId: number | null = null;
let interacting = false;
let activeUntilMs = 0;

function initialOf(name: string | undefined): string {
  const ch = name?.trim()?.[0];
  return ch ? ch.toUpperCase() : '?';
}

/**
 * Accepts a renderable <img> source: an http(s) URL or a `data:image/…` URI.
 * RN resolves avatar URLs to data URIs before posting them (so the WebView
 * never fetches a remote host and the CSP needs no external `img-src` host),
 * but http(s) is still accepted as a fallback.
 */
function isRenderableImageSrc(url: string | undefined): url is string {
  return typeof url === 'string' && /^(https?:\/\/|data:image\/)/i.test(url);
}

function getContainer(): HTMLElement | null {
  return document.getElementById('tv_chart_container');
}

function ensureOverlayElement(): HTMLDivElement | null {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing as HTMLDivElement;
  const container = getContainer();
  if (!container) return null;
  const div = document.createElement('div');
  div.id = OVERLAY_ID;
  div.style.cssText =
    'position:absolute;top:0;left:0;width:100%;height:100%;' +
    'z-index:4;pointer-events:none;overflow:hidden;';
  container.style.position = 'relative';
  container.appendChild(div);
  return div;
}

function buildMarkerElement(
  marker: AvatarMarker,
  theme: ChartTheme,
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:absolute;will-change:transform;pointer-events:none;' +
    'transform:translate(-50%,-50%);display:none;';

  const avatar = document.createElement('div');
  avatar.style.cssText =
    `width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;border-radius:50%;` +
    `overflow:hidden;box-sizing:border-box;` +
    `border:1.5px solid ${theme.backgroundColor};` +
    `background:${theme.primaryColor};position:relative;` +
    `display:flex;align-items:center;justify-content:center;`;

  const appendInitials = (): void => {
    const initials = document.createElement('span');
    initials.textContent = initialOf(marker.traderName);
    initials.style.cssText =
      `color:${theme.textColor};font-size:${Math.round(AVATAR_SIZE / 2)}px;` +
      `font-weight:600;line-height:1;`;
    avatar.appendChild(initials);
  };

  if (isRenderableImageSrc(marker.avatarUrl)) {
    const img = document.createElement('img');
    img.src = marker.avatarUrl;
    img.referrerPolicy = 'no-referrer';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    // Degrade to initials if the avatar fails to load (dead URL, CSP, offline)
    // so markers never show a broken-image glyph.
    img.onerror = (): void => {
      img.remove();
      appendInitials();
    };
    avatar.appendChild(img);
  } else {
    appendInitials();
  }

  const isBuy = marker.intent === 'enter';
  const badge = document.createElement('div');
  badge.textContent = isBuy ? '+' : '\u2212';
  badge.style.cssText =
    `position:absolute;right:-2px;bottom:-2px;` +
    `width:${BADGE_SIZE}px;height:${BADGE_SIZE}px;border-radius:50%;` +
    `background:${isBuy ? theme.successColor : theme.errorColor};` +
    `color:${theme.backgroundColor};` +
    `border:1px solid ${theme.backgroundColor};box-sizing:border-box;` +
    `font-size:${Math.round(BADGE_SIZE * 0.8)}px;font-weight:700;line-height:1;` +
    `display:flex;align-items:center;justify-content:center;`;

  avatar.appendChild(badge);
  wrapper.appendChild(avatar);
  return wrapper;
}

export function clearAvatarMarkers(): void {
  clearAvatarElements();
}

/** Create/remove DOM elements so they match the current marker id set. */
function syncElements(
  markers: readonly AvatarMarker[],
  theme: ChartTheme,
): void {
  const overlay = ensureOverlayElement();
  if (!overlay) return;
  const elements = getAvatarElements();
  const wanted = new Set(markers.map((m) => String(m.id)));

  for (const [id, el] of elements) {
    if (!wanted.has(id)) {
      el.remove();
      elements.delete(id);
    }
  }

  for (const marker of markers) {
    const id = String(marker.id);
    if (elements.has(id)) continue;
    const el = buildMarkerElement(marker, theme);
    overlay.appendChild(el);
    elements.set(id, el);
  }
}

/** Index of the bar nearest `tMs` (ms) via binary search, or -1 when no data. */
function nearestBarIndex(data: readonly OHLCVBar[], tMs: number): number {
  if (!data.length || !Number.isFinite(tMs)) return -1;
  let lo = 0;
  let hi = data.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].time < tMs) lo = mid + 1;
    else hi = mid;
  }
  let best = lo;
  if (lo > 0 && tMs - data[lo - 1].time <= data[lo].time - tMs) best = lo - 1;
  return best;
}

/** Shared placement context, computed once per frame. */
interface PlacementContext {
  chart: TVActiveChart;
  plotWidth: number;
  data: readonly OHLCVBar[];
  /** Bar index of the first visible bar (left edge). */
  firstIdx: number;
  /** Bar index of the last visible bar (right edge). */
  lastIdx: number;
}

/**
 * Continuous X (pixels) for a bar center using the time scale's `barSpacing()`
 * (pixels-per-bar) + `rightOffset()` (bars of right margin). Unlike the
 * bar-quantized visible range, these update smoothly every frame during a
 * zoom, so the avatar tracks its candle without stepping. Returns null when the
 * runtime time scale doesn't expose `barSpacing()` (then we fall back to index
 * interpolation).
 */
function barCenterX(
  chart: TVActiveChart,
  markerIdx: number,
  dataLen: number,
  plotWidth: number,
): number | null {
  let ts: ReturnType<TVActiveChart['getTimeScale']>;
  try {
    ts = chart.getTimeScale();
  } catch {
    return null;
  }
  if (!ts || typeof ts.barSpacing !== 'function') return null;
  let spacing: number;
  try {
    spacing = ts.barSpacing();
  } catch {
    return null;
  }
  if (!Number.isFinite(spacing) || spacing <= 0) return null;
  let rightOffset = 0;
  if (typeof ts.rightOffset === 'function') {
    try {
      const ro = ts.rightOffset();
      if (Number.isFinite(ro)) rightOffset = ro;
    } catch {
      // keep 0
    }
  }
  const lastIndex = dataLen - 1;
  // Distance (in bars) from the right border to this bar's center, then px.
  const barsFromRightBorder = rightOffset + (lastIndex - markerIdx) + 0.5;
  return plotWidth - barsFromRightBorder * spacing;
}

/**
 * Places one avatar on its candle. X comes from the time scale's continuous
 * `barSpacing()` geometry (smooth on zoom). TradingView spaces candles by index
 * (ignoring time gaps), so the avatar anchors to the bar's slot, not the raw
 * trade timestamp.
 */
function positionOne(
  marker: AvatarMarker,
  el: HTMLDivElement,
  ctx: PlacementContext,
): void {
  if (!Number.isFinite(marker.time)) {
    el.style.display = 'none';
    return;
  }
  const markerIdx = nearestBarIndex(ctx.data, marker.time);
  if (markerIdx < 0 || markerIdx < ctx.firstIdx || markerIdx > ctx.lastIdx) {
    el.style.display = 'none';
    return;
  }
  // Anchor to the top of the candle (its high) so the avatar floats above the
  // wick rather than overlapping the body; fall back to the marker's own price.
  const bar = ctx.data[markerIdx];
  const anchorPrice =
    bar && Number.isFinite(Number(bar.high)) ? Number(bar.high) : marker.price;
  if (anchorPrice == null || !Number.isFinite(anchorPrice)) {
    el.style.display = 'none';
    return;
  }
  // X from the time scale's continuous bar-spacing geometry (smooth on zoom).
  // Hide the marker for any frame the geometry is momentarily unavailable
  // (e.g. barSpacing() not yet finite); it reappears on the next frame.
  const x = barCenterX(ctx.chart, markerIdx, ctx.data.length, ctx.plotWidth);
  if (x == null) {
    el.style.display = 'none';
    return;
  }
  const anchorY = priceToY(ctx.chart, anchorPrice);
  if (anchorY == null || !Number.isFinite(anchorY)) {
    el.style.display = 'none';
    return;
  }
  // Lift the avatar so its bottom edge sits MARKER_GAP_PX above the candle high.
  const y = anchorY - MARKER_GAP_PX - AVATAR_SIZE / 2;
  el.style.transform = `translate(calc(${x}px - 50%),calc(${y}px - 50%))`;
  el.style.display = 'block';
}

export function positionAvatarMarkers(): void {
  const markers = getAvatarMarkers();
  if (!markers?.length) return;
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
  const range = getVisibleTimeRangeSec(chart);
  if (!range || range.hi <= range.lo) return;
  const plotWidth = getPlotWidth(chart);
  if (plotWidth <= 0) return;

  const data = getOhlcvData();
  if (!data.length) return;
  // Resolve the visible bar window to indices (range is in seconds; bar.time ms).
  const firstIdx = nearestBarIndex(data, range.lo * 1000);
  const lastIdx = nearestBarIndex(data, range.hi * 1000);
  if (firstIdx < 0 || lastIdx <= firstIdx) return;

  const ctx: PlacementContext = { chart, plotWidth, data, firstIdx, lastIdx };
  const elements = getAvatarElements();
  for (const marker of markers) {
    const el = elements.get(String(marker.id));
    if (el) positionOne(marker, el, ctx);
  }
}

export function renderAvatarMarkers(): void {
  const markers = getAvatarMarkers();
  if (!markers?.length) {
    clearAvatarMarkers();
    return;
  }
  const theme = getTheme();
  if (!theme) return;
  syncElements(markers, theme);
  positionAvatarMarkers();
}

export function handleSetAvatarMarkers(payload: SetAvatarMarkersPayload): void {
  setAvatarMarkers(payload?.markers?.length ? payload.markers : null);
  if (getAvatarMarkers() === null) {
    clearAvatarMarkers();
    return;
  }
  renderAvatarMarkers();
}

export function scheduleAvatarMarkerRefresh(): void {
  if (!getAvatarMarkers()) return;
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = setTimeout(() => {
    refreshDebounce = null;
    renderAvatarMarkers();
  }, REFRESH_DEBOUNCE_MS);
}

/**
 * rAF loop: reposition every marker (by bar index — see {@link positionOne})
 * each frame while the chart is moving, so avatars stay locked to their candles
 * and visible throughout a pan/zoom. Stops once the chart has been idle past
 * the settle window.
 */
function tick(): void {
  positionAvatarMarkers();
  if (interacting || Date.now() < activeUntilMs) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
}

function ensureLoop(): void {
  if (rafId != null) return;
  try {
    rafId = requestAnimationFrame(tick);
  } catch {
    tick();
  }
}

/** Keep the per-frame loop alive for SETTLE_MS past the latest chart change. */
function bumpActive(): void {
  activeUntilMs = Date.now() + SETTLE_MS;
  ensureLoop();
}

function startInteractionSync(): void {
  interacting = true;
  ensureLoop();
}

function stopInteractionSync(): void {
  interacting = false;
  bumpActive();
}

/**
 * Subscribes pan/zoom drivers so markers track the chart per-frame and stay
 * visible+locked. mouse_down/up bracket pointer drags; visible-range +
 * bar-spacing changes (which also fire during pinch-zoom and inertial/
 * programmatic moves) keep the rAF loop alive for a short settle window.
 */
export function attachAvatarMarkerSync(
  widget: TVChartingLibraryWidget,
  chart: TVActiveChart,
): void {
  try {
    widget.subscribe('mouse_down', startInteractionSync);
    widget.subscribe('mouse_up', stopInteractionSync);
  } catch (error) {
    reportErrorToRN(error);
  }
  try {
    chart.onVisibleRangeChanged().subscribe(null, bumpActive);
  } catch (error) {
    reportErrorToRN(error);
  }
  try {
    chart.getTimeScale().barSpacingChanged().subscribe(null, bumpActive);
  } catch {
    // barSpacingChanged may be unavailable; visibleRange covers most cases.
  }
}

/**
 * Registers the SET_AVATAR_MARKERS handler and data-lifecycle subscriptions.
 * Called once from bootstrap.
 */
export function registerAvatarMarkerOverlay(): void {
  registerHandler('SET_AVATAR_MARKERS', (payload) => {
    handleSetAvatarMarkers(payload);
  });
  onDataLifecycle('ohlcvReset', () => {
    clearAvatarMarkers();
    scheduleAvatarMarkerRefresh();
  });
  onDataLifecycle('ohlcvPrepended', scheduleAvatarMarkerRefresh);
  onDataLifecycle('visibleRangeChanged', scheduleAvatarMarkerRefresh);
}

/** Test-only: clear any pending refresh/raf so timers don't leak. */
export function __resetAvatarMarkerRefreshForTests(): void {
  if (refreshDebounce) clearTimeout(refreshDebounce);
  refreshDebounce = null;
  if (rafId != null) {
    try {
      cancelAnimationFrame(rafId);
    } catch {
      // ignore
    }
  }
  rafId = null;
  interacting = false;
  activeUntilMs = 0;
}
