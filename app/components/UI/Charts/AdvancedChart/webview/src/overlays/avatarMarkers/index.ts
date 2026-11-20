// Follower avatar marker overlay for the candlestick (TradingView) chart —
// ASSETS-4102.
//
// TradingView's Drawing API (createShape) can only render icon glyphs, stickers
// and emojis — never a remote image — so avatars cannot use the dot path in
// overlays/tradeMarkers. Instead we render a DOM layer: one absolutely-
// positioned element per *marker*, inside a container overlaid on
// #tv_chart_container. X comes from the time scale's continuous barSpacing()/
// rightOffset() geometry (smooth on zoom) and Y from the visible price range
// (coordinates.ts). Positions are re-synced on pan/zoom/data and every
// animation frame while the user is actively dragging the chart (TV exposes no
// per-frame pan hook).
//
// Grouping: each marker always renders as its own atomic avatar (+ buy/sell
// badge) — avatars are never merged into one element. When markers fall within
// one avatar width on screen they are fanned into an overlapping group centered
// on the candle (each face stays partly visible), and a single count disc is
// added below the group. Grouping is pixel-based, so groups split apart live as
// the user zooms in (barSpacing grows -> pixel gaps grow). The same grouping
// also scopes a tap to every overlapping trade (`tapGroupByMarkerId`).

import { postToRN, reportErrorToRN } from '../../core/bridge';
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
  type AvatarCluster,
} from './state';

const OVERLAY_ID = 'avatar-marker-overlay';
/** Avatar circle diameter (px). */
const AVATAR_SIZE = 28;
/** Buy(+)/sell(−) badge diameter (px), shown on every marker. */
const BADGE_SIZE = 14;
/** Group-count disc diameter (px). Rendered as a standalone circle centered at
 * the bottom of an overlapping bunch, slightly smaller than a face so it reads
 * as a distinct counter beneath the group. */
const COUNT_BADGE_SIZE = AVATAR_SIZE - 4;
/**
 * Markers whose on-screen X centers fall within this many px of a group's
 * leading member are treated as one overlapping group. Grouping drives three
 * things: fanning the members into an overlapping cluster, adding one count
 * disc, and scoping a tap to the whole group (`tapGroupByMarkerId`). Each marker
 * still renders as its own atomic avatar; grouping never merges them into one
 * element. Complete-linkage grouping keeps a group bounded to ~one avatar wide.
 */
const CLUSTER_MERGE_PX = AVATAR_SIZE;
/** Debounce for re-positioning after a settled pan/zoom/pagination. */
const REFRESH_DEBOUNCE_MS = 120;
/** Gap (px) between the candle's high and the bottom edge of the avatar. */
const MARKER_GAP_PX = 10;
/**
 * Horizontal spacing (px) between adjacent avatars in an overlapping group. The
 * members are fanned evenly around the group centroid by this amount so they
 * overlap (~40%) but each face stays partly visible, rather than fully stacking.
 */
const AVATAR_FAN_PX = Math.round(AVATAR_SIZE * 0.6);
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
/** Grouping signature of the clusters currently in the DOM. */
let lastSignature = '';

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

/** Builds the circular avatar (image or initials fallback) for a marker. */
function buildAvatarCircle(
  marker: AvatarMarker,
  theme: ChartTheme,
): HTMLDivElement {
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

  return avatar;
}

/**
 * Cache of built avatar-circle nodes, keyed by marker id. Reused across DOM
 * rebuilds (e.g. when a cluster splits/merges on zoom) by re-parenting the same
 * node, so the `<img>` is never recreated and never re-decodes — which is what
 * caused clustered avatars to flash during zoom. A marker appears in at most one
 * rendered element per frame, so a node is never needed in two places at once.
 */
const circleCache = new Map<string, HTMLDivElement>();

/**
 * markerId -> ids of every marker in its current on-screen proximity group,
 * refreshed each positioning pass. A tap on any marker opens the sheet scoped
 * to that whole overlapping group, so avatars hidden under the top one are
 * still reachable. Read live at tap time (not baked into the element) because
 * group membership changes as markers overlap/separate on zoom.
 */
const tapGroupByMarkerId = new Map<string, string[]>();

