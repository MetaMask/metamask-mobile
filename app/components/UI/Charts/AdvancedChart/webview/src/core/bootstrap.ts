// Entry orchestration. Called once from src/index.ts when the IIFE evaluates
// inside the WebView.
//
// Responsibilities (Phase 1 + 2):
// 1. Read window.CONFIG (must be inlined by AdvancedChartTemplate before this
//    script runs).
// 2. Seed core state with the symbol / resolution / theme from CONFIG.
// 3. Wire the RN→WV bridge to the message dispatcher.
// 4. Register Phase 1 + 2 message handlers:
//      SET_THEME_COLORS (Phase 1), SET_OHLCV_DATA, REALTIME_UPDATE,
//      SET_CHART_TYPE (Phase 2).
// 5. Begin loading the TradingView library so it's ready when the first
//    SET_OHLCV_DATA arrives.
// 6. On first SET_OHLCV_DATA: createChartWidget with the default datafeed,
//    apply visual overrides, attach crosshair + visible-range listeners.

import { onFromRN, postToRN, reportErrorToRN } from './bridge';
import { loadTradingViewLibrary } from './loadLibrary';
import { dispatchInboundMessage, registerHandler } from '../messages/handler';
import {
  applyThemeColors,
  flushPendingTheme,
  initThemeFromConfig,
} from '../widget/theme';
import { customDatafeed } from '../widget/datafeed';
import { advancedChartPriceFormatterFactory } from '../widget/priceFormatter';
import { getApproxBarDurationSec } from './timeUtils';
import {
  handleRealtimeUpdate,
  handleSetOHLCVData,
  onFirstOhlcvData,
} from '../widget/ohlcvIngestion';
import { handleSetChartType } from '../widget/chartType';
import { applyVisualOverrides } from '../widget/visualOverrides';
import {
  createChartWidget,
  scheduleChartLayoutSettledNotify,
} from '../widget/initChart';
import {
  attachCrosshairListener,
  attachTapDismiss,
} from '../interaction/crosshair';
import { attachVisibleRangeListeners } from '../interaction/visibleRange';
import { applyScaleLayout } from '../widget/scaleLayout';
import {
  handleAddIndicator,
  handleRemoveIndicator,
  handleSetMAVisibility,
} from '../features/indicators';
import { handleSetSubPaneLayout } from '../features/indicators/subPane';
import {
  attachLegendResizeListener,
  setupLegendOverlay,
} from '../features/indicators/legend';
import {
  handleToggleVolume,
  registerVolumeThemeSync,
} from '../features/volume';
import { registerTradeMarkerOverlay } from '../overlays/tradeMarkers';
import { registerTradeMarkerPulseHandler } from '../overlays/tradeMarkers/animation';
import { attachMarkerHitTest } from '../overlays/tradeMarkers/markerHitTest';
import { registerFocusTimeOverlay } from '../overlays/focusTime';
import { registerPositionLinesOverlay } from '../overlays/positionLines';
import { slbScheduleInitialCentering } from '../overlays/socialLeaderboard';
import { registerRnBackedPaginationHandler } from '../pagination/rnBacked';
import {
  getOhlcvData,
  getVisibleFromMs,
  getVisibleToMs,
  setSubPaneHeightRatio,
} from './state';
import type { ChartConfig } from './types';

/**
 * When RN passes an explicit visible-range start (e.g. a specific period like
 * 1D/1W/1M), build a `{ type: 'time-range', from, to }` timeframe so the
 * initial view snaps to that window instead of defaulting to `Date.now()`.
 * Padded by 2 bar durations so the last bar isn't glued to the right edge.
 * Ported from chartLogic.js initChart's `tfOption` computation (~line 5284).
 */
function buildInitialTimeframe():
  | { type: 'time-range'; from: number; to: number }
  | undefined {
  const visibleFromMs = getVisibleFromMs();
  if (visibleFromMs == null) return undefined;
  const visibleToMs = getVisibleToMs() ?? Date.now();
  const initBarPadSec = getApproxBarDurationSec(getOhlcvData()) * 2;
  return {
    type: 'time-range',
    from: Math.floor(visibleFromMs / 1000),
    to: Math.ceil(visibleToMs / 1000) + initBarPadSec,
  };
}

