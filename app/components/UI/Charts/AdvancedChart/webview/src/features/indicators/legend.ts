// DOM legend overlay for active indicator studies.
//
// Ported from chartLogic.js: createStudyLegendOverlay (~4365),
// refreshStudyLegendFromExport (~4644), buildLegendHTML (~4497),
// updateLegendOverlayLayout (~4401), legend retry/timeout machinery
// (~4630-4785), getMainPriceAxisLeftRelativeTo (~1472).
//
// The overlay is a `<div id="study-legend-overlay">` injected into
// #tv_chart_container that holds one `.legend-pill` per active indicator.
// Theme-aware text colors are computed from CONFIG.theme; per-plot colors
// come from CONFIG.indicatorColors.
//
// `LEGEND_RENDERED` is posted to RN once the overlay has settled (either
// real values returned by chart.exportData() or after the retry timeout).

import { postToRN } from '../../core/bridge';
import {
  doesLegendOwnLayoutSettle,
  getActiveStudies,
  getLegendStudyOrder,
  getMaStudies,
  getStudyPaneIndexMap,
  getTheme,
  getVolumeStudyId,
  getWidget,
  isChartReady,
  setLegendOwnsLayoutSettle,
} from '../../core/state';
import { eachChartDocument } from '../../widget/tvDomHelpers';
import type {
  IndicatorColors,
  LegendIndicatorCfg,
  LegendOverlayConfig,
  LegendPlotCfg,
  StudyId,
  TVActiveChart,
  TVExportData,
} from '../../core/types';

const OVERLAY_ID = 'study-legend-overlay';
const OVERLAY_LEFT_PX = 8;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 100;
const RENDER_TIMEOUT_MS = 3000;

let exportGeneration = 0;
let retryCount = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let legendOverlayEnabled = false;
let indicatorColors: IndicatorColors | undefined;
/** Typed legend config from RN; when present, replaces the hardcoded buildPresetMap(). */
let legendConfig: Record<string, LegendIndicatorCfg> | undefined;
/** Sub-pane overlay elements keyed by pane index. */
const subPaneOverlays = new Map<number, HTMLDivElement>();

// ----- Lifecycle ---------------------------------------------------------