/**
 * markerId -> the group-count disc element currently attached to that marker's
 * avatar. Only the representative marker of an overlapping group of 2+ carries a
 * disc; refreshed every positioning pass so the count follows groups as they
 * form/split on zoom without rebuilding the avatar elements.
 */
const countBadgeByMarkerId = new Map<string, HTMLDivElement>();

function getOrBuildAvatarCircle(
  marker: AvatarMarker,
  theme: ChartTheme,
): HTMLDivElement {
  const id = String(marker.id);
  let circle = circleCache.get(id);
  if (!circle) {
    circle = buildAvatarCircle(marker, theme);
    circleCache.set(id, circle);
  }
  return circle;
}

/**
 * Buy(+)/sell(−) badge for a marker. Rendered as a sibling of the avatar circle
 * (not a child) so the circle's `overflow:hidden` (which discs the image)
 * doesn't clip it.
 */
function buildIntentBadge(
  intent: AvatarMarker['intent'],
  theme: ChartTheme,
): HTMLDivElement {
  const isBuy = intent === 'enter';
  const badge = document.createElement('div');
  badge.textContent = isBuy ? '+' : '\u2212';
  badge.style.cssText =
    `position:absolute;right:-3px;bottom:-3px;` +
    `width:${BADGE_SIZE}px;height:${BADGE_SIZE}px;border-radius:50%;` +
    `background:${isBuy ? theme.successColor : theme.errorColor};` +
    `color:${theme.backgroundColor};` +
    `border:1.5px solid ${theme.backgroundColor};box-sizing:border-box;` +
    `font-size:${Math.round(BADGE_SIZE * 0.85)}px;font-weight:700;` +
    `line-height:1;display:flex;align-items:center;justify-content:center;`;
  return badge;
}

/**
 * Group-count disc: the number of markers in an overlapping group (e.g. "3").
 * Rendered as a standalone circle centered at the BOTTOM of the group (just
 * below the fanned faces, overlapping them slightly), so the faces sit above
 * it — matching the design. Count only — no +/− (direction is on each face).
 */
function buildCountBadge(count: number, theme: ChartTheme): HTMLDivElement {
  const badge = document.createElement('div');
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.style.cssText =
    // pointer-events:none so the disc never steals taps from the avatars beneath
    // it (it sits over the lower half of the bunch); only faces are tap targets.
    `position:absolute;left:50%;top:100%;transform:translate(-50%,-10px);` +
    `pointer-events:none;` +
    `min-width:${COUNT_BADGE_SIZE}px;height:${COUNT_BADGE_SIZE}px;padding:0 4px;` +
    `border-radius:${COUNT_BADGE_SIZE}px;box-sizing:border-box;` +
    `background:${theme.backgroundColor};color:${theme.textColor};` +
    `border:1px solid ${theme.borderColor};box-shadow:0 1px 3px rgba(0,0,0,0.25);` +
    `font-size:${Math.round(COUNT_BADGE_SIZE * 0.5)}px;font-weight:700;` +
    `line-height:1;display:flex;align-items:center;justify-content:center;`;
  return badge;
}

/**
 * One atomic marker: a single avatar + its own buy(+)/sell(−) badge. Markers
 * are never merged into one element — when they sit close they collapse into a
 * bunch and overlap (the top one shows), with a count disc added separately;
 * the occluded ones stay reachable via the shared tap group (`tapGroupByMarkerId`).
 */
function buildIndividualElement(
  cluster: AvatarCluster,
  theme: ChartTheme,
): HTMLDivElement {
  const marker = cluster.marker;
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    `position:absolute;width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;` +
    `will-change:transform;pointer-events:auto;cursor:pointer;` +
    `transform:translate(-50%,-50%);display:none;`;

  wrapper.appendChild(getOrBuildAvatarCircle(marker, theme));
  // Badge is a sibling of the circle so the circle's overflow:hidden (which
  // clips the image to a disc) doesn't clip the badge.
  wrapper.appendChild(buildIntentBadge(marker.intent, theme));
  return wrapper;
}

