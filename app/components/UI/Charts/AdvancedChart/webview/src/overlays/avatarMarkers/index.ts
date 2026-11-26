// Follower avatar marker overlay for the candlestick (TradingView) chart —
// ASSETS-4102.
//
// TradingView's Drawing API (createShape) can only render icon glyphs, stickers
// and emojis — never a remote image — so avatars cannot use the dot path in
// overlays/tradeMarkers. Instead we render a DOM layer: one absolutely-
// positioned element per *marker*, inside a container overlaid on
// #tv_chart_container. X comes from the time scale's continuous barSpacing()/
// rightOffset() geometry (smooth on zoom) and Y from the visible price range
// (core/chartCoordinates.ts). Positions are re-synced on pan/zoom/data and every
// animation frame while the user is actively dragging the chart (TV exposes no
// per-frame pan hook).
//
// Grouping (see grouping.ts): markers are first bucketed per candle — one
// candle is the smallest group and never splits, however far the user zooms.
// Every group draws at a fixed width: at most MAX_FACES (3) overlapping faces
// (distinct traders, most recent), each with its own buy/sell badge, plus a
// total-count disc when the group holds more trades than faces. Groups whose
// drawn footprints would overlap are merged left to right, so zoomed out
// (narrow bars) neighbouring candles collapse together and zooming in splits
// them again. Only the visible faces get DOM elements; hidden members are
// reachable by tapping, which posts every member id (`tapGroupByMarkerId`).

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
import {
  getPlotWidth,
  getVisibleTimeRangeSec,
  priceToY,
} from '../../core/chartCoordinates';
import { setReservedTopPx } from '../../widget/paneMargins';
import {
  clearAvatarElements,
  getAvatarElements,
  getAvatarImages,
  getAvatarMarkers,
  setAvatarImages,
  setAvatarMarkers,
  type AvatarCluster,
} from './state';
import {
  AVATAR_SIZE,
  bucketByCandle,
  mergeOverlappingGroups,
  planGroupRender,
  type MarkerLayout,
} from './grouping';

const OVERLAY_ID = 'avatar-marker-overlay';
/** Buy(+)/sell(−) badge diameter (px), shown on every marker. */
const BADGE_SIZE = 14;
/** Group-count disc diameter (px). Rendered as a standalone circle centered at
 * the bottom of an overlapping bunch, slightly smaller than a face so it reads
 * as a distinct counter beneath the group. */
const COUNT_BADGE_SIZE = AVATAR_SIZE - 4;
/** Debounce for re-positioning after a settled pan/zoom/pagination. */
const REFRESH_DEBOUNCE_MS = 120;
/** Gap (px) between the candle's high and the bottom edge of the avatar. */
const MARKER_GAP_PX = 10;
/** Breathing room (px) kept between a face's top edge and the pane top. */
const TOP_EDGE_PAD_PX = 2;
/**
 * Pixels the overlay needs above the highest visible price: gap + one face +
 * edge padding. Reserved through TradingView's auto-scale top margin (see
 * widget/paneMargins.ts) so the highest candle's avatars are never clipped.
 * The count disc hangs BELOW the faces, so it needs no headroom.
 */
const RESERVED_TOP_PX = MARKER_GAP_PX + AVATAR_SIZE + TOP_EDGE_PAD_PX;
/** Smallest allowed face center Y — keeps the whole face inside the pane. */
const MIN_FACE_CENTER_Y = AVATAR_SIZE / 2 + TOP_EDGE_PAD_PX;
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
/** Group keys rendered last frame — drives merge hysteresis (no flicker). */
let prevGroupKeys: Set<string> = new Set();

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

/**
 * Resolves a marker's `avatarUrl` to an <img> src. RN sends each avatar image
 * once in the `avatars` table (url -> data URI) and markers carry the url as a
 * key, so hundreds of markers don't each repeat the same data URI. An inline
 * `data:` value is still accepted. A remote url with no table entry (not yet
 * resolved, or failed) yields null -> initials, so the WebView never fetches a
 * remote host itself.
 */
function resolveAvatarSrc(url: string | undefined): string | null {
  if (!url) return null;
  const fromTable = getAvatarImages()[url];
  if (isRenderableImageSrc(fromTable)) return fromTable;
  return /^data:image\//i.test(url) ? url : null;
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

  const src = resolveAvatarSrc(marker.avatarUrl);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
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
 * markerId -> ids of every marker in its current group (all n members, not just
 * the drawn faces), refreshed each positioning pass. A tap on any face opens the
 * sheet scoped to that whole group, so trades without a visible face are still
 * reachable. Read live at tap time (not baked into the element) because group
 * membership changes as groups merge/split on zoom.
 */
const tapGroupByMarkerId = new Map<string, string[]>();

/**
 * Face key -> the group-count disc element currently attached to that face.
 * Only the middle face of a group holding more trades than faces carries one;
 * refreshed every positioning pass so counts follow merges/splits on zoom.
 */
const countBadgeByFaceKey = new Map<string, HTMLDivElement>();

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
 * Group-count disc: the total number of trades in a group (e.g. "100", capped
 * at "99+"). Rendered as a standalone circle centered at the BOTTOM of the group
 * (just below the fanned faces, overlapping them slightly), so the faces sit
 * above it — matching the design. Count only — no +/− (direction is on each face).
 */
function buildCountBadge(label: string, theme: ChartTheme): HTMLDivElement {
  const badge = document.createElement('div');
  badge.textContent = label;
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
 * One drawn face: a single trader's avatar + its own buy(+)/sell(−) badge. A
 * group draws at most MAX_FACES of these; hidden members get no element and are
 * reachable via the shared tap group (`tapGroupByMarkerId`).
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
  countBadgeByFaceKey.clear();
  lastSignature = '';
  prevGroupKeys = new Set();
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
    layouts.push({ marker, barIdx, x, anchorPrice });
  }
  return layouts;
}