/** Called once on chart-ready to set up the DOM container. */
export function setupLegendOverlay(
  config: LegendOverlayConfig | undefined,
  colors: IndicatorColors | undefined,
): void {
  legendOverlayEnabled = Boolean(config?.enabled);
  indicatorColors = colors;
  legendConfig = config?.config;
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

/**
 * Returns the per-indicator legend config. When RN supplied a typed config via
 * legendOverlay.config (the single source of truth), use it directly.
 * Otherwise fall back to a minimal built-in map derived from indicatorColors.
 */
function getPresetMap(): Record<string, LegendIndicatorCfg> {
  if (legendConfig) return legendConfig;
  return buildFallbackPresetMap();
}

function buildFallbackPresetMap(): Record<string, LegendIndicatorCfg> {
  const macd = indicatorColors?.MACD ?? {};
  const rsi = indicatorColors?.RSI ?? {};
  const bol = indicatorColors?.BOL ?? {};
  const ma = indicatorColors?.MA ?? {};
  return {
    MACD: {
      subPaneLegend: true,
      plots: [
        { tvTitle: 'MACD', label: 'MACD(12,26)', color: macd.macd ?? null },
        { tvTitle: 'Signal', label: 'Signal', color: macd.signal ?? null },
        {
          tvTitle: 'Histogram',
          label: 'Hist',
          color: macd.histogramPositive ?? null,
        },
      ],
      useIndex: true,
    },
    RSI: {
      subPaneLegend: true,
      plots: [{ tvTitle: 'Plot', label: 'RSI(14)', color: rsi.plot ?? null }],
      useIndex: true,
    },
    BOL: {
      combineInOnePill: true,
      title: 'BB(20,2)',
      plots: [
        { tvTitle: 'Upper', label: 'U:', color: bol.upper ?? null },
        { tvTitle: 'Median', label: 'M:', color: bol.basis ?? null },
        { tvTitle: 'Lower', label: 'L:', color: bol.lower ?? null },
      ],
      useIndex: true,
    },
    Volume: {
      plots: [{ tvTitle: 'Vol', label: 'Vol', color: null }],
      useIndex: true,
    },
    MA5: {
      isMA: true,
      useIndex: true,
      plots: [{ tvTitle: 'Plot', label: 'MA(5)', color: ma.MA5 ?? null }],
    },
    MA10: {
      isMA: true,
      useIndex: true,
      plots: [{ tvTitle: 'Plot', label: 'MA(10)', color: ma.MA10 ?? null }],
    },
    MA20: {
      isMA: true,
      useIndex: true,
      plots: [{ tvTitle: 'Plot', label: 'MA(20)', color: ma.MA20 ?? null }],
    },
    MA50: {
      isMA: true,
      useIndex: true,
      plots: [{ tvTitle: 'Plot', label: 'MA(50)', color: ma.MA50 ?? null }],
    },
    MA200: {
      isMA: true,
      useIndex: true,
      plots: [{ tvTitle: 'Plot', label: 'MA(200)', color: ma.MA200 ?? null }],
    },
  };
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
  title: string;
  value: string;
}

interface StudyDataEntry {
  name: string;
  values: StudyValueEntry[];
}

function isEmptyValue(v: string): boolean {
  return !v || v === '' || v === 'n/a' || v === '∅';
}

function plotValue(
  cfg: LegendIndicatorCfg,
  plotCfg: LegendPlotCfg,
  plotIndex: number,
  values: StudyValueEntry[],
): string {
  if (cfg.useIndex && plotIndex < values.length) {
    return values[plotIndex].value;
  }
  const match = values.find((v) => v.title === plotCfg.tvTitle);
  return match?.value ?? '';
}

function wrapPill(innerHtml: string, color?: string): string {
  const style = color ? ` style="color:${color};"` : '';
  return `<span class="legend-pill"${style}>${innerHtml}</span>`;
}

function buildHTML(entries: StudyDataEntry[]): string {
  const altColor = getLegendAltColor();
  const presets = getPresetMap();
  const successColor = getTheme()?.successColor ?? 'rgb(38,166,154)';
  const pills: string[] = [];

  for (const entry of entries) {
    const cfg = presets[entry.name];
    if (!cfg) continue;

    if (cfg.isMA) {
      const ma = cfg.plots[0];
      const val = plotValue(cfg, ma, 0, entry.values);
      if (isEmptyValue(val)) continue;
      pills.push(wrapPill(`${ma.label} ${val}`, ma.color ?? undefined));
      continue;
    }

    if (cfg.combineInOnePill) {
      const labelColor = cfg.plots[0].color ?? successColor;
      let inner = `<span style="color:${labelColor}">${cfg.title ?? cfg.plots[0].label}</span>`;
      let hasValues = false;
      cfg.plots.forEach((plot, idx) => {
        const v = plotValue(cfg, plot, idx, entry.values);
        if (isEmptyValue(v)) return;
        hasValues = true;
        inner +=
          `<span style="color:${labelColor}">&nbsp;${plot.label}</span>` +
          `<span style="color:${altColor}">&nbsp;${v}</span>`;
      });
      if (hasValues) pills.push(wrapPill(inner));
      continue;
    }

    cfg.plots.forEach((plot, idx) => {
      const v = plotValue(cfg, plot, idx, entry.values);
      if (isEmptyValue(v)) return;
      const color = plot.color ?? successColor;
      const inner =
        `<span style="color:${color}">${plot.label}</span>` +
        `<span style="color:${altColor}">&nbsp;${v}</span>`;
      pills.push(wrapPill(inner));
    });
  }
  return pills.join('');
}

// ----- Refresh from chart.exportData() ----------------------------------

function collectStudyIdMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, id] of getActiveStudies().entries()) {
    map[String(id)] = name;
  }
  for (const [name, id] of getMaStudies().entries()) {
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
    if (values) result.push({ name, values });
  }
  return result;
}

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

function hasAnyEmpty(entries: StudyDataEntry[]): boolean {
  for (const entry of entries) {
    for (const v of entry.values) {
      if (isEmptyValue(v.value)) return true;
    }
  }
  return false;
}

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

