// DOM legend overlay for active indicator studies.
//
// Ported from chartLogic.js: createStudyLegendOverlay (~4365),
// refreshStudyLegendFromExport (~4644), buildLegendHTML (~4497),
// updateLegendOverlayLayout (~4401), legend retry/timeout machinery
// (~4630-4785), getMainPriceAxisLeftRelativeTo (~1472).
//
// The overlay is a `<div id="study-legend-overlay">` injected into
// #tv_chart_container that holds one `.legend-pill` per active indicator.
// Theme-aware text colors are computed from CONFIG.theme; labels and per-plot
// colors come from the `legend` block of each RN-supplied indicator definition
// (CONFIG.indicatorDefinitions). Indicators without a `legend` block get no pill.
//
// Values come from TradingView, never recomputed here:
//   - resting state: chart.exportData({ from: lastBar, includeDisplayedValues })
//     → last-bar values, already formatted by TV (displayedData)
//   - scrubbing:     crossHairMoved().entityValues → hovered-bar values,
//     already formatted by TV
// Plots are matched by TV plot title (`tvTitle`), never by column index.
//
// `LEGEND_RENDERED` is posted to RN once the overlay has settled (either
// real values returned by chart.exportData() or after the retry timeout).

import { postToRN } from '../../core/bridge';
import {
  doesLegendOwnLayoutSettle,
  getActiveStudies,
  getLegendStudyOrder,
  getOhlcvData,
  getTheme,
  getVolumeStudyId,
  getWidget,
  isChartReady,
  setLegendOwnsLayoutSettle,
} from '../../core/state';
import { eachChartDocument } from '../../widget/tvDomHelpers';
import type {
  IndicatorDefinitionCfg,
  IndicatorDefinitionsCfg,
  IndicatorLegendCfg,
  LegendMode,
  LegendPlotCfg,
  StudyId,
  TVActiveChart,
  TVCrosshairSource,
  TVExportData,
} from '../../core/types';
import { getIndicatorDefinition } from './studies';

const OVERLAY_ID = 'study-legend-overlay';
/** Must match MA_GROUP in indicatorRegistry.ts. */
const MA_GROUP = 'MA';
const OVERLAY_LEFT_PX = 8;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 100;
const RENDER_TIMEOUT_MS = 3000;
const REALTIME_THROTTLE_MS = 1000;

let exportGeneration = 0;
let retryCount = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let realtimeTimerId: ReturnType<typeof setTimeout> | null = null;
/** A non-silent refresh is waiting to post LEGEND_RENDERED. */
let pendingNotify = false;
/**
 * S11: the current export generation came from a silent refresh (realtime
 * tick / crosshair dismiss). Silent refreshes never retry — retries exist only
 * to wait for studies to finish computing after a load / resolution change.
 */
let currentRefreshSilent = false;
/** True while the user scrubs (crosshair visible). */
let crosshairActive = false;
/** Last entries built from an export — rendered if retries run out. */
let lastEntries: StudyDataEntry[] | null = null;
/** Study ids that fired onStudyError — never block rendering on them. */
const erroredStudies = new Set<string>();
let legendOverlayEnabled = false;
/** Indicator registry from RN — the single source of truth for legend rendering. */
let indicatorDefinitions: IndicatorDefinitionsCfg | undefined;
/** Sub-pane overlay elements keyed by indicator name. */
const subPaneOverlays = new Map<string, HTMLDivElement>();

// ----- Lifecycle ---------------------------------------------------------

/**
 * Called once on chart-ready. Builds the DOM container only when the
 * consumer opted into the custom overlay (`legendMode: 'overlay'`).
 */
export function setupLegendOverlay(
  legendMode: LegendMode | undefined,
  definitions: IndicatorDefinitionsCfg | undefined,
): void {
  legendOverlayEnabled = legendMode === 'overlay';
  indicatorDefinitions = definitions;
  if (!legendOverlayEnabled) return;
  createOverlayElement();
  injectHideLegendButtonsCSS();
}

/**
 * Subscribes to the widget's `panes_height_changed` event so the overlay
 * max-width is recomputed whenever a pane resize (e.g. after adding MACD
 * or RSI) shifts the price-axis boundary.
 */
