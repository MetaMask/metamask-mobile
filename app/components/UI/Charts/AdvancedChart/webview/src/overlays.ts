/**
 * Custom crosshair labels, last-close price pill, and visible-edge outline pill.
 */

import { getState } from './state';
import { getLineChrome } from './lineChrome';
import { formatCrosshairPrice, formatCrosshairTime } from './crosshairFormat';
import {
  normalizeChartUnixSec,
  getApproxBarDurationSec,
  interpolateCloseAlongLineAtTimeMs,
  chartRawTimeToUnixMs,
  parseTimeFromTvDataLast,
  parseCloseFromTvDataLast,
} from './timeUtils';
import { eachChartDocument } from './tvDomHacks';
import type { TVActiveChart, TVCrosshairParams, OHLCVBar } from './types';

/* eslint-disable @metamask/design-tokens/color-no-hex */

export function hideCustomCrosshairLabels(): void {
  const elP = document.getElementById('crosshair-price-label');
  const elT = document.getElementById('crosshair-time-label');
  if (elP) {
    elP.style.display = 'none';
    elP.style.left = '';
    elP.style.right = '';
    elP.style.transform = '';
  }
  if (elT) {
    elT.style.display = 'none';
    elT.style.left = '';
    elT.style.transform = '';
  }
  scheduleLastCloseLabelUpdate();
}

export function getMainPriceAxisLeftRelativeToOverlay(
  overlay: HTMLElement,
): number | null {
  if (!overlay?.getBoundingClientRect) return null;
  const orect = overlay.getBoundingClientRect();
  let bestLeft: number | null = null;
  let bestTop = Infinity;
  eachChartDocument((doc) => {
    const nodes = doc.querySelectorAll('.price-axis-container');
    for (const node of Array.from(nodes)) {
      const r = (node as HTMLElement).getBoundingClientRect();
      if (r.width < 2 || r.height < 16) continue;
      if (r.top < bestTop) {
        bestTop = r.top;
        bestLeft = r.left - orect.left;
      }
    }
  });
  if (bestLeft === null || isNaN(bestLeft)) return null;
  const maxW = overlay.clientWidth;
  if (maxW <= 0) return null;
  return Math.max(0, Math.min(bestLeft, maxW));
}

export function positionPricePillAtPlotPriceBoundary(
  el: HTMLElement | null,
  overlay: HTMLElement | null,
  yPx: number,
): void {
  if (!el) return;
  el.style.top = yPx + 'px';
  if (!overlay) {
    el.style.left = 'auto';
    el.style.right = '0';
    el.style.transform = 'translateY(-50%)';
    return;
  }
  const boundaryLeft = getMainPriceAxisLeftRelativeToOverlay(overlay);
  if (boundaryLeft !== null && !isNaN(boundaryLeft) && boundaryLeft >= 0) {
    const w = el.offsetWidth || 0;
    let pillLeft = boundaryLeft + 2;
    const maxW = overlay.clientWidth;
    if (maxW > 0) {
      pillLeft = Math.max(0, Math.min(pillLeft, maxW - w));
    }
    el.style.left = pillLeft + 'px';
    el.style.right = 'auto';
    el.style.transform = 'translateY(-50%)';
  } else {
    el.style.left = 'auto';
    el.style.right = '0';
    el.style.transform = 'translateY(-50%)';
  }
}

