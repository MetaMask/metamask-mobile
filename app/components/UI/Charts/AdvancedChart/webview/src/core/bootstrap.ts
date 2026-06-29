// Entry orchestration. Called once from src/index.ts when the IIFE evaluates
// inside the WebView.
//
// Responsibilities (Phase 1):
// 1. Read window.CONFIG (must be inlined by AdvancedChartTemplate before this
//    script runs).
// 2. Seed core state with the symbol / resolution / theme from CONFIG.
// 3. Wire the RN→WV bridge to the message dispatcher.
// 4. Register Phase 1 message handlers (SET_THEME_COLORS).
// 5. Begin loading the TradingView library so it's ready when Phase 2's
//    ohlcvIngestion module calls createChartWidget.
//
// Phase 2 will add the data plumbing here (ohlcv module registers SET_OHLCV_DATA
// and triggers widget creation once the library + initial data are both ready).

import { onFromRN, reportErrorToRN, postToRN } from './bridge';
import { loadTradingViewLibrary } from './loadLibrary';
import { initThemeFromConfig, applyThemeColors } from '../widget/theme';
import { dispatchInboundMessage, registerHandler } from '../messages/handler';
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
 * Phase 1 bootstrap. Returns the resolved CONFIG so callers (and tests) can
 * inspect what booted. Idempotent in the sense that the inbound listener is
 * a single subscription — the WebView is not expected to bootstrap twice.
 */
export function bootstrap(): ChartConfig {
  const config = readConfig();

  initThemeFromConfig(config.theme);

  registerHandler('SET_THEME_COLORS', (payload) => {
    applyThemeColors(payload);
  });

  onFromRN((message) => {
    dispatchInboundMessage(message);
  });

  // Kick off TV library load — fire-and-forget. Phase 2's ohlcvIngestion
  // awaits readiness before constructing the widget. Errors are already
  // surfaced via reportErrorToRN inside loadTradingViewLibrary.
  loadTradingViewLibrary(config.libraryUrl).catch((error) => {
    reportErrorToRN(error);
  });

  // DEBUG signal so RN can confirm the modular bundle reached bootstrap.
  // Removed in Phase 7 once the feature flag is gone.
  postToRN('DEBUG', { message: 'modular-bootstrap-ready' });

  return config;
}