export function attachLegendResizeListener(widget: {
  subscribe(event: 'panes_height_changed', handler: () => void): void;
  activeChart(): TVActiveChart;
}): void {
  try {
    widget.subscribe('panes_height_changed', () => {
      const el = document.getElementById(OVERLAY_ID);
      if (el) updateLegendOverlayLayout();
      repositionSubPaneOverlays(widget.activeChart());
    });
  } catch {
    // TV may throw if subscribe isn't ready; safe to ignore.
  }
}

function createOverlayElement(): void {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
  const container = document.getElementById('tv_chart_container');
  if (!container) return;
  const div = document.createElement('div');
  div.id = OVERLAY_ID;
  div.style.cssText =
    `position:absolute;top:1px;left:${OVERLAY_LEFT_PX}px;z-index:5;` +
    `pointer-events:none;display:flex;flex-wrap:wrap;align-items:flex-start;` +
    `column-gap:8px;row-gap:2px;`;
  container.style.position = 'relative';
  container.appendChild(div);
}

function injectHideLegendButtonsCSS(): void {
  const styleId = 'mm-hide-legend-buttons';
  if (document.getElementById(styleId)) return;
  let targetDoc: Document = document;
  eachChartDocument((doc) => {
    if (targetDoc === document && doc !== document) targetDoc = doc;
  });
  const style = targetDoc.createElement('style');
  style.id = styleId;
  style.textContent =
    '.chart-controls-bar .apply-common-tooltip,' +
    '.legendElement .showHide,' +
    '.legendElement button[data-name="legend-show-hide-action"],' +
    '.legendElement button[data-name="legend-settings-action"],' +
    '.legendElement button[data-name="legend-delete-action"],' +
    '.legendElement .buttons-wrapper,' +
    '.legendElement .buttonsWrapper{display:none!important;}';
  targetDoc.head.appendChild(style);
}

// ----- Legend rebuild ---------------------------------------------------

function getDefinition(name: string): IndicatorDefinitionCfg | undefined {
  return getIndicatorDefinition(indicatorDefinitions, name);
}

/** Legend block for `name`, or undefined when it has no overlay pill. */
function getLegendCfg(name: string): IndicatorLegendCfg | undefined {
  return getDefinition(name)?.legend;
}

function isSubPaneIndicator(name: string): boolean {
  return getDefinition(name)?.study.pane === 'sub';
}

export function isLegendOverlayEnabled(): boolean {
  return legendOverlayEnabled;
}

function getLegendAltColor(): string {
  const theme = getTheme();
  return (
    theme?.legendTextColor ??
    theme?.textAlternativeColor ??
    theme?.textColor ??
    'rgb(133,136,152)'
  );
}

interface StudyValueEntry {
  /** TV plot title (export `plotTitle` / crosshair value `title`). */
  title: string;
  /** Value as formatted by TradingView ('' when unavailable). */
  display: string;
  /** Raw numeric value (export only). */
  raw?: number;
}

interface StudyDataEntry {
  name: string;
  sid: string;
  values: StudyValueEntry[];
}