function clearTimer(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function startTimeout(gen: number): void {
  clearTimer();
  timeoutId = setTimeout(() => {
    if (gen !== exportGeneration) return;
    retryCount = 0;
    clearTimer();
    notifyLegendRendered();
  }, RENDER_TIMEOUT_MS);
}

function scheduleRetry(gen: number): void {
  if (retryCount >= MAX_RETRIES) {
    retryCount = 0;
    clearTimer();
    notifyLegendRendered();
    return;
  }
  retryCount += 1;
  setTimeout(() => {
    if (gen === exportGeneration) refreshStudyLegendFromExport();
  }, RETRY_DELAY_MS);
}

function renderOverlay(entries: StudyDataEntry[]): void {
  const presets = getPresetMap();
  const paneIndexMap = getStudyPaneIndexMap();

  const mainEntries: StudyDataEntry[] = [];
  const subPaneGroups = new Map<number, StudyDataEntry[]>();

  for (const entry of entries) {
    const cfg = presets[entry.name];
    const paneIdx = paneIndexMap.get(entry.name);
    if (cfg?.subPaneLegend && paneIdx !== undefined) {
      let group = subPaneGroups.get(paneIdx);
      if (!group) {
        group = [];
        subPaneGroups.set(paneIdx, group);
      }
      group.push(entry);
    } else {
      mainEntries.push(entry);
    }
  }

  const mainOverlay = document.getElementById(OVERLAY_ID);
  if (mainOverlay) {
    mainOverlay.innerHTML = buildHTML(mainEntries);
  }

  const widget = getWidget();
  const chart = widget?.activeChart();

  const activePanes = new Set(subPaneGroups.keys());
  for (const paneIdx of subPaneOverlays.keys()) {
    if (!activePanes.has(paneIdx)) removeSubPaneOverlay(paneIdx);
  }

  for (const [paneIdx, group] of subPaneGroups) {
    const overlay = ensureSubPaneOverlay(paneIdx, chart ?? undefined);
    if (overlay) overlay.innerHTML = buildHTML(group);
  }

  updateLegendOverlayLayout();
  if (chart) repositionSubPaneOverlays(chart);
}

export function refreshStudyLegendFromExport(): void {
  if (!legendOverlayEnabled) return;
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;

  const studyIdMap = collectStudyIdMap();
  const studyIds = Object.keys(studyIdMap);
  if (studyIds.length === 0) {
    overlay.innerHTML = '';
    removeAllSubPaneOverlays();
    retryCount = 0;
    clearTimer();
    return;
  }

  const gen = ++exportGeneration;
  if (retryCount === 0) startTimeout(gen);

  const chart = widget.activeChart();
  chart
    .exportData({
      includeSeries: false,
      includedStudies: studyIds as StudyId[],
    })
    .then((data) => {
      if (gen !== exportGeneration) return;
      handleExportData(data, gen);
    })
    .catch(() => scheduleRetry(gen));
}

function isValidExportData(data: TVExportData): boolean {
  return Boolean(data?.schema && data.data && data.data.length > 0);
}

function resolveDisplayValue(
  rawVal: number | undefined,
  colIndex: number,
  displayedData: TVExportData['displayedData'],
): string {
  let displayVal =
    rawVal !== undefined && !Number.isNaN(rawVal)
      ? formatLegendValue(rawVal)
      : '';
  if (displayedData && displayedData.length > 0) {
    const dispRow = displayedData.at(-1);
    if (dispRow?.[colIndex]) displayVal = dispRow[colIndex];
  }
  return displayVal;
}

function buildStudyMap(
  data: TVExportData,
  lastRow: (number | undefined)[],
): Record<string, StudyValueEntry[]> {
  const byStudy: Record<string, StudyValueEntry[]> = {};
  for (let s = 0; s < data.schema.length; s++) {
    const field = data.schema[s];
    if (field.type === 'time' || field.type === 'userTime') continue;
    const sid = field.sourceId ? String(field.sourceId) : '';
    if (!sid) continue;
    if (!byStudy[sid]) byStudy[sid] = [];
    const displayVal = resolveDisplayValue(lastRow[s], s, data.displayedData);
    byStudy[sid].push({ title: field.plotTitle ?? '', value: displayVal });
  }
  return byStudy;
}

function handleExportData(data: TVExportData, gen: number): void {
  if (!isValidExportData(data)) {
    scheduleRetry(gen);
    return;
  }
  const lastRow = data.data.at(-1);
  if (!lastRow) {
    scheduleRetry(gen);
    return;
  }

  const byStudy = buildStudyMap(data, lastRow);
  const entries = buildOrderedEntries(byStudy);
  if (hasAnyEmpty(entries) && retryCount < MAX_RETRIES) {
    scheduleRetry(gen);
    return;
  }

  retryCount = 0;
  renderOverlay(entries);
  clearTimer();
  notifyLegendRendered();
}

/**
 * Used by indicator handlers to request a legend rebuild after a study has
 * been added/removed. Two rAFs to wait for TV's internal layout pass.
 */
export function scheduleLegendRefresh(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => refreshStudyLegendFromExport());
  });
}