/** Create/remove face elements so they match the current face key set. */
function syncElements(
  faces: readonly AvatarCluster[],
  theme: ChartTheme,
): void {
  const overlay = ensureOverlayElement();
  if (!overlay) return;
  const elements = getAvatarElements();
  const wanted = new Set(faces.map((c) => c.key));

  for (const [key, el] of elements) {
    if (!wanted.has(key)) {
      el.remove();
      elements.delete(key);
      // The count disc (if any) was a child of `el`, so it's already detached.
      countBadgeByFaceKey.delete(key);
    }
  }

  for (const face of faces) {
    if (elements.has(face.key)) continue;
    const el = buildIndividualElement(face, theme);
    attachClusterTap(el, String(face.marker.id));
    overlay.appendChild(el);
    elements.set(face.key, el);
  }
}

/** Positions each face element at its current pixel X/Y for this frame. */
function positionClusters(
  faces: readonly AvatarCluster[],
  chart: TVActiveChart,
): void {
  const elements = getAvatarElements();
  for (const face of faces) {
    const el = elements.get(face.key);
    if (!el) continue;
    const centerX = face.x;
    const anchorPrice = face.y; // anchor price (see planGroupRender)
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
    // Fallback clamp: the reserved top margin normally leaves room, but when
    // auto-scale is off (user dragged the price axis) or the pane is too short
    // for the capped margin, keep the face fully inside the pane instead of
    // clipping it at the top.
    const centerY = Math.max(
      MIN_FACE_CENTER_Y,
      anchorY - MARKER_GAP_PX - AVATAR_SIZE / 2,
    );
    el.style.transform = `translate(calc(${centerX}px - 50%),calc(${centerY}px - 50%))`;
    el.style.display = 'block';
    // Reset stacking each frame; the badged face of a group is lifted above its
    // overlapping neighbours in updateGroupCountBadges (runs right after).
    el.style.zIndex = '0';
  }
}

/**
 * Keeps exactly one count disc per group that holds more trades than faces.
 * `badgeByFaceKey` maps the group's middle face key to its label (total n).
 * Discs are added/updated on those faces and removed everywhere else.
 */
function updateGroupCountBadges(
  badgeByFaceKey: ReadonlyMap<string, string>,
  theme: ChartTheme,
): void {
  const elements = getAvatarElements();
  for (const [faceKey, badge] of countBadgeByFaceKey) {
    if (!badgeByFaceKey.has(faceKey)) {
      badge.remove();
      countBadgeByFaceKey.delete(faceKey);
    }
  }
  for (const [faceKey, label] of badgeByFaceKey) {
    const el = elements.get(faceKey);
    if (!el) continue;
    // Lift the badged face above the rest of its group so its bottom-centered
    // count disc sits cleanly on top, never occluded by the other faces.
    el.style.zIndex = '5';
    const existing = countBadgeByFaceKey.get(faceKey);
    if (existing) {
      existing.textContent = label;
    } else {
      const badge = buildCountBadge(label, theme);
      el.appendChild(badge);
      countBadgeByFaceKey.set(faceKey, badge);
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
  // Keep headroom reserved for the faces (no-op unless pane height changed).
  setReservedTopPx(RESERVED_TOP_PX, chart);
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
  // One group per candle, then merge groups whose fixed-width footprints would
  // overlap (hysteresis against last frame's groups keeps zoom flicker-free).
  const groups = mergeOverlappingGroups(
    bucketByCandle(layouts),
    undefined,
    prevGroupKeys,
  );
  const plan = planGroupRender(groups, plotWidth);
  prevGroupKeys = plan.groupKeys;

  // Tapping any face reports its whole group (all n members, not just faces).
  tapGroupByMarkerId.clear();
  for (const [id, ids] of plan.tapIdsByMarkerId)
    tapGroupByMarkerId.set(id, ids);

  // Rebuild DOM only when the drawn face set changed (merge/split/new data);
  // pure pan/zoom frames just reposition the existing elements.
  const signature = plan.faces.map((c) => c.key).join(';');
  if (signature !== lastSignature) {
    syncElements(plan.faces, theme);
    lastSignature = signature;
  }
  positionClusters(plan.faces, chart);
  updateGroupCountBadges(plan.badgeByFaceKey, theme);
}

export function renderAvatarMarkers(): void {
  const markers = getAvatarMarkers();
  if (!markers?.length) {
    clearAvatarMarkers();
    setReservedTopPx(0);
    return;
  }
  if (!getTheme()) return;
  ensureOverlayElement();
  positionAvatarMarkers();
}

export function handleSetAvatarMarkers(payload: SetAvatarMarkersPayload): void {
  setAvatarMarkers(payload?.markers?.length ? payload.markers : null);
  setAvatarImages(payload?.avatars ?? null);
  if (getAvatarMarkers() === null) {
    clearAvatarMarkers();
    // Markers removed (e.g. flag off / no trades): give the headroom back.
    setReservedTopPx(0);
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
  prevGroupKeys = new Set();
}