export function updateCustomCrosshairLabels(params: TVCrosshairParams): void {
  const elP = document.getElementById('crosshair-price-label');
  const elT = document.getElementById('crosshair-time-label');
  const overlay = document.getElementById('custom-crosshair-overlay');
  if (!elP || !elT || !overlay) return;
  if (!getLineChrome().useCustomPriceLabels) {
    hideCustomCrosshairLabels();
    return;
  }
  const ox = params.offsetX;
  const oy = params.offsetY;
  if (ox === undefined || oy === undefined || isNaN(ox) || isNaN(oy)) {
    hideCustomCrosshairLabels();
    return;
  }
  elP.textContent = formatCrosshairPrice(params.price);
  const tSec = params.userTime ?? params.time;
  elT.textContent = formatCrosshairTime(tSec);
  elP.style.display = 'flex';
  elT.style.display = 'flex';

  function positionPricePill() {
    positionPricePillAtPlotPriceBoundary(elP, overlay, oy);
  }
  positionPricePill();
  try {
    requestAnimationFrame(positionPricePill);
  } catch {
    /* */
  }

  const ow = overlay.clientWidth;
  function positionTimeLabel() {
    if (!elT) return;
    const tw = elT.offsetWidth;
    const halfTw = tw / 2;
    const clampedOx = Math.max(halfTw, Math.min(ox, ow - halfTw));
    elT.style.left = clampedOx + 'px';
    elT.style.transform = 'translateX(-50%)';
  }
  positionTimeLabel();
  try {
    requestAnimationFrame(positionTimeLabel);
  } catch {
    /* */
  }
}

export function scheduleLastCloseLabelUpdate(): void {
  if (!getLineChrome().useCustomPriceLabels) return;
  const s = getState();
  if (s.lastCloseLabelScheduled) return;
  s.lastCloseLabelScheduled = true;
  try {
    requestAnimationFrame(() => {
      s.lastCloseLabelScheduled = false;
      updateLastClosePriceLabel();
      updateVisibleEdgeOutlinePriceLabel();
    });
  } catch {
    s.lastCloseLabelScheduled = false;
    setTimeout(() => {
      updateLastClosePriceLabel();
      updateVisibleEdgeOutlinePriceLabel();
    }, 0);
  }
}

export function hideLastClosePriceLabelDom(): void {
  const el = document.getElementById('last-close-price-label');
  if (el) {
    el.style.display = 'none';
    el.style.left = '';
    el.style.right = '';
    el.style.transform = '';
  }
}

export function hideCustomSeriesLastValueLabelDom(): void {
  const elC = document.getElementById('custom-series-last-value-label');
  if (elC) {
    elC.style.display = 'none';
    elC.style.left = '';
    elC.style.right = '';
    elC.style.transform = '';
    elC.style.borderColor = '';
    elC.style.color = '';
  }
}

export function getPriceYForLastCloseOverlay(
  chart: TVActiveChart,
  price: unknown,
): number | null {
  if (!chart || price === undefined || price === null || isNaN(Number(price)))
    return null;
  const p = Number(price);
  try {
    const panes = chart.getPanes();
    if (!panes?.length) return null;
    const pane = panes[0];
    const scale = pane.getMainSourcePriceScale();
    if (!scale) return null;
    const range = scale.getVisiblePriceRange();
    if (!range || range.from === undefined || range.to === undefined)
      return null;
    const lo = Math.min(range.from, range.to);
    const hi = Math.max(range.from, range.to);
    const h = pane.getHeight();
    if (!h || h <= 0) return null;
    const pClamped = Math.min(hi, Math.max(lo, p));
    const inverted =
      typeof scale.isInverted === 'function' && scale.isInverted();
    const mode = typeof scale.getMode === 'function' ? scale.getMode() : 0;
    if (mode === 1 && lo > 0 && hi > 0 && pClamped > 0) {
      const logLo = Math.log(lo);
      const logHi = Math.log(hi);
      const logP = Math.log(pClamped);
      if (logHi === logLo) return inverted ? 0 : h / 2;
      const t = (logP - logLo) / (logHi - logLo);
      return inverted ? t * h : (1 - t) * h;
    }
    if (inverted) return ((pClamped - lo) / (hi - lo)) * h;
    return ((hi - pClamped) / (hi - lo)) * h;
  } catch {
    return null;
  }
}

