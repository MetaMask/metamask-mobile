// Single owner of the main pane's auto-scale top margin.
//
// TradingView reserves `paneProperties.topMargin` percent of the pane height
// above the highest visible price when the price scale is auto-scaled
// ("Pane auto scaling top margin percentage" — ChartPropertiesOverrides, v30).
// It can be changed at runtime through `widget.applyOverrides`
// (Overrides API, v30).
//
// DOM overlays drawn above candles (avatarMarkers) need more headroom than the
// base margin gives on a short mobile pane, otherwise TradingView auto-fits
// the highest candle right under the top edge and the overlay is clipped.
// Overlays declare the pixels they need via `setReservedTopPx`; this module
// converts that to a percentage of the live pane height
// (`IPaneApi.getHeight()`) and applies it only when the value changes.
// scaleLayout.ts reads `getPaneTopMarginPercent()` so chart-type switches
// don't reset the margin back to the base value.

import { reportErrorToRN } from '../core/bridge';
import { getWidget, isChartReady } from '../core/state';
import type { TVActiveChart } from '../core/types';

/** Base top margin (%) shared by candle + line charts (see scaleLayout.ts). */
export const BASE_PANE_TOP_MARGIN = 12;
/** Upper bound (%) so a very short pane never squashes candles. */
export const MAX_PANE_TOP_MARGIN = 35;

let reservedTopPx = 0;
let lastPaneHeight = 0;
let appliedTopMargin = BASE_PANE_TOP_MARGIN;

/**
 * Top margin (%) for a pane of `paneHeight` px that must keep `reservedPx`
 * free above the highest visible price. Never below the base margin, never
 * above MAX_PANE_TOP_MARGIN.
 */
export function computeTopMarginPercent(
  reservedPx: number,
  paneHeight: number,
): number {
  if (
    !Number.isFinite(reservedPx) ||
    reservedPx <= 0 ||
    !Number.isFinite(paneHeight) ||
    paneHeight <= 0
  ) {
    return BASE_PANE_TOP_MARGIN;
  }
  const needed = Math.ceil((reservedPx / paneHeight) * 100);
  return Math.min(MAX_PANE_TOP_MARGIN, Math.max(BASE_PANE_TOP_MARGIN, needed));
}

/** Current top margin (%) to use in any `paneProperties.topMargin` override. */
export function getPaneTopMarginPercent(): number {
  return computeTopMarginPercent(reservedTopPx, lastPaneHeight);
}

function readMainPaneHeight(chart: TVActiveChart): number {
  try {
    if (typeof chart.getPanes !== 'function') return 0;
    const pane = chart.getPanes()?.[0];
    const h = pane?.getHeight();
    return typeof h === 'number' && Number.isFinite(h) && h > 0 ? h : 0;
  } catch {
    return 0;
  }
}

function applyIfChanged(): void {
  const next = getPaneTopMarginPercent();
  if (next === appliedTopMargin) return;
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  try {
    widget.applyOverrides({ 'paneProperties.topMargin': next });
    appliedTopMargin = next;
  } catch (error) {
    reportErrorToRN(error);
  }
}

/**
 * Declares how many pixels an overlay needs above the highest visible price.
 * Pass 0 to release the reservation. Re-reads the pane height from `chart`
 * (when given) and applies a new margin only if the percentage changed, so it
 * is cheap to call every frame.
 */
export function setReservedTopPx(px: number, chart?: TVActiveChart): void {
  reservedTopPx = Number.isFinite(px) && px > 0 ? px : 0;
  if (chart) {
    const h = readMainPaneHeight(chart);
    if (h > 0) lastPaneHeight = h;
  }
  applyIfChanged();
}

/**
 * Records that `paneProperties.topMargin` was just written by someone else
 * (scaleLayout / widget creation) so change detection stays accurate.
 */
export function markTopMarginApplied(percent: number): void {
  appliedTopMargin = percent;
}

/** Test-only: restore module defaults. */
export function __resetPaneMarginsForTests(): void {
  reservedTopPx = 0;
  lastPaneHeight = 0;
  appliedTopMargin = BASE_PANE_TOP_MARGIN;
}
