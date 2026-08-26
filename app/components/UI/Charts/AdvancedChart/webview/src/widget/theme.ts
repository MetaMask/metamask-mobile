// Theme application + SET_THEME_COLORS hot-swap handler.
//
// Ported from chartLogic.js: getThemeLineColor (line ~1034),
// getThemeLastPriceLineColor (~1044), getSeriesColorOverrides (~1084),
// applySeriesStyleProperties (~1114), applySeriesColors (~1134), and
// handleSetThemeColors (~1158).
//
// Phase 1 simplifications vs legacy:
// - Drops `useCustomPriceLabels` branching (custom chrome is being removed;
//   TV built-in scale + crosshair labels are always used).
// - Drops in-place shape recolor for line-end dot / dashed last-price / pills
//   (all chrome shapes that no longer exist).
// - Volume study recolor is wired through a subscribe callback so Phase 3's
//   features/volume/ can register without theme.ts knowing about it.

import { reportErrorToRN } from '../core/bridge';
import { getWidget, isChartReady, getTheme, setTheme } from '../core/state';
import type { ChartTheme, TVChartingLibraryWidget } from '../core/types';
import type { SetThemeColorsPayload } from '../messages/contract';

type ThemeListener = (theme: ChartTheme) => void;

const listeners = new Set<ThemeListener>();

/**
 * Subscribe to theme changes. The callback fires whenever
 * applyThemeColors() updates state.theme. Returns an unsubscribe.
 */
export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns the series stroke color. Falls back to successColor when
 * lineColor is unset (ambient feature off).
 */
export function getThemeLineColor(theme: ChartTheme): string {
  return theme.lineColor || theme.successColor;
}

/**
 * Returns the current-price line color. Honors currentPriceColor when set,
 * else matches the series line color.
 */
export function getThemeLastPriceLineColor(theme: ChartTheme): string {
  return theme.currentPriceColor || getThemeLineColor(theme);
}

/**
 * Returns the visual color for the current-price line/pill. Falls back
 * through currentPriceColor → lineColor → successColor.
 */
export function getCurrentPriceVisualColor(theme: ChartTheme): string {
  return theme.currentPriceColor || theme.lineColor || theme.successColor;
}

/**
 * Volume up-bar color. Falls back to the candle success color.
 */
export function getVolumeSuccessColor(theme: ChartTheme): string {
  return theme.volumeSuccessColor || theme.successColor;
}

/**
 * Volume down-bar color. Falls back to the candle error color.
 */
export function getVolumeErrorColor(theme: ChartTheme): string {
  return theme.volumeErrorColor || theme.errorColor;
}

/**
 * Returns the TradingView main-series style overrides for a given line color.
 */
export function getSeriesColorOverrides(
  lineColor: string,
  lastPriceLineColor: string,
): Record<string, unknown> {
  const pillColor = lastPriceLineColor ?? lineColor;
  return {
    'mainSeriesProperties.lineStyle.color': lineColor,
    'mainSeriesProperties.lineStyle.colorType': 'solid',
    'mainSeriesProperties.lineStyle.linewidth': 2,
    'mainSeriesProperties.lineWithMarkersStyle.color': lineColor,
    'mainSeriesProperties.lineWithMarkersStyle.colorType': 'solid',
    'mainSeriesProperties.lineWithMarkersStyle.linewidth': 2,
    'mainSeriesProperties.areaStyle.linecolor': lineColor,
    'mainSeriesProperties.areaStyle.linewidth': 2,
    'mainSeriesProperties.baselineStyle.topLineColor': lineColor,
    'mainSeriesProperties.baselineStyle.topLineWidth': 2,
    'mainSeriesProperties.baselineStyle.bottomLineColor': lineColor,
    'mainSeriesProperties.baselineStyle.bottomLineWidth': 2,
    'mainSeriesProperties.baselineStyle.topFillColor1': 'rgba(0,0,0,0)',
    'mainSeriesProperties.baselineStyle.topFillColor2': 'rgba(0,0,0,0)',
    'mainSeriesProperties.baselineStyle.bottomFillColor1': 'rgba(0,0,0,0)',
    'mainSeriesProperties.baselineStyle.bottomFillColor2': 'rgba(0,0,0,0)',
    'mainSeriesProperties.priceLineColor': pillColor,
  };
}

/**
 * Returns the TV built-in scale + crosshair label overrides. With custom
 * chrome removed, TV's built-ins are always enabled (showSeriesLastValue,
 * showPriceScaleCrosshairLabel, showTimeScaleCrosshairLabel).
 */