/**
 * Attaches tap handling directly to a cluster's DOM element. A quick tap on
 * mobile does NOT move TradingView's crosshair (it only appears on long-press/
 * drag), so a crosshair-based hit-test never fires — but the avatar is a real
 * DOM node, so we let it capture its own tap and post its member ids straight
 * to RN. No coordinate math, and the tapped avatar is always the one reported.
 *
 * `touchend` is the reliable signal inside the RN WebView (TradingView's own
 * touch handling can swallow the synthesized `click`); `click` is kept as a
 * desktop fallback. A short time guard dedupes the two when both fire.
 *
 * The posted ids are read live from `tapGroupByMarkerId` (not baked in), so a
 * tap always reports the marker's CURRENT overlapping group even after the
 * grouping changed on zoom without the element being rebuilt.
 */
function attachClusterTap(el: HTMLDivElement, markerId: string): void {
  let lastFireMs = 0;
  const fire = (event: Event): void => {
    // Keep the tap from reaching the chart underneath (pan/crosshair).
    event.stopPropagation();
    const now = Date.now();
    if (now - lastFireMs < 400) return;
    lastFireMs = now;
    const ids = tapGroupByMarkerId.get(markerId) ?? [markerId];
    postToRN('AVATAR_MARKER_PRESSED', { ids });
  };
  el.addEventListener('touchend', fire);
  el.addEventListener('click', fire);
}