function readConfig(): ChartConfig {
  const config = window.CONFIG;
  if (!config) {
    throw new Error(
      'window.CONFIG is missing — AdvancedChartTemplate must inline ' +
        'CONFIG before chartLogic runs.',
    );
  }
  return config;
}

/**
 * Phase 1 + 2 bootstrap. Returns the resolved CONFIG so callers (and tests)
 * can inspect what booted. Idempotent on its inbound subscription — the
 * WebView is not expected to bootstrap twice.
 */
export function bootstrap(): ChartConfig {
  const config = readConfig();

  initThemeFromConfig(config.theme);
  if (typeof config.subPaneHeightRatio === 'number') {
    setSubPaneHeightRatio(config.subPaneHeightRatio);
  }

  registerHandler('SET_THEME_COLORS', (payload) => {
    applyThemeColors(payload);
  });
  registerHandler('SET_OHLCV_DATA', (payload) => {
    handleSetOHLCVData(payload);
  });
  registerHandler('REALTIME_UPDATE', (payload) => {
    handleRealtimeUpdate(payload);
  });
  registerHandler('SET_CHART_TYPE', (payload) => {
    handleSetChartType(payload);
  });
  registerHandler('ADD_INDICATOR', (payload) => {
    handleAddIndicator(payload, config);
  });
  registerHandler('REMOVE_INDICATOR', (payload) => {
    handleRemoveIndicator(payload);
  });
  registerHandler('SET_MA_VISIBILITY', (payload) => {
    handleSetMAVisibility(payload, config);
  });
  registerHandler('TOGGLE_VOLUME', (payload) => {
    handleToggleVolume(payload);
  });
  registerHandler('SET_SUB_PANE_LAYOUT', (payload) => {
    handleSetSubPaneLayout(payload);
  });

  registerTradeMarkerOverlay();
  registerTradeMarkerPulseHandler();
  registerFocusTimeOverlay();
  registerPositionLinesOverlay();
  registerRnBackedPaginationHandler();
  registerVolumeThemeSync();

  onFromRN((message) => {
    dispatchInboundMessage(message);
  });

  // Library load is fire-and-forget; the first-data handler awaits readiness
  // again before constructing the widget, so this is purely a head-start.
  loadTradingViewLibrary(config.libraryUrl).catch((error) => {
    reportErrorToRN(error);
  });

  onFirstOhlcvData(() => {
    loadTradingViewLibrary(config.libraryUrl)
      .then(() => {
        createChartWidget(config, {
          datafeed: customDatafeed,
          customFormatters: {
            priceFormatterFactory: advancedChartPriceFormatterFactory,
          },
          timeframe: buildInitialTimeframe(),
          onReady: (widget) => {
            try {
              flushPendingTheme();
              applyScaleLayout();
              applyVisualOverrides(config.visualOverrides);
              setupLegendOverlay(config.legendOverlay);
              const chart = widget.activeChart();
              // Match legacy onChartReady: when no explicit visible range
              // was passed, pin a 2-bar gap on the right. TV's default is
              // wider, leaving the chart visibly offset left.
              if (getVisibleFromMs() == null) {
                try {
                  chart.getTimeScale().setRightOffset(2);
                } catch (rightOffsetError) {
                  reportErrorToRN(rightOffsetError);
                }
              }
              attachCrosshairListener(chart);
              attachTapDismiss(widget);
              attachMarkerHitTest(widget, chart);
              attachVisibleRangeListeners(chart);
              chart
                .selection()
                .onChanged()
                .subscribe(null, () => {
                  chart.selection().clear();
                });
              attachLegendResizeListener(widget);
              slbScheduleInitialCentering();
              scheduleChartLayoutSettledNotify();
            } catch (error) {
              reportErrorToRN(error);
            }
          },
        });
      })
      .catch((error) => {
        reportErrorToRN(error);
      });
  });

  postToRN('DEBUG', { message: 'modular-bootstrap-ready' });

  return config;
}