function isEmptyValue(v: string | undefined): boolean {
  return !v || v === 'n/a' || v === '∅' || v === 'NaN';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** TV writes negatives with U+2212; never parseFloat a displayed string. */
function isNegative(entry: StudyValueEntry | undefined): boolean {
  if (!entry) return false;
  if (isFiniteNumber(entry.raw)) return entry.raw < 0;
  const s = entry.display.trim();
  return s.startsWith('-') || s.startsWith('\u2212');
}

function findPlot(
  values: StudyValueEntry[],
  plotCfg: LegendPlotCfg,
): StudyValueEntry | undefined {
  return values.find((v) => v.title === plotCfg.tvTitle);
}

/**
 * Resolves the display string for one configured plot. Plots are matched by
 * TV plot title only — never by column position (H1).
 */
function plotValue(
  entry: StudyDataEntry,
  cfg: IndicatorLegendCfg,
  plotCfg: LegendPlotCfg,
): string {
  const match = findPlot(entry.values, plotCfg);
  if (!match) return '';
  if (cfg.valueFormat === 'compact' && isFiniteNumber(match.raw)) {
    return formatLegendValue(match.raw);
  }
  if (!isEmptyValue(match.display)) return match.display;
  if (isFiniteNumber(match.raw)) return formatLegendValue(match.raw);
  return '';
}

function plotColor(
  entry: StudyDataEntry,
  cfg: IndicatorLegendCfg,
  plotCfg: LegendPlotCfg,
  fallback: string,
): string {
  const base = plotCfg.color ?? fallback;
  if (
    cfg.negativeColorPlot &&
    cfg.negativeColor &&
    plotCfg.tvTitle === cfg.negativeColorPlot
  ) {
    return isNegative(findPlot(entry.values, plotCfg))
      ? cfg.negativeColor
      : base;
  }
  return base;
}

function wrapPill(innerHtml: string, color?: string): string {
  const style = color ? ` style="color:${color};"` : '';
  return `<span class="legend-pill"${style}>${innerHtml}</span>`;
}

function buildHTML(entries: StudyDataEntry[]): string {
  const altColor = getLegendAltColor();
  const successColor = getTheme()?.successColor ?? 'rgb(38,166,154)';
  const pills: string[] = [];

  for (const entry of entries) {
    const cfg = getLegendCfg(entry.name);
    if (!cfg || cfg.plots.length === 0) continue;

    // Moving averages render as one compact pill in the plot color:
    // "MA(20) 1.23".
    if (getDefinition(entry.name)?.group === MA_GROUP) {
      const ma = cfg.plots[0];
      const val = plotValue(entry, cfg, ma);
      if (isEmptyValue(val)) continue;
      pills.push(wrapPill(`${ma.label} ${val}`, ma.color ?? undefined));
      continue;
    }

    if (cfg.title) {
      const labelColor = cfg.plots[0].color ?? successColor;
      let inner = `<span style="color:${labelColor}">${cfg.title}</span>`;
      let hasValues = false;
      for (const plot of cfg.plots) {
        const v = plotValue(entry, cfg, plot);
        if (isEmptyValue(v)) continue;
        hasValues = true;
        inner +=
          `<span style="color:${labelColor}">&nbsp;${plot.label}</span>` +
          `<span style="color:${altColor}">&nbsp;${v}</span>`;
      }
      if (hasValues) pills.push(wrapPill(inner));
      continue;
    }

    for (const plot of cfg.plots) {
      const v = plotValue(entry, cfg, plot);
      if (isEmptyValue(v)) continue;
      const color = plotColor(entry, cfg, plot, successColor);
      const inner =
        `<span style="color:${color}">${plot.label}</span>` +
        `<span style="color:${altColor}">&nbsp;${v}</span>`;
      pills.push(wrapPill(inner));
    }
  }
  return pills.join('');
}

// ----- Study id bookkeeping ------------------------------------------------

function collectStudyIdMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, id] of getActiveStudies().entries()) {
    map[String(id)] = name;
  }
  const vol = getVolumeStudyId();
  if (vol) map[String(vol)] = 'Volume';
  return map;
}

function buildOrderedEntries(
  byStudy: Record<string, StudyValueEntry[]>,
): StudyDataEntry[] {
  const result: StudyDataEntry[] = [];
  for (const [name, studyId] of getLegendStudyOrder().entries()) {
    const sid = String(studyId);
    const values = byStudy[sid];
    if (values) result.push({ name, sid, values });
  }
  return result;
}