export function clearAvatarMarkers(): void {
  clearAvatarElements();
  circleCache.clear();
  tapGroupByMarkerId.clear();
  countBadgeByMarkerId.clear();
  lastSignature = '';
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

/**
 * Continuous X (pixels) for a bar center using the time scale's `barSpacing()`
 * (pixels-per-bar) + `rightOffset()` (bars of right margin). Unlike the
 * bar-quantized visible range, these update smoothly every frame during a
 * zoom, so the avatar tracks its candle without stepping. Returns null when the
 * runtime time scale doesn't expose `barSpacing()`.
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

/** Per-marker on-screen layout, resolved once per positioning pass. */
interface MarkerLayout {
  marker: AvatarMarker;
  /** Center X of the marker's candle, in overlay px. */
  x: number;
  /** Y anchor price (candle high), or null when unavailable. */
  anchorPrice: number | null;
}

interface PlacementContext {
  chart: TVActiveChart;
  plotWidth: number;
  data: readonly OHLCVBar[];
  firstIdx: number;
  lastIdx: number;
}

/** Resolves the on-screen X + anchor price for every visible marker. */
function computeMarkerLayouts(
  markers: readonly AvatarMarker[],
  ctx: PlacementContext,
): MarkerLayout[] {
  const layouts: MarkerLayout[] = [];
  for (const marker of markers) {
    if (!Number.isFinite(marker.time)) continue;
    const barIdx = nearestBarIndex(ctx.data, marker.time);
    if (barIdx < 0 || barIdx < ctx.firstIdx || barIdx > ctx.lastIdx) continue;
    const x = barCenterX(ctx.chart, barIdx, ctx.data.length, ctx.plotWidth);
    if (x == null) continue;
    const bar = ctx.data[barIdx];
    // TODO(ASSETS-4102): MUST FIX before launch — a marker on the live/forming
    // last candle jiggles and flashes, because that bar's `high` updates on
    // every price tick (and the bar repaints), so this anchor re-computes each
    // frame. The mock currently side-steps it by keeping trades off the live
    // candle, but real trades CAN land there. Options: for barIdx ===
    // data.length - 1 (the live bar) freeze the Y anchor, or anchor to the
    // bar's `close`/a cached high instead of the continuously-updating high.
    const anchorPrice =
      bar && Number.isFinite(Number(bar.high))
        ? Number(bar.high)
        : marker.price != null && Number.isFinite(marker.price)
          ? marker.price
          : null;
    layouts.push({ marker, x, anchorPrice });
  }
  return layouts;
}

/**
 * Groups X-sorted layouts with complete-linkage (bounded width): a marker joins
 * the current group only while its gap to the group's FIRST member is within
 * `mergePx`, so a cluster never spans more than ~one avatar on screen. This
 * avoids single-linkage chains (a long smear collapsing into one wide cluster)
 * and makes grouping precise: markers cluster only when their avatars genuinely
 * overlap (zoomed out) and split as soon as candles become distinguishable.
 * Pure (chart-independent) so it can be unit-tested directly.
 */
export function groupByProximity(
  layouts: MarkerLayout[],
  mergePx: number,
): MarkerLayout[][] {
  const sorted = layouts.slice().sort((a, b) => a.x - b.x);
  const groups: MarkerLayout[][] = [];
  let current: MarkerLayout[] = [];
  let anchorX = -Infinity;
  for (const layout of sorted) {
    if (current.length && layout.x - anchorX > mergePx) {
      groups.push(current);
      current = [];
    }
    if (current.length === 0) anchorX = layout.x;
    current.push(layout);
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Individual renderable for a single marker, anchored to its own candle. */
function individualFromLayout(layout: MarkerLayout): AvatarCluster {
  const id = String(layout.marker.id);
  return {
    key: `m:${id}`,
    marker: layout.marker,
    x: layout.x,
    // `y` holds the anchor *price* here; positionClusters converts it to a
    // pixel Y (it needs the chart) and overwrites this field with the result.
    y: layout.anchorPrice,
  };
}

/**
 * Flattens proximity groups into one atomic renderable PER marker (avatars are
 * never merged into one element). Close markers overlap on screen; the shared
 * tap group is tracked separately in `tapGroupByMarkerId`. Pure
 * (chart-independent) so it can be unit-tested directly.
 */
export function buildRenderables(groups: MarkerLayout[][]): AvatarCluster[] {
  const renderables: AvatarCluster[] = [];
  for (const group of groups) {
    for (const layout of group) renderables.push(individualFromLayout(layout));
  }
  return renderables;
}

/** Create/remove DOM elements so they match the current cluster key set. */
function syncElements(
  clusters: readonly AvatarCluster[],
  theme: ChartTheme,
): void {
  const overlay = ensureOverlayElement();
  if (!overlay) return;
  const elements = getAvatarElements();
  const wanted = new Set(clusters.map((c) => c.key));

  for (const [key, el] of elements) {
    if (!wanted.has(key)) {
      el.remove();
      elements.delete(key);
      // key is `m:<markerId>`; drop any stale count-badge ref for it (the badge
      // node was a child of `el`, so it's already detached with the element).
      countBadgeByMarkerId.delete(key.slice(2));
    }
  }

  for (const cluster of clusters) {
    if (elements.has(cluster.key)) continue;
    const el = buildIndividualElement(cluster, theme);
    attachClusterTap(el, String(cluster.marker.id));
    overlay.appendChild(el);
    elements.set(cluster.key, el);
  }
}

/** Positions each cluster element at its current pixel X/Y for this frame. */
function positionClusters(
  clusters: AvatarCluster[],
  chart: TVActiveChart,
): void {
  const elements = getAvatarElements();
  for (const cluster of clusters) {
    const el = elements.get(cluster.key);
    if (!el) continue;
    const centerX = cluster.x;
    const anchorPrice = cluster.y; // anchor price (see individualFromLayout)
    if (
      centerX == null ||
      anchorPrice == null ||
      !Number.isFinite(anchorPrice)
    ) {
      el.style.display = 'none';
      continue;
    }
    const anchorY = priceToY(chart, anchorPrice);
    if (anchorY == null || !Number.isFinite(anchorY)) {
      el.style.display = 'none';
      continue;
    }
    // Lift the avatar so its bottom edge sits MARKER_GAP_PX above the high.
    const centerY = anchorY - MARKER_GAP_PX - AVATAR_SIZE / 2;
    el.style.transform = `translate(calc(${centerX}px - 50%),calc(${centerY}px - 50%))`;
    el.style.display = 'block';
    // Reset stacking each frame; the representative of a group is lifted above
    // its overlapping neighbours in updateGroupCountBadges (runs right after).
    el.style.zIndex = '0';
  }
}

/**
 * Keeps exactly one group-count disc per overlapping bunch in sync. `repCounts`
 * maps each 2+ group's representative markerId to its member count. Discs are
 * added/updated on those reps and removed from any marker no longer representing
 * a group — so counts track groups as they form/split on zoom without rebuilding
 * the avatar elements.
 */
function updateGroupCountBadges(
  repCounts: Map<string, number>,
  theme: ChartTheme,
): void {
  const elements = getAvatarElements();
  for (const [markerId, badge] of countBadgeByMarkerId) {
    if (!repCounts.has(markerId)) {
      badge.remove();
      countBadgeByMarkerId.delete(markerId);
    }
  }
  for (const [markerId, count] of repCounts) {
    const el = elements.get(`m:${markerId}`);
    if (!el) continue;
    // Lift the badged avatar above the rest of its bunch so its bottom-centered
    // count disc sits cleanly on top, never occluded by the piled faces.
    el.style.zIndex = '5';
    const existing = countBadgeByMarkerId.get(markerId);
    if (existing) {
      existing.textContent = count > 99 ? '99+' : String(count);
    } else {
      const badge = buildCountBadge(count, theme);
      el.appendChild(badge);
      countBadgeByMarkerId.set(markerId, badge);
    }
  }
}

export function positionAvatarMarkers(): void {
  const markers = getAvatarMarkers();
  if (!markers?.length) return;
  const theme = getTheme();
  if (!theme) return;
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
  const layouts = computeMarkerLayouts(markers, ctx);
  const groups = groupByProximity(layouts, CLUSTER_MERGE_PX);
  const clusters = buildRenderables(groups);

  // Lay every 2+ group out as an overlapping fan: a common Y (the group's
  // topmost candle high) so the faces share one baseline, and X fanned evenly
  // around the group centroid by AVATAR_FAN_PX so each face stays partly visible
  // (not fully stacked). The count disc drops centered under the fan.
  const groupPriceByMarkerId = new Map<string, number>();
  const groupXByMarkerId = new Map<string, number>();
  for (const group of groups) {
    if (group.length < 2) continue;
    let top = -Infinity;
    let sumX = 0;
    for (const l of group) {
      if (l.anchorPrice != null && l.anchorPrice > top) top = l.anchorPrice;
      sumX += l.x;
    }
    const cx = sumX / group.length;
    // group is sorted ascending X (groupByProximity); fan symmetrically about cx.
    const mid = (group.length - 1) / 2;
    group.forEach((l, i) => {
      const id = String(l.marker.id);
      if (Number.isFinite(top)) groupPriceByMarkerId.set(id, top);
      groupXByMarkerId.set(id, cx + (i - mid) * AVATAR_FAN_PX);
    });
  }
  for (const c of clusters) {
    const id = String(c.marker.id);
    const p = groupPriceByMarkerId.get(id);
    if (p != null) c.y = p;
    const x = groupXByMarkerId.get(id);
    if (x != null) c.x = x;
  }

  // Refresh the tap-group map (tapping any marker surfaces its whole overlapping
  // group) and the per-group count (one disc on the representative of a 2+ bunch).
  tapGroupByMarkerId.clear();
  const repCounts = new Map<string, number>();
  for (const group of groups) {
    const ids = group.map((l) => String(l.marker.id)).sort();
    for (const l of group) tapGroupByMarkerId.set(String(l.marker.id), ids);
    if (group.length > 1) {
      // Representative carries the count disc: the middle member of the fan, so
      // the disc (centered under that avatar) lands under the fan's center.
      const repId = String(group[Math.floor((group.length - 1) / 2)].marker.id);
      repCounts.set(repId, group.length);
    }
  }

  // Rebuild DOM only when the visible marker set changed; keys are per-marker,
  // so overlap regrouping on zoom never forces a rebuild (the maps above carry
  // the live grouping instead).
  const signature = clusters.map((c) => c.key).join(';');
  if (signature !== lastSignature) {
    syncElements(clusters, theme);
    lastSignature = signature;
  }
  positionClusters(clusters, chart);
  updateGroupCountBadges(repCounts, theme);
}

export function renderAvatarMarkers(): void {
  const markers = getAvatarMarkers();
  if (!markers?.length) {
    clearAvatarMarkers();
    return;
  }
  if (!getTheme()) return;
  ensureOverlayElement();
  positionAvatarMarkers();
}

export function handleSetAvatarMarkers(payload: SetAvatarMarkersPayload): void {
  setAvatarMarkers(payload?.markers?.length ? payload.markers : null);
  if (getAvatarMarkers() === null) {
    clearAvatarMarkers();
    return;
  }
  // RN posts rarely (e.g. once avatar URLs resolve to data URIs); force a clean
  // rebuild so changed avatars/markers take effect. Zoom frames keep the cache.
  clearAvatarMarkers();
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
 * rAF loop: recompute grouping + reposition every cluster each frame while the
 * chart is moving, so avatars stay locked to their candles and cluster/split
 * live throughout a pan/zoom. Stops once the chart has been idle past the
 * settle window.
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
  lastSignature = '';
}