/** Resolve time+price for line-end overlay, last-close pill, and dashed line. */
function resolveLineEndOverlayPointFromState(
  chart: TVActiveChart,
): { timeSec: number; price: number } | null {
  // Inline version — imports from lineEndDot would be circular; keep it simple.
  const s = getState();
  const fallback = (() => {
    if (s.ohlcvData?.length) {
      const b = s.ohlcvData[s.ohlcvData.length - 1];
      const tr = Number(b.time);
      const cl = Number(b.close);
      if (isFinite(tr) && isFinite(cl)) {
        return {
          timeSec: tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr),
          price: cl,
        };
      }
    }
    return null;
  })();
  if (!chart) return fallback;
  try {
    const series = chart.getSeries();
    if (!series) return fallback;
    if (typeof series.data === 'function') {
      const ds = series.data();
      if (ds && typeof ds.last === 'function') {
        const last = ds.last();
        if (last) {
          const tvT = parseTimeFromTvDataLast(last);
          const tvC = parseCloseFromTvDataLast(last);
          if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
            return {
              timeSec: tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT),
              price: tvC,
            };
          }
        }
      }
    }
  } catch {
    // swallow
  }
  return fallback;
}

export function updateLastClosePriceLabel(): void {
  const el = document.getElementById('last-close-price-label');
  if (!el) return;
  const s = getState();
  if (!getLineChrome().useCustomPriceLabels) {
    hideLastClosePriceLabelDom();
    return;
  }
  if (!s.chartWidget || !s.isChartReady || !s.ohlcvData?.length) {
    hideLastClosePriceLabelDom();
    return;
  }
  const ct = s.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideLastClosePriceLabelDom();
    return;
  }
  const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
  const chart = s.chartWidget.activeChart();
  const resolved = resolveLineEndOverlayPointFromState(chart);
  const labelPrice =
    resolved && isFinite(resolved.price) ? resolved.price : lastBar.close;
  const y = getPriceYForLastCloseOverlay(chart, labelPrice);
  if (y === null || y === undefined || isNaN(y)) {
    el.style.display = 'none';
    return;
  }
  el.textContent = formatCrosshairPrice(labelPrice);
  el.style.display = 'flex';
  const overlay = document.getElementById('custom-crosshair-overlay');
  positionPricePillAtPlotPriceBoundary(el, overlay, y);
}

// Visible-range helpers inlined to avoid circular deps with lineEndDot
function getVisibleTimeRangeSecFromChart(
  chart: TVActiveChart,
): { lo: number; hi: number } | null {
  try {
    const br = chart.getVisibleBarsRange();
    if (br?.from !== undefined && br?.to !== undefined) {
      const fromSec = normalizeChartUnixSec(br.from);
      const toSec = normalizeChartUnixSec(br.to);
      if (fromSec !== null && toSec !== null) {
        return { lo: Math.min(fromSec, toSec), hi: Math.max(fromSec, toSec) };
      }
    }
  } catch {
    /* */
  }
  try {
    const vr = chart.getVisibleRange?.();
    if (vr?.from !== undefined && vr?.to !== undefined) {
      const fromSec = normalizeChartUnixSec(vr.from);
      const toSec = normalizeChartUnixSec(vr.to);
      if (fromSec !== null && toSec !== null) {
        return { lo: Math.min(fromSec, toSec), hi: Math.max(fromSec, toSec) };
      }
    }
  } catch {
    /* */
  }
  return null;
}

function getRightmostOhlcvBarInVisibleTimeRange(
  chart: TVActiveChart,
  data: OHLCVBar[],
  slackMultiplier = 2,
): OHLCVBar | null {
  const range = getVisibleTimeRangeSecFromChart(chart);
  if (!range || !data?.length) return null;
  const slackSec = getApproxBarDurationSec(data) * slackMultiplier;
  const loMs = (range.lo - slackSec) * 1000;
  const hiMs = (range.hi + slackSec) * 1000;
  let best: OHLCVBar | null = null;
  for (const bar of data) {
    const t = bar.time;
    if (t >= loMs && t <= hiMs && (!best || t > best.time)) best = bar;
  }
  return best;
}

