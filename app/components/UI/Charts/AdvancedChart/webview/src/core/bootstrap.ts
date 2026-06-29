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
import { applyThemeColors, initThemeFromConfig } from '../widget/theme';
import { customDatafeed } from '../widget/datafeed';
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
import type { ChartConfig } from './types';

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
          onReady: (widget) => {
            try {
              applyScaleLayout();
              applyVisualOverrides(config.visualOverrides);
              const chart = widget.activeChart();
              attachCrosshairListener(chart);
              attachTapDismiss(widget);
              attachVisibleRangeListeners(chart);
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

  // DEBUG signal so RN can confirm the modular bundle reached bootstrap.
  // Removed in Phase 7 once the legacy bundle is gone.
  postToRN('DEBUG', { message: 'modular-bootstrap-ready' });

  return config;
}
