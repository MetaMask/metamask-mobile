// TradingView widget creation and onChartReady orchestration.
//
// Ported from chartLogic.js initChart() / onChartReady (lines ~5242-5601),
// stripped of:
//   - chrome-related branches (useCustomLabels / useCustomDashed) — Phase 4
//   - data-dependent gating (`window.ohlcvData.length === 0`) — Phase 2 calls
//     this function only once data is in
//   - custom crosshair listener + chart-interaction analytics — Phase 2
//     (interaction/) will own this
//   - line-end overlays / last-price overlays / legend overlay refresh —
//     Phase 4 deletes the first two; Phase 3 owns the legend
//
// Phase 1's job is the constructor call + onChartReady hook + library load
// orchestration. Phase 2 wires the datafeed.

import { postToRN, reportErrorToRN } from '../core/bridge';
import { loadTradingViewLibrary } from '../core/loadLibrary';
import {
  getWidget,
  setWidget,
  setChartReady,
  getCurrentSymbol,
  getCurrentResolution,
  getTheme,
} from '../core/state';
import { resolveUserTimezone } from '../core/timezone';
import type {
  ChartConfig,
  ChartFeaturesConfig,
  ChartTheme,
  TVChartingLibraryWidget,
} from '../core/types';
import {
  getBuiltInScaleLabelOverrides,
  getSeriesColorOverrides,
  getCandleStyleOverrides,
  getThemeLineColor,
  getThemeLastPriceLineColor,
} from './theme';
import { installTradingViewExternalOpenBridge } from './externalLinkBridge';

/**
 * Generates a 19-shade palette from a base hex color, light→base→dark.
 * Used for TradingView `custom_themes.dark.color{1,3}`. Ported verbatim
 * from chartLogic.js `generatePaletteShades` (~line 999).
 */
export function generatePaletteShades(hex: string): string[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const shades: string[] = [];
  for (let i = 0; i < 19; i++) {
    const t = i / 18;
    let sr: number;
    let sg: number;
    let sb: number;
    if (t < 0.5) {
      const f = 1 - t * 2;
      sr = Math.round(r + (255 - r) * f);
      sg = Math.round(g + (255 - g) * f);
      sb = Math.round(b + (255 - b) * f);
    } else {
      const f2 = (t - 0.5) * 2;
      sr = Math.round(r * (1 - f2));
      sg = Math.round(g * (1 - f2));
      sb = Math.round(b * (1 - f2));
    }
    shades.push(
      '#' + ((1 << 24) + (sr << 16) + (sg << 8) + sb).toString(16).slice(1),
    );
  }
  return shades;
}

/**
 * Shared TV widget defaults, minus disabled_features (computed from
 * CONFIG.features at call time). Mirrors legacy enabled_features list.
 */
const DEFAULT_ENABLED_FEATURES = [
  'study_templates',
  'iframe_loading_same_origin',
  'always_show_legend_values_on_mobile',
] as const;

function resolveDisabledFeatures(features: ChartFeaturesConfig): string[] {
  const list = (features.disabledFeatures ?? []).slice();
  if (!features.enableDrawingTools) {
    list.push('left_toolbar');
    list.push('context_menus');
  }
  list.push('use_localstorage_for_settings');
  return list;
}

function buildWidgetOverrides(theme: ChartTheme): Record<string, unknown> {
  return {
    'paneProperties.background': theme.backgroundColor,
    'paneProperties.backgroundType': 'solid',
    'paneProperties.vertGridProperties.color': 'transparent',
    'paneProperties.horzGridProperties.color': 'transparent',
    'scalesProperties.lineColor': theme.backgroundColor,
    'timeScale.borderColor': theme.backgroundColor,
    'scalesProperties.fontSize': 12,
    'scalesProperties.showStudyLastValue': false,
    'scalesProperties.showSeriesLastValue': true,
    'scalesProperties.showSymbolLabels': false,
    'scalesProperties.showRightScale': true,
    'scalesProperties.showLeftScale': false,
    'scalesProperties.showPriceScaleCrosshairLabel': true,
    'scalesProperties.showTimeScaleCrosshairLabel': true,
    'paneProperties.legendProperties.showSeriesTitle': false,
    'paneProperties.legendProperties.showSeriesOHLC': false,
    'paneProperties.legendProperties.showBarChange': false,
    'paneProperties.legendProperties.showVolume': false,
    'paneProperties.legendProperties.showBackground': false,
    'paneProperties.legendProperties.showStudyTitles': false,
    'paneProperties.legendProperties.showStudyArguments': false,
    'paneProperties.legendProperties.showStudyValues': false,
    'mainSeriesProperties.showPriceLine': true,
    // Pane margins keep candle (high/low fit) and line (close-only fit) charts
    // visually consistent. Without them, line auto-fits tighter and looks
    // zoomed in vs the candle chart for the same OHLCV.
    'paneProperties.topMargin': 12,
    'paneProperties.bottomMargin': 8,
    ...getCandleStyleOverrides(theme),
    ...getSeriesColorOverrides(
      getThemeLineColor(theme),
      getThemeLastPriceLineColor(theme),
    ),
    ...getBuiltInScaleLabelOverrides(theme),
  };
}