function getVisiblePlotRightEdgeTimeMs(chart: TVActiveChart): number | null {
  if (!chart) return null;
  try {
    const ts = chart.getTimeScale();
    if (!ts?.coordinateToTime || !ts?.width) return null;
    const w = ts.width();
    if (!(w > 2)) return null;
    const x = Math.max(0, Math.floor(w - 1));
    const rawT = ts.coordinateToTime(x);
    if (rawT == null) return null;
    let tMs = chartRawTimeToUnixMs(rawT);
    if (tMs === null) return null;
    const vr = chart.getVisibleRange?.();
    if (vr?.to != null) {
      const capMs = chartRawTimeToUnixMs(vr.to);
      if (capMs !== null && tMs > capMs) tMs = capMs;
    }
    return tMs;
  } catch {
    return null;
  }
}

export function updateVisibleEdgeOutlinePriceLabel(): void {
  const elOut = document.getElementById('custom-series-last-value-label');
  if (!elOut) return;
  const s = getState();
  if (
    !getLineChrome().useCustomPriceLabels ||
    !s.chartWidget ||
    !s.isChartReady ||
    !s.ohlcvData?.length
  ) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  const ct = s.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  const chart = s.chartWidget.activeChart();
  const tailBar = s.ohlcvData[s.ohlcvData.length - 1];
  const tailSec = normalizeChartUnixSec(tailBar.time);

  // Check if tail is visible
  const rightmost = getRightmostOhlcvBarInVisibleTimeRange(chart, s.ohlcvData);
  if (!rightmost || rightmost === tailBar || rightmost.time === tailBar.time) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }

  const edgeBar =
    rightmost || getRightmostOhlcvBarInVisibleTimeRange(chart, s.ohlcvData, 6);
  if (!edgeBar) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }

  let price = Number(edgeBar.close);
  if (ct === 2) {
    const tEdgeMs = getVisiblePlotRightEdgeTimeMs(chart);
    if (tEdgeMs !== null) {
      const pLine = interpolateCloseAlongLineAtTimeMs(s.ohlcvData, tEdgeMs);
      if (pLine !== null && isFinite(pLine)) price = pLine;
    }
  }

  const y = getPriceYForLastCloseOverlay(chart, price);
  if (y === null || y === undefined || isNaN(y)) {
    elOut.style.display = 'none';
    return;
  }

  const theme = s.CONFIG?.theme || {};
  const upColor = theme.successColor || '#0C9F76';
  const downColor = theme.errorColor || '#E06470';
  let outlineColor = upColor;
  if (ct === 1) {
    const o = Number(edgeBar.open);
    const c = Number(edgeBar.close);
    if (isFinite(o) && isFinite(c) && c < o) outlineColor = downColor;
  }
  elOut.style.borderColor = outlineColor;
  elOut.style.color = outlineColor;
  elOut.textContent = formatCrosshairPrice(price);
  elOut.style.display = 'flex';
  const overlayOut = document.getElementById('custom-crosshair-overlay');
  positionPricePillAtPlotPriceBoundary(elOut, overlayOut, y);
}

export function subscribeLastCloseLabelUpdates(): void {
  const s = getState();
  if (!s.chartWidget) return;
  const tick = scheduleLastCloseLabelUpdate;
  function tickIfCustomPriceLabels() {
    if (getLineChrome().useCustomPriceLabels) tick();
  }
  try {
    s.chartWidget.subscribe('series_event', (ev: string) => {
      if (ev === 'price_scale_changed') tickIfCustomPriceLabels();
    });
  } catch {
    /* */
  }
  try {
    s.chartWidget.subscribe('panes_height_changed', tickIfCustomPriceLabels);
  } catch {
    /* */
  }
  try {
    s.chartWidget
      .activeChart()
      .onVisibleRangeChanged()
      .subscribe(null, () => {
        tickIfCustomPriceLabels();
      });
  } catch {
    /* */
  }
}
