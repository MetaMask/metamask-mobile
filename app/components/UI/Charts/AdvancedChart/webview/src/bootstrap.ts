/**
 * Bootstrap — self-executing entry point that wires up the chart.
 *
 * Must be the last import in index.ts so all other modules are defined
 * before this module's top-level side effects run.
 */

import { getState } from './state';
import { loadLibrary } from './loadLibrary';
import { initChart } from './initChart';
import { setInitChartRef, registerMessageListeners } from './messageHandler';

// --- Immediate initialization (runs during script parse) ---
// Global state + message listeners are set up
// synchronously so that SET_OHLCV_DATA from RN is never missed.
const s = getState();
s.chartWidget = s.chartWidget || null;
s.ohlcvData = s.ohlcvData || [];
s.pendingMessages = s.pendingMessages || [];
s.activeStudies = s.activeStudies || new Map();
s.positionShapeIds = s.positionShapeIds || [];
s.realtimeCallbacks = s.realtimeCallbacks || {};
s.currentChartType = s.currentChartType ?? 2;
s.currentResolution = s.currentResolution || '5';
s.currentSymbol = s.currentSymbol || 'ASSET';
s.isChartReady = s.isChartReady || false;
s.ohlcvGeneration = s.ohlcvGeneration || 0;
s.lineChartOhlcvEpoch = s.lineChartOhlcvEpoch || 0;
s.ohlcvPagination = s.ohlcvPagination || {
  nextCursor: null,
  hasMore: false,
  assetId: null,
  vsCurrency: null,
};
s.visibleFromMs = s.visibleFromMs ?? null;
s.visibleToMs = s.visibleToMs ?? null;
s.__mmSuppressChartInteractUntil = 0;
s.__mmTooltipChartInteractSent = false;
s.__mmLayoutSettlePending = false;
s.__mmLayoutSettleFallbackTimer = null;
s.__lineLastPriceLinePlacementGen = 0;
s.__lineEndDotPlacementGen = 0;
s.lastCloseLabelScheduled = false;

setInitChartRef(initChart);
registerMessageListeners();

// --- Library load (needs DOM for <script> tag) ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadLibrary(initChart));
} else {
  loadLibrary(initChart);
}