export function getBuiltInScaleLabelOverrides(
  theme: ChartTheme,
): Record<string, unknown> {
  const crosshairBg =
    theme.crosshairBackgroundColor ||
    theme.sectionBackgroundColor ||
    theme.backgroundColor;
  return {
    'scalesProperties.textColor': theme.textColor,
    'scalesProperties.crosshairLabelBgColorDark': crosshairBg,
    'scalesProperties.crosshairLabelBgColorLight': crosshairBg,
    'mainSeriesProperties.priceLineColor': getThemeLastPriceLineColor(theme),
  };
}

/**
 * Returns the candle-style overrides (up/down colors). Applied on init and on
 * SET_THEME_COLORS.
 */
export function getCandleStyleOverrides(
  theme: ChartTheme,
): Record<string, unknown> {
  return {
    'mainSeriesProperties.candleStyle.upColor': theme.successColor,
    'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
    'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
    'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
    'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
    'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
  };
}

/**
 * Initialize theme state from a CONFIG.theme payload. Called once by
 * bootstrap before the widget is created. Doesn't touch the widget — it
 * only seeds state so the widget constructor (and listeners) can read it.
 */
export function initThemeFromConfig(theme: ChartTheme): void {
  setTheme(theme);
}

/**
 * Hot-swap theme colors. Mirrors legacy chartLogic.js handleSetThemeColors
 * but without the chrome-shape updates (those features are deleted).
 */
export function applyThemeColors(payload: SetThemeColorsPayload): void {
  const current = getTheme();
  if (!current) return;

  const updated: ChartTheme = {
    ...current,
    ...(payload.lineColor != null && { lineColor: payload.lineColor }),
    ...(payload.successColor != null && { successColor: payload.successColor }),
    ...(payload.errorColor != null && { errorColor: payload.errorColor }),
    ...(payload.currentPriceColor != null && {
      currentPriceColor: payload.currentPriceColor,
    }),
    ...(payload.volumeSuccessColor != null && {
      volumeSuccessColor: payload.volumeSuccessColor,
    }),
    ...(payload.volumeErrorColor != null && {
      volumeErrorColor: payload.volumeErrorColor,
    }),
  };
  setTheme(updated);

  const widget = getWidget();
  if (!widget || !isChartReady()) {
    notifyListeners(updated);
    return;
  }

  const lineColor = getThemeLineColor(updated);

  try {
    widget.applyOverrides({
      ...getCandleStyleOverrides(updated),
      ...getSeriesColorOverrides(
        lineColor,
        getThemeLastPriceLineColor(updated),
      ),
      ...getBuiltInScaleLabelOverrides(updated),
    });
  } catch (error) {
    reportErrorToRN(error);
  }

  applySeriesStyleProperties(widget, lineColor);

  notifyListeners(updated);
}

/**
 * Re-apply the current theme from state to the widget. Called on chart ready
 * to flush any SET_THEME_COLORS that arrived before the chart was initialized.
 * Ensures the first visible frame shows the correct color, not stale CONFIG.
 */
export function flushPendingTheme(): void {
  const theme = getTheme();
  if (!theme) return;
  const widget = getWidget();
  if (!widget || !isChartReady()) return;

  const lineColor = getThemeLineColor(theme);
  try {
    widget.applyOverrides({
      ...getCandleStyleOverrides(theme),
      ...getSeriesColorOverrides(lineColor, getThemeLastPriceLineColor(theme)),
      ...getBuiltInScaleLabelOverrides(theme),
    });
  } catch (error) {
    reportErrorToRN(error);
  }
  applySeriesStyleProperties(widget, lineColor);
}

/**
 * Directly update the live series stroke color for line (2) and baseline (10)
 * chart styles. `applyOverrides` only sets widget-level defaults; this call
 * ensures the already-rendered series picks up the new color immediately.
 */
function applySeriesStyleProperties(
  widget: TVChartingLibraryWidget,
  lineColor: string,
): void {
  try {
    const series = widget.activeChart().getSeries();
    series.setChartStyleProperties(2, {
      color: lineColor,
      colorType: 'solid',
      linewidth: 2,
    });
    series.setChartStyleProperties(10, {
      topLineColor: lineColor,
      bottomLineColor: lineColor,
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}

function notifyListeners(theme: ChartTheme): void {
  for (const listener of listeners) {
    try {
      listener(theme);
    } catch (error) {
      reportErrorToRN(error);
    }
  }
}

/** Test-only: clear all subscribers. */
export function __resetThemeForTests(): void {
  listeners.clear();
}