/**
 * Subscribes to a study's onDataLoaded event so the legend refreshes once
 * the study's calculation finishes. Falls back to immediate refresh when
 * the subscription API isn't available.
 */
export function subscribeStudyDataLoaded(
  chart: TVActiveChart,
  studyId: StudyId,
): void {
  try {
    const study = chart.getStudyById(studyId);
    if (study?.onDataLoaded) {
      study.onDataLoaded().subscribe(null, () => {
        scheduleLegendRefresh();
      });
      return;
    }
  } catch {
    // Fallthrough to direct refresh.
  }
  scheduleLegendRefresh();
}

// ----- Sub-pane overlay management ----------------------------------------

function subPaneOverlayId(paneIndex: number): string {
  return `${OVERLAY_ID}-pane-${paneIndex}`;
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
  paneIndex: number,
  chart?: TVActiveChart,
): HTMLDivElement | null {
  const existing = subPaneOverlays.get(paneIndex);
  if (existing && document.contains(existing)) return existing;

  const container = document.getElementById('tv_chart_container');
  if (!container) return null;

  const div = document.createElement('div');
  div.id = subPaneOverlayId(paneIndex);
  const topPx = chart ? getSubPaneTopPx(paneIndex, chart) : 0;
  div.style.cssText =
    `position:absolute;top:${topPx}px;left:${OVERLAY_LEFT_PX}px;z-index:5;` +
    `pointer-events:none;display:flex;flex-wrap:wrap;align-items:flex-start;` +
    `column-gap:8px;row-gap:2px;`;
  container.appendChild(div);
  subPaneOverlays.set(paneIndex, div);
  return div;
}

export function removeSubPaneOverlay(paneIndex: number): void {
  const el = subPaneOverlays.get(paneIndex);
  if (el) {
    el.remove();
    subPaneOverlays.delete(paneIndex);
  }
}

function removeAllSubPaneOverlays(): void {
  for (const el of subPaneOverlays.values()) el.remove();
  subPaneOverlays.clear();
}

function repositionSubPaneOverlays(chart: TVActiveChart): void {
  for (const [paneIdx, el] of subPaneOverlays) {
    el.style.top = `${getSubPaneTopPx(paneIdx, chart)}px`;
  }
}

// ----- Layout ------------------------------------------------------------

function getMainPriceAxisLeftRelativeTo(el: HTMLElement): number | null {
  if (!el?.getBoundingClientRect) return null;
  const orect = el.getBoundingClientRect();
  let bestLeft: number | null = null;
  let bestTop = Infinity;
  eachChartDocument((doc) => {
    const nodes = doc.querySelectorAll('.price-axis-container');
    for (const node of Array.from(nodes)) {
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 16) continue;
      if (r.top < bestTop) {
        bestTop = r.top;
        bestLeft = r.left - orect.left;
      }
    }
  });
  if (bestLeft === null || Number.isNaN(bestLeft)) return null;
  const maxW = el.clientWidth;
  if (maxW <= 0) return null;
  return Math.max(0, Math.min(bestLeft, maxW));
}

export function updateLegendOverlayLayout(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  const container = document.getElementById('tv_chart_container');
  if (!overlay || !container) return;
  const scaleGap = 4;
  const boundaryLeft = getMainPriceAxisLeftRelativeTo(container);
  if (boundaryLeft !== null && boundaryLeft > OVERLAY_LEFT_PX + scaleGap) {
    overlay.style.maxWidth = `${boundaryLeft - OVERLAY_LEFT_PX - scaleGap}px`;
  } else {
    overlay.style.maxWidth = 'calc(100% - 56px)';
  }
}

/** Test-only: clear all module-local state between cases. */
export function __resetLegendForTests(): void {
  exportGeneration = 0;
  retryCount = 0;
  clearTimer();
  legendOverlayEnabled = false;
  indicatorColors = undefined;
  legendConfig = undefined;
  removeAllSubPaneOverlays();
}