export interface CreateChartWidgetOptions {
  /** Datafeed object; Phase 1 has no real datafeed — Phase 2 supplies one. */
  datafeed: unknown;
  /**
   * Optional initial timeframe (visible-from / visible-to). Phase 2's
   * ohlcvIngestion module computes this from SET_OHLCV_DATA payload.
   */
  timeframe?: { type: 'time-range'; from: number; to: number };
  /** Custom formatters object (e.g. priceFormatterFactory). Phase 2 supplies. */
  customFormatters?: Record<string, unknown>;
  /** Resolved TV timezone string. Defaults to the device's IANA zone via `resolveUserTimezone()`. */
  timezone?: string;
  /** Callback fired exactly once when the widget is ready. */
  onReady?: (widget: TVChartingLibraryWidget) => void;
}

/**
 * Builds the TradingView widget. Returns the widget; the caller is expected
 * to store it via setWidget(). Emits CHART_READY + CHART_LAYOUT_SETTLED to
 * RN when the widget reports onChartReady.
 */
export function createChartWidget(
  config: ChartConfig,
  options: CreateChartWidgetOptions,
): TVChartingLibraryWidget {
  const TradingView = window.TradingView;
  if (!TradingView) {
    throw new Error('TradingView library not loaded');
  }
  const theme = getTheme();
  if (!theme) {
    throw new Error('Theme not initialised — call initThemeFromConfig first');
  }

  const features = config.features ?? {};
  const disabledFeatures = resolveDisabledFeatures(features);

  const widget = new TradingView.widget({
    symbol: getCurrentSymbol(),
    interval: getCurrentResolution(),
    timeframe: options.timeframe,
    container: 'tv_chart_container',
    datafeed: options.datafeed,
    library_path: config.libraryUrl,
    locale: 'en',
    custom_formatters: options.customFormatters,
    timezone: options.timezone ?? resolveUserTimezone(),
    fullscreen: false,
    autosize: true,
    theme: 'Dark',
    disabled_features: disabledFeatures,
    enabled_features: [...DEFAULT_ENABLED_FEATURES],
    custom_themes: {
      dark: {
        color1: generatePaletteShades(theme.successColor),
        color3: generatePaletteShades(theme.errorColor),
      },
    },
    overrides: buildWidgetOverrides(theme),
    loading_screen: {
      backgroundColor: theme.backgroundColor,
      foregroundColor: theme.successColor,
    },
  });

  setWidget(widget);

  widget.onChartReady(() => {
    setChartReady(true);
    hideLoadingOverlay();
    installTradingViewExternalOpenBridge();
    postToRN('CHART_READY', {});
    scheduleChartLayoutSettledNotify();
    if (options.onReady) {
      try {
        options.onReady(widget);
      } catch (error) {
        reportErrorToRN(error);
      }
    }
  });

  return widget;
}

function hideLoadingOverlay(): void {
  try {
    const el = document.getElementById('loading-overlay');
    el?.classList.add('hidden');
  } catch {
    // Loading overlay may be absent in non-template contexts (e.g. tests).
  }
}

/**
 * Posts CHART_LAYOUT_SETTLED after two rAF ticks so RN's skeleton overlay
 * can hide once TradingView has actually laid out. Mirrors legacy
 * scheduleChartLayoutSettledNotify (~line 118).
 */
export function scheduleChartLayoutSettledNotify(): void {
  const send = (): void => {
    if (getWidget()) {
      postToRN('CHART_LAYOUT_SETTLED', {});
    }
  };
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(send);
    });
  } catch {
    setTimeout(send, 48);
  }
}

/**
 * Ensures library is loaded, then awaits caller-provided pre-widget setup.
 * Phase 2's ohlcvIngestion calls this once SET_OHLCV_DATA arrives.
 */
export async function ensureLibraryLoaded(libraryUrl: string): Promise<void> {
  await loadTradingViewLibrary(libraryUrl);
}