/** Compact K/M/B formatting — only used for `valueFormat: 'compact'` (Volume) and as a fallback. */
function formatLegendValue(num: number): string {
  if (!Number.isFinite(num)) return '';
  const abs = Math.abs(num);
  if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${(num / 1e3).toFixed(1)}K`;
  if (abs >= 1000) return num.toFixed(2);
  if (abs >= 1) return num.toFixed(2);
  if (abs >= 0.01) return num.toFixed(4);
  return num.toPrecision(4);
}

/**
 * S11: a study whose `length` input exceeds the loaded bar count can never
 * produce a last-bar value — e.g. MA200 on a 1W series with < 200 bars.
 * Retrying for it is pointless, so it is excluded from the retry check (its
 * pill renders without a value, same as after retries were exhausted before).
 */
function hasInsufficientHistory(name: string): boolean {
  const length = getDefinition(name)?.study.inputs?.length;
  if (typeof length !== 'number' || !Number.isFinite(length)) return false;
  return getOhlcvData().length < length;
}

/**
 * M4: only columns the legend config actually consumes can block rendering.
 * Unused columns (e.g. hidden "Smoothed MA"), studies that reported an error
 * and MAs without enough bars (S11) are ignored.
 */
function getConsumedEmpty(
  entries: StudyDataEntry[],
): { study: string; tvTitle: string }[] {
  const consumedEmpty: { study: string; tvTitle: string }[] = [];
  for (const entry of entries) {
    const cfg = getLegendCfg(entry.name);
    if (
      !cfg ||
      erroredStudies.has(entry.sid) ||
      hasInsufficientHistory(entry.name)
    ) {
      continue;
    }
    for (const plot of cfg.plots) {
      const m = findPlot(entry.values, plot);
      if (!m || (isEmptyValue(m.display) && !isFiniteNumber(m.raw))) {
        consumedEmpty.push({ study: entry.name, tvTitle: plot.tvTitle });
      }
    }
  }
  return consumedEmpty;
}

// ----- Settle / notify -------------------------------------------------------

function notifyLegendRendered(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      postToRN('LEGEND_RENDERED', {});
      if (doesLegendOwnLayoutSettle()) {
        setLegendOwnsLayoutSettle(false);
        postToRN('CHART_LAYOUT_SETTLED', {});
      }
    });
  });
}

/** Sends LEGEND_RENDERED if a non-silent refresh is waiting for it. */
function settlePendingNotify(): void {
  if (!pendingNotify) return;
  pendingNotify = false;
  clearTimer();
  notifyLegendRendered();
}

function clearTimer(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function startTimeout(): void {
  clearTimer();
  timeoutId = setTimeout(() => {
    timeoutId = null;
    retryCount = 0;
    settlePendingNotify();
  }, RENDER_TIMEOUT_MS);
}

function scheduleRetry(gen: number): void {
  if (retryCount >= MAX_RETRIES) {
    retryCount = 0;
    // Render whatever we have (pills with empty values are skipped).
    if (lastEntries && !crosshairActive) renderOverlay(lastEntries);
    settlePendingNotify();
    return;
  }
  retryCount += 1;
  setTimeout(() => {
    if (gen === exportGeneration) runExport(true);
  }, RETRY_DELAY_MS);
}

// ----- Render -----------------------------------------------------------------

/** v30.1.0 `getStudyById` throws for unknown/removed ids. */
function getStudyPaneIndex(
  chart: TVActiveChart,
  studyId: StudyId,
): number | undefined {
  try {
    return chart.getStudyById(studyId)?.paneIndex?.();
  } catch {
    return undefined;
  }
}

function renderOverlay(entries: StudyDataEntry[]): void {
  const widget = getWidget();
  const chart = widget?.activeChart();
  const activeStudies = getActiveStudies();

  const mainEntries: StudyDataEntry[] = [];
  const subPaneEntries: {
    name: string;
    paneIdx: number;
    entry: StudyDataEntry;
  }[] = [];

  for (const entry of entries) {
    if (isSubPaneIndicator(entry.name) && chart) {
      const studyId = activeStudies.get(entry.name);
      const paneIdx = studyId ? getStudyPaneIndex(chart, studyId) : undefined;
      if (paneIdx !== undefined && paneIdx > 0) {
        subPaneEntries.push({ name: entry.name, paneIdx, entry });
        continue;
      }
    }
    mainEntries.push(entry);
  }

  const mainOverlay = document.getElementById(OVERLAY_ID);
  if (mainOverlay) {
    mainOverlay.innerHTML = buildHTML(mainEntries);
  }

  const activeNames = new Set(subPaneEntries.map((s) => s.name));
  for (const name of subPaneOverlays.keys()) {
    if (!activeNames.has(name)) removeSubPaneOverlay(name);
  }

  for (const { name, paneIdx, entry } of subPaneEntries) {
    const overlay = ensureSubPaneOverlay(name, paneIdx, chart ?? undefined);
    if (overlay) overlay.innerHTML = buildHTML([entry]);
  }

  updateLegendOverlayLayout();
  if (chart) repositionSubPaneOverlays(chart);
}

// ----- Refresh from chart.exportData() ----------------------------------

export interface LegendRefreshOptions {
  /**
   * Silent refreshes (realtime ticks, crosshair dismiss) update the DOM but
   * do not post LEGEND_RENDERED / CHART_LAYOUT_SETTLED.
   */
  silent?: boolean;
}

function getLastBarTimeSec(): number | undefined {
  const last = getOhlcvData().at(-1);
  if (!last || !isFiniteNumber(last.time)) return undefined;
  return Math.floor(last.time / 1000);
}

/**
 * Rebuilds the overlay from the last bar's study values. Starts a new
 * generation: any in-flight export / retry for an older generation is
 * dropped and the retry budget is reset.
 */
export function refreshStudyLegendFromExport(
  options: LegendRefreshOptions = {},
): void {
  if (!legendOverlayEnabled) return;
  if (!getWidget() || !isChartReady()) return;
  // Don't overwrite scrubbed values with last-bar values.
  if (crosshairActive && options.silent) return;
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  // New generation: reset retry budget (L5 hardening).
  retryCount = 0;
  currentRefreshSilent = !!options.silent;
  if (!options.silent) {
    pendingNotify = true;
    startTimeout();
  }

  const studyIds = Object.keys(collectStudyIdMap());
  if (studyIds.length === 0) {
    ++exportGeneration;
    overlay.innerHTML = '';
    removeAllSubPaneOverlays();
    lastEntries = null;
    // Nothing to wait for — keep previous behaviour (no LEGEND_RENDERED;
    // RN only waits for the legend when indicators are expected).
    pendingNotify = false;
    clearTimer();
    return;
  }

  runExport(false);
}

function runExport(isRetry: boolean, disableFrom = false): void {
  const widget = getWidget();
  if (!widget) return;
  const studyIds = Object.keys(collectStudyIdMap()) as StudyId[];
  if (studyIds.length === 0) return;

  const gen = isRetry || disableFrom ? exportGeneration : ++exportGeneration;
  const chart = widget.activeChart();
  // M3: export only the last bar instead of the whole loaded history.
  const from = disableFrom ? undefined : getLastBarTimeSec();
  const options = {
    includeSeries: false,
    includeDisplayedValues: true,
    includeOffsetStudyValues: false,
    includedStudies: studyIds,
    ...(from !== undefined ? { from } : {}),
  };
  chart
    .exportData(options)
    .then((data) => {
      if (gen !== exportGeneration) return;
      if (from !== undefined && data?.data?.length === 0) {
        // Nothing at/after the last bar time — fall back to a full export.
        runExport(true, true);
        return;
      }
      handleExportData(data, gen);
    })
    .catch(() => {
      if (gen === exportGeneration) scheduleRetry(gen);
    });
}

function isValidExportData(data: TVExportData): boolean {
  return Boolean(data?.schema && data.data && data.data.length > 0);
}

function buildStudyMapFromExport(
  data: TVExportData,
): Record<string, StudyValueEntry[]> {
  const lastIdx = data.data.length - 1;
  const lastRow = data.data[lastIdx];
  const dispRow = data.displayedData?.[lastIdx];
  const byStudy: Record<string, StudyValueEntry[]> = {};
  for (let s = 0; s < data.schema.length; s++) {
    const field = data.schema[s];
    if (field.type === 'time' || field.type === 'userTime') continue;
    const sid = field.sourceId ? String(field.sourceId) : '';
    if (!sid) continue;
    if (!byStudy[sid]) byStudy[sid] = [];
    const rawVal = lastRow?.[s];
    byStudy[sid].push({
      title: field.plotTitle ?? '',
      display: dispRow?.[s] ?? '',
      raw: isFiniteNumber(rawVal) ? rawVal : undefined,
    });
  }
  return byStudy;
}

function handleExportData(data: TVExportData, gen: number): void {
  if (!isValidExportData(data) || !data.data.at(-1)) {
    scheduleRetry(gen);
    return;
  }
  const entries = buildOrderedEntries(buildStudyMapFromExport(data));
  lastEntries = entries;
  const consumedEmpty = getConsumedEmpty(entries);
  if (consumedEmpty.length > 0) {
    // S11: a silent refresh (realtime / crosshair dismiss) never retries,
    // unless a non-silent refresh it superseded is still waiting to settle.
    const allowRetry = !currentRefreshSilent || pendingNotify;
    if (allowRetry && retryCount < MAX_RETRIES) {
      scheduleRetry(gen);
      return;
    }
  }
  retryCount = 0;
  if (crosshairActive) {
    // User is scrubbing; keep crosshair values on screen.
    settlePendingNotify();
    return;
  }
  renderOverlay(entries);
  settlePendingNotify();
}

/**
 * Used by indicator handlers to request a legend rebuild after a study has
 * been added/removed. Two rAFs to wait for TV's internal layout pass.
 */
export function scheduleLegendRefresh(
  options: LegendRefreshOptions = {},
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => refreshStudyLegendFromExport(options));
  });
}

// ----- Crosshair (H2) -----------------------------------------------------

/**
 * Renders the legend from crossHairMoved `entityValues` (already formatted by
 * TV for the hovered bar). Bumps the export generation so an in-flight
 * export can't overwrite the scrubbed values.
 */
export function renderLegendFromEntityValues(
  entityValues: Record<string, TVCrosshairSource> | undefined,
): void {
  if (!legendOverlayEnabled) return;
  if (!document.getElementById(OVERLAY_ID)) return;
  const studyIdMap = collectStudyIdMap();
  const studyIds = Object.keys(studyIdMap);
  if (studyIds.length === 0) return;
  if (!entityValues) return;
  crosshairActive = true;
  ++exportGeneration;

  const byStudy: Record<string, StudyValueEntry[]> = {};
  for (const sid of studyIds) {
    const src = entityValues[sid];
    if (!src || !Array.isArray(src.values)) continue;
    byStudy[sid] = src.values.map((v) => ({
      title: String(v?.title ?? ''),
      display: typeof v?.value === 'string' ? v.value : '',
    }));
  }
  renderOverlay(buildOrderedEntries(byStudy));
  // If the initial legend was still pending, it's rendered now.
  settlePendingNotify();
}

/** Crosshair dismissed — go back to last-bar values. */
export function onLegendCrosshairDismissed(): void {
  if (!crosshairActive) return;
  crosshairActive = false;
  scheduleLegendRefresh({ silent: true });
}

// ----- Realtime (M2) -------------------------------------------------------

/**
 * Trailing-throttled legend refresh for realtime ticks. Skipped while the
 * crosshair is active so scrubbed values aren't overwritten.
 */
export function requestLegendRealtimeRefresh(): void {
  if (!legendOverlayEnabled) return;
  if (crosshairActive) return;
  // Already scheduled — this tick is coalesced into the trailing refresh.
  if (realtimeTimerId !== null) return;
  realtimeTimerId = setTimeout(() => {
    realtimeTimerId = null;
    refreshStudyLegendFromExport({ silent: true });
  }, REALTIME_THROTTLE_MS);
}

// ----- Study lifecycle -----------------------------------------------------

/**
 * Subscribes to a study's onDataLoaded / onStudyError events so the legend
 * refreshes once the study's calculation finishes (or stops waiting for a
 * study that failed). Falls back to an immediate refresh when the
 * subscription API isn't available.
 */
export function subscribeStudyDataLoaded(
  chart: TVActiveChart,
  studyId: StudyId,
): void {
  const sid = String(studyId);
  erroredStudies.delete(sid);
  try {
    const study = chart.getStudyById(studyId);
    if (study?.onDataLoaded) {
      study.onDataLoaded().subscribe(null, () => {
        scheduleLegendRefresh();
      });
      try {
        study.onStudyError?.().subscribe(null, () => {
          erroredStudies.add(sid);
          scheduleLegendRefresh();
        });
      } catch {
        // onStudyError is best-effort.
      }
      return;
    }
  } catch {
    // Fallthrough to direct refresh.
  }
  scheduleLegendRefresh();
}

// ----- Sub-pane overlay management ----------------------------------------

function subPaneOverlayId(name: string): string {
  return `${OVERLAY_ID}-pane-${name}`;
}

function getSubPaneTopPx(paneIndex: number, chart: TVActiveChart): number {
  const heights = chart.getAllPanesHeight();
  let top = 0;
  for (let i = 0; i < paneIndex && i < heights.length; i++) {
    top += heights[i];
  }
  return top + 4;
}

function ensureSubPaneOverlay(
  name: string,
  paneIndex: number,
  chart?: TVActiveChart,
): HTMLDivElement | null {
  const existing = subPaneOverlays.get(name);
  if (existing && document.contains(existing)) return existing;

  const container = document.getElementById('tv_chart_container');
  if (!container) return null;

  const div = document.createElement('div');
  div.id = subPaneOverlayId(name);
  const topPx = chart ? getSubPaneTopPx(paneIndex, chart) : 0;
  div.style.cssText =
    `position:absolute;top:${topPx}px;left:${OVERLAY_LEFT_PX}px;z-index:5;` +
    `pointer-events:none;display:flex;flex-wrap:wrap;align-items:flex-start;` +
    `column-gap:8px;row-gap:2px;`;
  container.appendChild(div);
  subPaneOverlays.set(name, div);
  return div;
}

export function removeSubPaneOverlay(name: string): void {
  const el = subPaneOverlays.get(name);
  if (el) {
    el.remove();
    subPaneOverlays.delete(name);
  }
}

function removeAllSubPaneOverlays(): void {
  for (const el of subPaneOverlays.values()) el.remove();
  subPaneOverlays.clear();
}

function repositionSubPaneOverlays(chart: TVActiveChart): void {
  const activeStudies = getActiveStudies();
  for (const [name, el] of subPaneOverlays) {
    const studyId = activeStudies.get(name);
    // getStudyById throws for removed ids in v30.1.0 — handled inside.
    const paneIdx = studyId ? getStudyPaneIndex(chart, studyId) : undefined;
    if (paneIdx !== undefined && paneIdx > 0) {
      el.style.top = `${getSubPaneTopPx(paneIdx, chart)}px`;
    }
  }
}

// ----- Layout ------------------------------------------------------------

const FALLBACK_SCALE_WIDTH = 48;
const SCALE_GAP = 4;

/**
 * Width of the right price axis. v30.1.0 `IPriceScaleApi` has no `width()`,
 * so derive it from the container width minus the time scale (plot area)
 * width.
 */
function getPriceScaleWidth(containerWidth: number): number {
  const widget = getWidget();
  if (!widget) return FALLBACK_SCALE_WIDTH;
  let timeScaleWidth: number | undefined;
  try {
    timeScaleWidth = widget.activeChart().getTimeScale().width?.();
  } catch {
    timeScaleWidth = undefined;
  }
  if (
    !isFiniteNumber(timeScaleWidth) ||
    timeScaleWidth <= 0 ||
    timeScaleWidth >= containerWidth
  ) {
    return FALLBACK_SCALE_WIDTH;
  }
  return containerWidth - timeScaleWidth;
}

export function updateLegendOverlayLayout(): void {
  const container = document.getElementById('tv_chart_container');
  if (!container) return;
  const containerWidth = container.clientWidth;
  if (containerWidth <= 0) return;

  const scaleWidth = getPriceScaleWidth(containerWidth);
  const maxWidth = `${containerWidth - OVERLAY_LEFT_PX - scaleWidth - SCALE_GAP}px`;

  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.style.maxWidth = maxWidth;

  for (const el of subPaneOverlays.values()) {
    el.style.maxWidth = maxWidth;
  }
}

/** Test-only: clear all module-local state between cases. */
export function __resetLegendForTests(): void {
  exportGeneration = 0;
  retryCount = 0;
  currentRefreshSilent = false;
  clearTimer();
  if (realtimeTimerId !== null) clearTimeout(realtimeTimerId);
  realtimeTimerId = null;
  pendingNotify = false;
  crosshairActive = false;
  lastEntries = null;
  erroredStudies.clear();
  legendOverlayEnabled = false;
  indicatorDefinitions = undefined;
  removeAllSubPaneOverlays();
}
