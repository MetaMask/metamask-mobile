// Centralised price-scale + pane-layout overrides.
//
// Ported from chartLogic.js `applyChartScaleLayout` (~line 1270). Applied on
// every chart-type switch and once on chart-ready so candle and line charts
// share the same visible Y range. Without paneProperties.topMargin /
// bottomMargin, TV auto-fits the line series tighter than the candle series
// (close-only vs high/low) and the line chart looks zoomed in.
//
// Phase 2 simplifications vs legacy:
// - Drops chrome-related toggles (showSeriesLastValue/CrosshairLabel
//   conditionals — TV built-in always on now)
// - Drops DOM overflow unclip / hide-price-scale-buttons (no chrome to hide)

import { reportErrorToRN } from '../core/bridge';
import { getTheme, getWidget, isChartReady } from '../core/state';
import type { ChartType, TVChartingLibraryWidget } from '../core/types';

const PANE_TOP_MARGIN = 12;
const PANE_BOTTOM_MARGIN = 8;

function buildScaleLayoutOverrides(): Record<string, unknown> {
  const theme = getTheme();
  return {
    'scalesProperties.showRightScale': true,
    'scalesProperties.showLeftScale': false,
    'scalesProperties.showSeriesLastValue': true,
    'scalesProperties.showStudyLastValue': false,
    'scalesProperties.showSymbolLabels': false,
    'scalesProperties.showPriceScaleCrosshairLabel': true,
    'scalesProperties.showTimeScaleCrosshairLabel': true,
    'mainSeriesProperties.showPriceLine': true,
    'paneProperties.topMargin': PANE_TOP_MARGIN,
    'paneProperties.bottomMargin': PANE_BOTTOM_MARGIN,
    ...(theme?.backgroundColor
      ? {
          'timeScale.borderColor': theme.backgroundColor,
          'scalesProperties.lineColor': theme.backgroundColor,
        }
      : {}),
    ...(theme?.borderColor
      ? { 'paneProperties.separatorColor': theme.borderColor }
      : {}),
  };
}

/**
 * Apply the scale-layout overrides plus re-attach the main series to the
 * right price scale. Safe to call multiple times. Errors are forwarded to RN.
 */
export function applyScaleLayout(_type?: ChartType): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  try {
    widget.applyOverrides(buildScaleLayoutOverrides());
  } catch (error) {
    reportErrorToRN(error);
    return;
  }
  syncMainSeriesToRightScale(widget);
}

function syncMainSeriesToRightScale(widget: TVChartingLibraryWidget): void {
  try {
    widget.activeChart().getSeries().detachToRight();
  } catch {
    // detachToRight can fail mid-teardown; safe to ignore.
  }
}
