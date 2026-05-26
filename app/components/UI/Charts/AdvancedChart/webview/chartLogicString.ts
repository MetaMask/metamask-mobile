/**
 * AUTO-GENERATED — do not edit manually.
 * Re-generate with: yarn build:advanced-chart-webview
 *
 * Source: webview/src/*.ts → webpack IIFE bundle
 */

/* eslint-disable */
// eslint-disable-next-line import-x/no-default-export
// prettier-ignore
export default `/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  INTERVAL_MS_TO_TV: () => (/* reexport */ INTERVAL_MS_TO_TV),
  LAYOUT_SETTLE_DATA_FALLBACK_MS: () => (/* reexport */ LAYOUT_SETTLE_DATA_FALLBACK_MS),
  LINE_CHROME_DEFAULTS: () => (/* reexport */ LINE_CHROME_DEFAULTS),
  LINE_END_ICON_MAX_PROBES: () => (/* reexport */ LINE_END_ICON_MAX_PROBES),
  LINE_END_ICON_PROBE_STEP_PX: () => (/* reexport */ LINE_END_ICON_PROBE_STEP_PX),
  LINE_END_ICON_TIME_INSET_PX: () => (/* reexport */ LINE_END_ICON_TIME_INSET_PX),
  OHLCV_BASE_URL: () => (/* reexport */ OHLCV_BASE_URL),
  OUTLINE_EDGE_TIME_INSET_PX: () => (/* reexport */ OUTLINE_EDGE_TIME_INSET_PX),
  SUPPORTED_RESOLUTIONS: () => (/* reexport */ SUPPORTED_RESOLUTIONS),
  TV_EXTERNAL_BRIDGE_DEBOUNCE_MS: () => (/* reexport */ TV_EXTERNAL_BRIDGE_DEBOUNCE_MS),
  VARIABLE_TICK_SIZE: () => (/* reexport */ VARIABLE_TICK_SIZE),
  abortDeferredLayoutSettleAndNotify: () => (/* reexport */ abortDeferredLayoutSettleAndNotify),
  applyChartContainerOverflowUnclip: () => (/* reexport */ applyChartContainerOverflowUnclip),
  applyChartScaleLayout: () => (/* reexport */ applyChartScaleLayout),
  applyHidePriceScaleModeButtons: () => (/* reexport */ applyHidePriceScaleModeButtons),
  applyLineTimeScaleVisibility: () => (/* reexport */ applyLineTimeScaleVisibility),
  applySeriesColors: () => (/* reexport */ applySeriesColors),
  beginDeferredLayoutSettleAfterOhlcvReload: () => (/* reexport */ beginDeferredLayoutSettleAfterOhlcvReload),
  buildChartDomUnclipCss: () => (/* reexport */ buildChartDomUnclipCss),
  bumpLineChartOhlcvEpoch: () => (/* reexport */ bumpLineChartOhlcvEpoch),
  chartRawTimeToUnixMs: () => (/* reexport */ chartRawTimeToUnixMs),
  clearLineEndDotVisibleRangeDebounce: () => (/* reexport */ clearLineEndDotVisibleRangeDebounce),
  clearMmLayoutSettleFallbackTimer: () => (/* reexport */ clearMmLayoutSettleFallbackTimer),
  clearPositionLines: () => (/* reexport */ clearPositionLines),
  createLastPriceLine: () => (/* reexport */ createLastPriceLine),
  createLineLastPriceLine: () => (/* reexport */ createLineLastPriceLine),
  createVolumeStudy: () => (/* reexport */ createVolumeStudy),
  detectResolution: () => (/* reexport */ detectResolution),
  eachChartDocument: () => (/* reexport */ eachChartDocument),
  ensureNoLineChartEndIcons: () => (/* reexport */ ensureNoLineChartEndIcons),
  fetchOlderBars: () => (/* reexport */ fetchOlderBars),
  filterBarsForRange: () => (/* reexport */ filterBarsForRange),
  findOuterChartMarkupTable: () => (/* reexport */ findOuterChartMarkupTable),
  formatCrosshairPrice: () => (/* reexport */ formatCrosshairPrice),
  formatCrosshairTime: () => (/* reexport */ formatCrosshairTime),
  formatSubscriptNotation: () => (/* reexport */ formatSubscriptNotation),
  generatePaletteShades: () => (/* reexport */ generatePaletteShades),
  getApproxBarDurationSec: () => (/* reexport */ getApproxBarDurationSec),
  getChartMarkupTableContext: () => (/* reexport */ getChartMarkupTableContext),
  getLibraryLoadAttempts: () => (/* reexport */ getLibraryLoadAttempts),
  getLineChrome: () => (/* reexport */ getLineChrome),
  getLineEndDotTimeAndPriceFromSeries: () => (/* reexport */ getLineEndDotTimeAndPriceFromSeries),
  getLineEndIconTimeSec: () => (/* reexport */ getLineEndIconTimeSec),
  getMainPriceAxisLeftRelativeToOverlay: () => (/* reexport */ getMainPriceAxisLeftRelativeToOverlay),
  getPriceYForLastCloseOverlay: () => (/* reexport */ getPriceYForLastCloseOverlay),
  getSeriesColorOverrides: () => (/* reexport */ getSeriesColorOverrides),
  getState: () => (/* reexport */ getState),
  handleAddIndicator: () => (/* reexport */ handleAddIndicator),
  handleMessage: () => (/* reexport */ handleMessage),
  handleRealtimeUpdate: () => (/* reexport */ handleRealtimeUpdate),
  handleRemoveIndicator: () => (/* reexport */ handleRemoveIndicator),
  handleSetChartType: () => (/* reexport */ handleSetChartType),
  handleSetLineChrome: () => (/* reexport */ handleSetLineChrome),
  handleSetOHLCVData: () => (/* reexport */ handleSetOHLCVData),
  handleSetPositionLines: () => (/* reexport */ handleSetPositionLines),
  handleToggleVolume: () => (/* reexport */ handleToggleVolume),
  hideCustomCrosshairLabels: () => (/* reexport */ hideCustomCrosshairLabels),
  hideCustomSeriesLastValueLabelDom: () => (/* reexport */ hideCustomSeriesLastValueLabelDom),
  hideLastClosePriceLabelDom: () => (/* reexport */ hideLastClosePriceLabelDom),
  initChart: () => (/* reexport */ initChart),
  injectChartContainerOverflowUnclip: () => (/* reexport */ injectChartContainerOverflowUnclip),
  injectHidePriceScaleModeButtonsStyle: () => (/* reexport */ injectHidePriceScaleModeButtonsStyle),
  injectHideTimeAxisStyle: () => (/* reexport */ injectHideTimeAxisStyle),
  installTradingViewExternalOpenBridge: () => (/* reexport */ installTradingViewExternalOpenBridge),
  interpolateCloseAlongLineAtTimeMs: () => (/* reexport */ interpolateCloseAlongLineAtTimeMs),
  isOwnStringKey: () => (/* reexport */ isOwnStringKey),
  isTradingViewExternalHostname: () => (/* reexport */ isTradingViewExternalHostname),
  isTradingViewExternalHref: () => (/* reexport */ isTradingViewExternalHref),
  lineChromePickBool: () => (/* reexport */ lineChromePickBool),
  loadLibrary: () => (/* reexport */ loadLibrary),
  normalizeChartUnixSec: () => (/* reexport */ normalizeChartUnixSec),
  parseCloseFromTvDataLast: () => (/* reexport */ parseCloseFromTvDataLast),
  parseTimeFromTvDataLast: () => (/* reexport */ parseTimeFromTvDataLast),
  positionPricePillAtPlotPriceBoundary: () => (/* reexport */ positionPricePillAtPlotPriceBoundary),
  queueTryCompleteLayoutSettleAfterData: () => (/* reexport */ queueTryCompleteLayoutSettleAfterData),
  refreshLineChartOverlays: () => (/* reexport */ refreshLineChartOverlays),
  refreshLineEndDot: () => (/* reexport */ refreshLineEndDot),
  registerMessageListeners: () => (/* reexport */ registerMessageListeners),
  removeAllLastPriceHorizontalOverlays: () => (/* reexport */ removeAllLastPriceHorizontalOverlays),
  removeCandleVolumeScaleMarkup: () => (/* reexport */ removeCandleVolumeScaleMarkup),
  removeHideTimeAxisStyle: () => (/* reexport */ removeHideTimeAxisStyle),
  removeInjectedStyleByIdFromChartDocs: () => (/* reexport */ removeInjectedStyleByIdFromChartDocs),
  removeLineChartMarkupStyle: () => (/* reexport */ removeLineChartMarkupStyle),
  removeLineEndDot: () => (/* reexport */ removeLineEndDot),
  resetLibraryLoadAttempts: () => (/* reexport */ resetLibraryLoadAttempts),
  resetState: () => (/* reexport */ resetState),
  resolveIndicatorPreset: () => (/* reexport */ resolveIndicatorPreset),
  resolveLineChromeFromPayload: () => (/* reexport */ resolveLineChromeFromPayload),
  resolveLineEndOverlayPoint: () => (/* reexport */ resolveLineEndOverlayPoint),
  scheduleChartDomUnclip: () => (/* reexport */ scheduleChartDomUnclip),
  scheduleChartLayoutSettledNotify: () => (/* reexport */ scheduleChartLayoutSettledNotify),
  scheduleHidePriceScaleModeButtons: () => (/* reexport */ scheduleHidePriceScaleModeButtons),
  scheduleLastCloseLabelUpdate: () => (/* reexport */ scheduleLastCloseLabelUpdate),
  scheduleLineChartLayoutReflow: () => (/* reexport */ scheduleLineChartLayoutReflow),
  scheduleLineEndDotAfterVisibleRangeChange: () => (/* reexport */ scheduleLineEndDotAfterVisibleRangeChange),
  sendToReactNative: () => (/* reexport */ sendToReactNative),
  setInitChartRef: () => (/* reexport */ setInitChartRef),
  setState: () => (/* reexport */ setState),
  subscribeLastCloseLabelUpdates: () => (/* reexport */ subscribeLastCloseLabelUpdates),
  suppressChartUserInteraction: () => (/* reexport */ suppressChartUserInteraction),
  sweepNonPositionHorizontalLines: () => (/* reexport */ sweepNonPositionHorizontalLines),
  sweepOrphanLineChartIconShapes: () => (/* reexport */ sweepOrphanLineChartIconShapes),
  syncMainSeriesToRightScale: () => (/* reexport */ syncMainSeriesToRightScale),
  toSubscriptDigits: () => (/* reexport */ toSubscriptDigits),
  tryCompleteLayoutSettleAfterDataCore: () => (/* reexport */ tryCompleteLayoutSettleAfterDataCore),
  tvScopedDomSelectors: () => (/* reexport */ tvScopedDomSelectors),
  updateCandleVolumeScaleColumnVisibility: () => (/* reexport */ updateCandleVolumeScaleColumnVisibility),
  updateCustomCrosshairLabels: () => (/* reexport */ updateCustomCrosshairLabels),
  updateLastClosePriceLabel: () => (/* reexport */ updateLastClosePriceLabel),
  updateVisibleEdgeOutlinePriceLabel: () => (/* reexport */ updateVisibleEdgeOutlinePriceLabel)
});

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/state.ts
/**
 * Centralized WebView global state.
 *
 * All \`window.*\` chart globals are accessed/mutated through this module so
 * the rest of the codebase never touches \`window\` directly — making
 * dependencies explicit and tests mockable.
 */
let state;
function getWindow() {
    return typeof window !== 'undefined' ? window : {};
}
/**
 * Returns the global chart state, lazily initializing from \`window\` on first access.
 * In tests, call \`resetState()\` or \`setState()\` to inject a mock.
 */
function getState() {
    if (!state) {
        state = getWindow();
    }
    return state;
}
/** Replace the state object (for testing). */
function setState(mock) {
    state = mock;
}
/** Reset to reading from \`window\` again (for testing teardown). */
function resetState() {
    state = undefined;
}
function suppressChartUserInteraction(ms) {
    getState().__mmSuppressChartInteractUntil = Date.now() + (ms || 600);
}
function bumpLineChartOhlcvEpoch() {
    const s = getState();
    s.lineChartOhlcvEpoch = (s.lineChartOhlcvEpoch || 0) + 1;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/bridge.ts
/**
 * Communication bridge between the WebView and React Native.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Posts a typed message to React Native via \`ReactNativeWebView.postMessage\`.
 */
function sendToReactNative(type, payload = {}) {
    const w = getState();
    if (w.ReactNativeWebView) {
        w.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    }
}
const LAYOUT_SETTLE_DATA_FALLBACK_MS = 400;
function scheduleChartLayoutSettledNotify() {
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const s = getState();
                if (s.chartWidget && s.isChartReady) {
                    sendToReactNative('CHART_LAYOUT_SETTLED', {});
                }
            });
        });
    }
    catch {
        try {
            setTimeout(() => {
                const s = getState();
                if (s.chartWidget && s.isChartReady) {
                    sendToReactNative('CHART_LAYOUT_SETTLED', {});
                }
            }, 48);
        }
        catch {
            // swallow
        }
    }
}
function clearMmLayoutSettleFallbackTimer() {
    const s = getState();
    if (s.__mmLayoutSettleFallbackTimer != null) {
        clearTimeout(s.__mmLayoutSettleFallbackTimer);
        s.__mmLayoutSettleFallbackTimer = null;
    }
}
/**
 * Completes deferred layout settle: applies scale/line overrides then notifies RN.
 * Accepts optional callbacks so the caller wires in chartLayout/overlay logic
 * without creating a circular import.
 */
function tryCompleteLayoutSettleAfterDataCore(onSettle) {
    const s = getState();
    if (!s.__mmLayoutSettlePending)
        return;
    s.__mmLayoutSettlePending = false;
    clearMmLayoutSettleFallbackTimer();
    try {
        if (onSettle)
            onSettle();
    }
    catch {
        // swallow
    }
    scheduleChartLayoutSettledNotify();
}
function queueTryCompleteLayoutSettleAfterData(onSettle) {
    const s = getState();
    if (!s.__mmLayoutSettlePending)
        return;
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                tryCompleteLayoutSettleAfterDataCore(onSettle);
            });
        });
    }
    catch {
        setTimeout(() => tryCompleteLayoutSettleAfterDataCore(onSettle), 32);
    }
}
function beginDeferredLayoutSettleAfterOhlcvReload() {
    const s = getState();
    clearMmLayoutSettleFallbackTimer();
    s.__mmLayoutSettlePending = true;
    s.__mmLayoutSettleFallbackTimer = setTimeout(() => {
        s.__mmLayoutSettleFallbackTimer = null;
        if (s.__mmLayoutSettlePending) {
            tryCompleteLayoutSettleAfterDataCore();
        }
    }, LAYOUT_SETTLE_DATA_FALLBACK_MS);
}
function abortDeferredLayoutSettleAndNotify() {
    const s = getState();
    s.__mmLayoutSettlePending = false;
    clearMmLayoutSettleFallbackTimer();
    scheduleChartLayoutSettledNotify();
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/theme.ts
/**
 * Generates 19 shades from white through the given hex color to black.
 * Index 0 is lightest (near white), index 9 is the base color, index 18 is near black.
 */
function generatePaletteShades(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const shades = [];
    for (let i = 0; i < 19; i++) {
        const t = i / 18;
        let sr, sg, sb;
        if (t < 0.5) {
            const f = 1 - t * 2;
            sr = Math.round(r + (255 - r) * f);
            sg = Math.round(g + (255 - g) * f);
            sb = Math.round(b + (255 - b) * f);
        }
        else {
            const f2 = (t - 0.5) * 2;
            sr = Math.round(r * (1 - f2));
            sg = Math.round(g * (1 - f2));
            sb = Math.round(b * (1 - f2));
        }
        shades.push('#' + ((1 << 24) + (sr << 16) + (sg << 8) + sb).toString(16).slice(1));
    }
    return shades;
}
/**
 * TradingView style overrides that apply the given color across all
 * non-candle series types (line, lineWithMarkers, area, baseline).
 */
function getSeriesColorOverrides(color) {
    return {
        'mainSeriesProperties.lineStyle.color': color,
        'mainSeriesProperties.lineStyle.colorType': 'solid',
        'mainSeriesProperties.lineStyle.linewidth': 2,
        'mainSeriesProperties.lineWithMarkersStyle.color': color,
        'mainSeriesProperties.lineWithMarkersStyle.colorType': 'solid',
        'mainSeriesProperties.lineWithMarkersStyle.linewidth': 2,
        'mainSeriesProperties.areaStyle.linecolor': color,
        'mainSeriesProperties.areaStyle.linewidth': 2,
        'mainSeriesProperties.baselineStyle.topLineColor': color,
        'mainSeriesProperties.baselineStyle.topLineWidth': 2,
        'mainSeriesProperties.baselineStyle.bottomLineColor': color,
        'mainSeriesProperties.baselineStyle.bottomLineWidth': 2,
        'mainSeriesProperties.baselineStyle.topFillColor1': 'rgba(0,0,0,0)',
        'mainSeriesProperties.baselineStyle.topFillColor2': 'rgba(0,0,0,0)',
        'mainSeriesProperties.baselineStyle.bottomFillColor1': 'rgba(0,0,0,0)',
        'mainSeriesProperties.baselineStyle.bottomFillColor2': 'rgba(0,0,0,0)',
    };
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/crosshairFormat.ts
const SUBSCRIPT_DIGITS = [
    '\\u2080',
    '\\u2081',
    '\\u2082',
    '\\u2083',
    '\\u2084',
    '\\u2085',
    '\\u2086',
    '\\u2087',
    '\\u2088',
    '\\u2089',
];
/**
 * Converts a non-negative integer to its Unicode subscript representation.
 * e.g. 42 → "₄₂"
 */
function toSubscriptDigits(n) {
    return String(n)
        .split('')
        .map((digit) => SUBSCRIPT_DIGITS[parseInt(digit, 10)])
        .join('');
}
/**
 * For tiny prices (0 < abs < 0.0001 with ≥4 leading zeros after the decimal),
 * returns subscript notation like "0.0₇1234". Returns null if not applicable.
 */
function formatSubscriptNotation(abs) {
    if (abs <= 0 || abs >= 0.0001) {
        return null;
    }
    const priceStr = abs.toFixed(20);
    const match = priceStr.match(/^0\\.0*([1-9]\\d*)/);
    if (!match) {
        return null;
    }
    const leadingZeros = priceStr.indexOf(match[1]) - 2;
    if (leadingZeros < 4) {
        return null;
    }
    const sig = match[1];
    const significantDigits = sig.slice(0, 4).replace(/0{1,4}$/, '') || sig.slice(0, 2);
    return '0.0' + toSubscriptDigits(leadingZeros) + significantDigits;
}
/**
 * Formats a price for the crosshair overlay — number only, no currency symbol.
 * Tiny prices use subscript notation; larger prices use Intl formatting.
 */
function formatCrosshairPrice(price) {
    if (price === undefined || price === null || isNaN(Number(price))) {
        return '';
    }
    const p = Number(price);
    if (p === 0) {
        return '0.00';
    }
    const abs = Math.abs(p);
    const sub = formatSubscriptNotation(abs);
    if (sub) {
        return p < 0 ? '-' + sub : sub;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: abs >= 1 ? 2 : 4,
    }).format(p);
}
/**
 * Formats a Unix timestamp (seconds) into "Wed 20 May '26 14:05" for the
 * crosshair time label.
 */
function formatCrosshairTime(timeSeconds) {
    if (timeSeconds === undefined ||
        timeSeconds === null ||
        isNaN(Number(timeSeconds))) {
        return '';
    }
    const d = new Date(Number(timeSeconds) * 1000);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];
    const w = weekdays[d.getDay()];
    const day = d.getDate();
    const mo = months[d.getMonth()];
    const y = String(d.getFullYear()).slice(-2);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return w + ' ' + day + ' ' + mo + " '" + y + ' ' + h + ':' + min;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/resolution.ts
/**
 * Maps OHLCV interval durations (ms) to TradingView resolution strings.
 */
const INTERVAL_MS_TO_TV = {
    60000: '1',
    180000: '3',
    300000: '5',
    900000: '15',
    1800000: '30',
    3600000: '60',
    7200000: '120',
    14400000: '240',
    28800000: '480',
    43200000: '720',
    86400000: '1D',
    259200000: '3D',
    604800000: '1W',
    2592000000: '1M',
};
/**
 * Determines the TradingView resolution string from OHLCV bar timestamps.
 *
 * Uses the median of the first few time diffs to avoid gaps (e.g. weekends)
 * skewing the result, then picks the closest INTERVAL_MS_TO_TV match.
 * Falls back to '5' (5-minute) for empty or single-bar data.
 */
function detectResolution(data) {
    if (data.length < 2)
        return '5';
    const diffs = [];
    const len = Math.min(data.length - 1, 10);
    for (let i = 0; i < len; i++) {
        diffs.push(data[i + 1].time - data[i].time);
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    const keys = Object.keys(INTERVAL_MS_TO_TV);
    let best = '5';
    let bestDist = Infinity;
    for (let k = 0; k < keys.length; k++) {
        const d = Math.abs(Number(keys[k]) - median);
        if (d < bestDist) {
            bestDist = d;
            best = INTERVAL_MS_TO_TV[Number(keys[k])];
        }
    }
    return best;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/datafeed.ts
/**
 * TradingView \`variable_tick_size\` string.
 *
 * Tells TradingView to dynamically adjust pricescale/minmov based on
 * the current price level. Format: "tickSize threshold tickSize threshold …"
 * where each tickSize applies for prices below the next threshold, and
 * the last tickSize applies to all prices above the last threshold.
 */
const VARIABLE_TICK_SIZE = [
    '0.0000000001',
    '0.000001', // prices < $0.000001 → 10 dp
    '0.00000001',
    '0.0001', // prices < $0.0001   →  8 dp
    '0.000001',
    '0.01', // prices < $0.01     →  6 dp
    '0.0001',
    '1', // prices < $1        →  4 dp
    '0.01',
    '10000', // prices < $10000    →  2 dp
    '0.1', // prices ≥ $10000    →  1 dp
].join(' ');
const SUPPORTED_RESOLUTIONS = [
    '1',
    '3',
    '5',
    '15',
    '30',
    '60',
    '120',
    '240',
    '480',
    '720',
    '1D',
    '3D',
    '1W',
    '1M',
];
const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';
/**
 * Filters bars within a time range [fromMs, toMs), returning up to \`countBack\` bars.
 * If fewer bars exist in the strict range, falls back to the last \`countBack\` bars before \`toMs\`.
 */
function filterBarsForRange(ohlcvData, fromMs, toMs, countBack) {
    let barsInRange = [];
    for (let i = 0; i < ohlcvData.length; i++) {
        const b = ohlcvData[i];
        if (b.time >= fromMs && b.time < toMs) {
            barsInRange.push({
                time: b.time,
                open: b.open,
                high: b.high,
                low: b.low,
                close: b.close,
                volume: b.volume,
            });
        }
    }
    if (barsInRange.length < countBack) {
        const allBeforeTo = [];
        for (let j = 0; j < ohlcvData.length; j++) {
            if (ohlcvData[j].time < toMs) {
                allBeforeTo.push(ohlcvData[j]);
            }
        }
        const startIdx = Math.max(0, allBeforeTo.length - countBack);
        barsInRange = [];
        for (let k = startIdx; k < allBeforeTo.length; k++) {
            const bar = allBeforeTo[k];
            barsInRange.push({
                time: bar.time,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
            });
        }
    }
    return barsInRange;
}
/**
 * Fetches the next page of OHLCV history directly from the Price API.
 * Called from \`getBars\` when pagination has a cursor, avoiding the RN round-trip.
 *
 * Dependencies are injected so this function is testable without \`window.*\` globals.
 */
function fetchOlderBars(pending, deps) {
    const pag = deps.getOhlcvPagination();
    if (!pag.nextCursor || !pag.hasMore || !pag.assetId) {
        pending.onResult([], { noData: true });
        deps.onLayoutSettlePending();
        return;
    }
    const gen = deps.getOhlcvGeneration();
    const url = OHLCV_BASE_URL +
        '/' +
        pag.assetId +
        '?' +
        'nextCursor=' +
        encodeURIComponent(pag.nextCursor) +
        (pag.vsCurrency
            ? '&vsCurrency=' + encodeURIComponent(pag.vsCurrency)
            : '');
    const doFetch = deps.fetchFn || fetch;
    doFetch(url)
        .then((response) => {
        if (!response.ok) {
            throw new Error('OHLCV API error: ' + response.status);
        }
        return response.json();
    })
        .then((result) => {
        if (gen !== deps.getOhlcvGeneration()) {
            return;
        }
        if (!result || !Array.isArray(result.data)) {
            throw new Error('OHLCV API response: invalid payload');
        }
        const newBars = [];
        for (let i = 0; i < result.data.length; i++) {
            const c = result.data[i];
            newBars.push({
                time: c.timestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
            });
        }
        deps.updatePagination(result.nextCursor || null, !!result.hasNext);
        if (newBars.length > 0) {
            deps.setOhlcvData(newBars.concat(deps.getOhlcvData()));
        }
        const olderBars = [];
        for (let j = 0; j < newBars.length; j++) {
            if (newBars[j].time < pending.oldestAtDefer) {
                olderBars.push(newBars[j]);
            }
        }
        pending.onResult(olderBars, { noData: olderBars.length === 0 });
        deps.onLayoutSettlePending();
    })
        .catch((err) => {
        if (gen !== deps.getOhlcvGeneration()) {
            return;
        }
        pending.onResult([], { noData: true });
        deps.onLayoutSettlePending();
        deps.sendDebug('fetchOlderBars error: ' + (err.message || String(err)));
    });
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/lineChrome.ts
/**
 * Line chrome: boolean quad controlling custom overlays vs TradingView built-ins.
 */

const LINE_CHROME_DEFAULTS = {
    hideTimeScale: false,
    useCustomLineEndMarker: true,
    useCustomDashedLastPriceLine: true,
    useCustomPriceLabels: true,
};
function lineChromePickBool(lc, key, fallback) {
    return lc[key] !== undefined ? !!lc[key] : fallback;
}
/** Effective line chrome: CONFIG.lineChrome merged with defaults. */
function getLineChrome() {
    const s = getState();
    const lc = (s.CONFIG && s.CONFIG.lineChrome) || {};
    return {
        hideTimeScale: lineChromePickBool(lc, 'hideTimeScale', LINE_CHROME_DEFAULTS.hideTimeScale),
        useCustomLineEndMarker: lineChromePickBool(lc, 'useCustomLineEndMarker', LINE_CHROME_DEFAULTS.useCustomLineEndMarker),
        useCustomDashedLastPriceLine: lineChromePickBool(lc, 'useCustomDashedLastPriceLine', LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine),
        useCustomPriceLabels: lineChromePickBool(lc, 'useCustomPriceLabels', LINE_CHROME_DEFAULTS.useCustomPriceLabels),
    };
}
/**
 * Normalizes an RN SET_LINE_CHROME payload to the full boolean quad.
 * Missing keys use defaults.
 */
function resolveLineChromeFromPayload(payload) {
    if (!payload || typeof payload !== 'object')
        return null;
    return {
        hideTimeScale: payload.hideTimeScale !== undefined
            ? !!payload.hideTimeScale
            : LINE_CHROME_DEFAULTS.hideTimeScale,
        useCustomLineEndMarker: payload.useCustomLineEndMarker !== undefined
            ? !!payload.useCustomLineEndMarker
            : LINE_CHROME_DEFAULTS.useCustomLineEndMarker,
        useCustomDashedLastPriceLine: payload.useCustomDashedLastPriceLine !== undefined
            ? !!payload.useCustomDashedLastPriceLine
            : LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine,
        useCustomPriceLabels: payload.useCustomPriceLabels !== undefined
            ? !!payload.useCustomPriceLabels
            : LINE_CHROME_DEFAULTS.useCustomPriceLabels,
    };
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/indicators.ts
/**
 * TradingView indicator (study) add/remove handlers.
 */


/* eslint-disable @typescript-eslint/no-explicit-any */
function isOwnStringKey(key) {
    return (typeof key === 'string' &&
        key !== '__proto__' &&
        key !== 'constructor' &&
        key !== 'prototype');
}
/**
 * Resolves a preset indicator name to a TradingView study name + inputs.
 * Non-preset names are forwarded as-is.
 */
function resolveIndicatorPreset(name, payloadInputs) {
    switch (name) {
        case 'MACD':
            return { studyName: 'MACD', inputs: { in_0: 12, in_1: 26, in_2: 9 } };
        case 'RSI':
            return { studyName: 'Relative Strength Index', inputs: { in_0: 14 } };
        case 'MA200':
            return { studyName: 'Moving Average', inputs: { in_0: 200 } };
        default:
            return { studyName: name, inputs: payloadInputs || {} };
    }
}
function handleAddIndicator(payload) {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    if (!payload || !payload.name)
        return;
    const indicatorName = payload.name;
    if (!isOwnStringKey(indicatorName))
        return;
    if (s.activeStudies.has(indicatorName))
        return;
    try {
        const chart = s.chartWidget.activeChart();
        const { studyName, inputs } = resolveIndicatorPreset(indicatorName, payload.inputs);
        chart
            .createStudy(studyName, false, false, inputs)
            .then((studyId) => {
            s.activeStudies.set(indicatorName, studyId);
            sendToReactNative('INDICATOR_ADDED', {
                name: indicatorName,
                id: String(studyId),
            });
        })
            .catch((error) => {
            sendToReactNative('ERROR', {
                message: 'Failed to add indicator: ' + error.message,
            });
        });
    }
    catch (error) {
        sendToReactNative('ERROR', { message: error.message });
    }
}
function handleRemoveIndicator(payload) {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    if (!payload || !payload.name)
        return;
    const indicatorName = payload.name;
    if (!isOwnStringKey(indicatorName))
        return;
    if (!s.activeStudies.has(indicatorName))
        return;
    const studyId = s.activeStudies.get(indicatorName);
    if (!studyId)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        chart.removeEntity(studyId);
        s.activeStudies.delete(indicatorName);
        sendToReactNative('INDICATOR_REMOVED', { name: indicatorName });
    }
    catch (error) {
        sendToReactNative('ERROR', { message: error.message });
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/volume.ts
/**
 * Volume study creation and toggle handling.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function createVolumeStudy(useOverlay) {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    if (s.volumeStudyId)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        const theme = s.CONFIG.theme;
        const inputs = {
            'volume ma.display': 0,
            'volume.color.0': theme.errorColor,
            'volume.color.1': theme.successColor,
            'volume.transparency': useOverlay ? 70 : 0,
        };
        const promise = useOverlay
            ? chart.createStudy('Volume', true, false, {}, inputs, {
                priceScale: 'no-scale',
            })
            : chart.createStudy('Volume', false, false, {}, inputs);
        promise
            .then((studyId) => {
            s.volumeStudyId = studyId;
            try {
                const heights = chart.getAllPanesHeight();
                if (heights.length === 2) {
                    const total = heights[0] + heights[1];
                    const minVolumePx = 56;
                    const minMainPx = 72;
                    let vol = Math.max(Math.round(total * 0.22), minVolumePx);
                    let main = total - vol;
                    if (main < minMainPx && total > minMainPx + minVolumePx) {
                        main = minMainPx;
                        vol = total - main;
                    }
                    else if (main < minMainPx) {
                        main = Math.max(48, total - minVolumePx);
                        vol = total - main;
                    }
                    chart.setAllPanesHeight([main, vol]);
                }
            }
            catch {
                // swallow
            }
        })
            .catch(() => { });
    }
    catch {
        // swallow
    }
}
function handleToggleVolume(payload) {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady || !payload)
        return;
    suppressChartUserInteraction(600);
    const useOverlay = payload.volumeOverlay === true;
    if (!payload.visible) {
        if (s.volumeStudyId) {
            try {
                s.chartWidget.activeChart().removeEntity(s.volumeStudyId);
            }
            catch {
                // swallow
            }
            s.volumeStudyId = null;
        }
        s.volumeIsOverlay = null;
        return;
    }
    if (s.volumeStudyId &&
        s.volumeIsOverlay !== null &&
        s.volumeIsOverlay !== useOverlay) {
        try {
            s.chartWidget.activeChart().removeEntity(s.volumeStudyId);
        }
        catch {
            // swallow
        }
        s.volumeStudyId = null;
    }
    s.volumeIsOverlay = useOverlay;
    if (!s.volumeStudyId) {
        createVolumeStudy(useOverlay);
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/positionLines.ts
/**
 * Perps-style dashed horizontal position lines (entry, TP, SL, liquidation).
 */


/* eslint-disable @typescript-eslint/no-explicit-any */
function clearPositionLines() {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        for (let i = 0; i < s.positionShapeIds.length; i++) {
            try {
                chart.removeEntity(s.positionShapeIds[i]);
            }
            catch {
                // already removed
            }
        }
        s.positionShapeIds = [];
    }
    catch (error) {
        sendToReactNative('ERROR', {
            message: 'Failed to clear position lines: ' + error.message,
        });
    }
}
function handleSetPositionLines(payload) {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    clearPositionLines();
    if (!payload || !payload.position)
        return;
    const position = payload.position;
    const theme = s.CONFIG.theme;
    try {
        const chart = s.chartWidget.activeChart();
        const lines = [];
        if (position.entryPrice) {
            lines.push({
                price: position.entryPrice,
                text: 'Entry',
                color: '#858585',
                lineStyle: 2,
            });
        }
        if (position.takeProfitPrice) {
            lines.push({
                price: position.takeProfitPrice,
                text: 'TP',
                color: theme.successColor,
                lineStyle: 2,
            });
        }
        if (position.stopLossPrice) {
            lines.push({
                price: position.stopLossPrice,
                text: 'SL',
                color: '#858585',
                lineStyle: 2,
            });
        }
        if (position.liquidationPrice) {
            lines.push({
                price: position.liquidationPrice,
                text: 'Liq',
                color: theme.errorColor,
                lineStyle: 2,
            });
        }
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            chart
                .createShape({ price: line.price }, {
                shape: 'horizontal_line',
                lock: true,
                disableSelection: true,
                disableSave: true,
                disableUndo: true,
                text: line.text,
                overrides: {
                    linecolor: line.color,
                    linestyle: line.lineStyle,
                    linewidth: 1,
                    showLabel: true,
                    textcolor: line.color,
                    fontsize: 11,
                    horzLabelsAlign: 'right',
                    showPrice: true,
                },
            })
                .then((entityId) => {
                if (entityId) {
                    s.positionShapeIds.push(entityId);
                }
            })
                .catch(() => { });
        }
    }
    catch (error) {
        sendToReactNative('ERROR', {
            message: 'Failed to add position lines: ' + error.message,
        });
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/timeUtils.ts
/**
 * Time normalization utilities shared across line-end dot, overlays, and datafeed.
 */
/** Normalize TV/chart timestamps to Unix seconds (library mixes sec/ms in places). */
function normalizeChartUnixSec(t) {
    const n = Number(t);
    if (!isFinite(n))
        return null;
    return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}
/** Raw TV timestamp → Unix ms (keeps sub-second precision). */
function chartRawTimeToUnixMs(rawT) {
    const n = Number(rawT);
    if (!isFinite(n))
        return null;
    return n >= 1e12 ? n : n * 1000;
}
/** Step between last two OHLCV bars in seconds. */
function getApproxBarDurationSec(ohlcvData) {
    if (!ohlcvData || ohlcvData.length < 2)
        return 300;
    const ms = Math.abs(ohlcvData[ohlcvData.length - 1].time -
        ohlcvData[ohlcvData.length - 2].time);
    return Math.max(60, Math.round(ms / 1000));
}
/** Interpolate close between consecutive bars at a given ms (line chart path). */
function interpolateCloseAlongLineAtTimeMs(data, tMs) {
    if (!data || !data.length || !isFinite(tMs))
        return null;
    const first = data[0];
    const last = data[data.length - 1];
    if (tMs <= first.time) {
        const c0 = Number(first.close);
        return isFinite(c0) ? c0 : null;
    }
    if (tMs >= last.time) {
        const cL = Number(last.close);
        return isFinite(cL) ? cL : null;
    }
    for (let i = 0; i < data.length - 1; i++) {
        const t0 = data[i].time;
        const t1 = data[i + 1].time;
        if (tMs >= t0 && tMs <= t1) {
            const a = Number(data[i].close);
            const b = Number(data[i + 1].close);
            if (!isFinite(a) || !isFinite(b))
                return null;
            if (t1 === t0)
                return a;
            return a + ((b - a) * (tMs - t0)) / (t1 - t0);
        }
    }
    return null;
}
/**
 * Parse bar time from TV \`data().last()\` / \`bars()[n]\` (seconds or ms; same shape as OHLCV tuple).
 */
function parseTimeFromTvDataLast(last) {
    if (last === null || last === undefined)
        return null;
    if (Array.isArray(last)) {
        const t0 = Number(last[0]);
        return isFinite(t0) ? t0 : null;
    }
    if (typeof last === 'object') {
        const obj = last;
        if (obj.time !== undefined && obj.time !== null) {
            const nt = Number(obj.time);
            if (isFinite(nt))
                return nt;
        }
        const v = obj.value;
        if (Array.isArray(v) && v.length > 0) {
            const tv = Number(v[0]);
            if (isFinite(tv))
                return tv;
        }
    }
    return null;
}
/**
 * Close from TV last bar object / OHLCV tuple (index 4).
 */
function parseCloseFromTvDataLast(last) {
    if (last === null || last === undefined)
        return null;
    if (Array.isArray(last)) {
        if (last.length > 4) {
            const c = Number(last[4]);
            if (isFinite(c))
                return c;
        }
        return null;
    }
    if (typeof last === 'object') {
        const obj = last;
        if (obj.close !== undefined && obj.close !== null) {
            const nc = Number(obj.close);
            if (isFinite(nc))
                return nc;
        }
        const v = obj.value;
        if (Array.isArray(v) && v.length > 4) {
            const nvc = Number(v[4]);
            if (isFinite(nvc))
                return nvc;
        }
        if (typeof v === 'number' && isFinite(v))
            return v;
    }
    return null;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/tvDomHacks.ts
/**
 * TradingView DOM traversal, injected CSS, and external link bridge.
 *
 * These functions reach into TV's internal DOM to hide/show elements,
 * inject CSS overrides, and intercept external link navigations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function findOuterChartMarkupTable(doc) {
    if (!doc || !doc.querySelectorAll)
        return null;
    const list = doc.querySelectorAll('.chart-markup-table');
    for (let i = 0; i < list.length; i++) {
        const el = list[i];
        const cn = el.className ? String(el.className) : '';
        if (el.classList.contains('pane'))
            continue;
        if (cn.indexOf('price-axis-container') !== -1)
            continue;
        if (cn.indexOf('time-axis') !== -1)
            continue;
        return el;
    }
    return list.length ? list[0] : null;
}
/** Run fn(document) and fn(iframe.contentDocument) when the chart lives in TV's same-origin iframe. */
function eachChartDocument(fn) {
    try {
        fn(document);
    }
    catch {
        // swallow
    }
    try {
        const container = document.getElementById('tv_chart_container');
        const iframe = container?.querySelector('iframe');
        if (iframe?.contentDocument) {
            fn(iframe.contentDocument);
        }
    }
    catch {
        // swallow
    }
}
const TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;
function isTradingViewExternalHostname(hostname) {
    if (!hostname)
        return false;
    const h = String(hostname).toLowerCase();
    return (h === 'tradingview.com' ||
        h === 'www.tradingview.com' ||
        /\\.tradingview\\.com$/.test(h));
}
function isTradingViewExternalHref(href) {
    if (!href)
        return false;
    try {
        const base = typeof window !== 'undefined' && window.location
            ? window.location.href
            : 'https://localhost/';
        const u = new URL(href, base);
        return isTradingViewExternalHostname(u.hostname);
    }
    catch {
        return false;
    }
}
function removeInjectedStyleByIdFromChartDocs(styleId) {
    eachChartDocument((d) => {
        const node = d.getElementById(styleId);
        if (node)
            node.remove();
    });
}
function removeLineChartMarkupStyle() {
    removeInjectedStyleByIdFromChartDocs('tv-line-chart-markup');
}
/** CSS selector prefix: top window uses \`#tv_chart_container \`; chart iframe document uses none. */
function tvScopedDomSelectors(targetDoc) {
    const top = targetDoc === document;
    const p = top ? '#tv_chart_container ' : '';
    return {
        overflowRule: buildChartDomUnclipCss(targetDoc) +
            (top
                ? '#tv_chart_container{overflow:visible!important;}'
                : '.chart-widget{overflow:visible!important;}'),
        chartRootSel: p + '.chart-widget > .chart-markup-table',
        screenSel: p + '.chart-container-border [class^="screen-"]',
        widgetSel: p + '.chart-widget',
    };
}
function buildChartDomUnclipCss(targetDoc) {
    const top = targetDoc === document;
    const p = top ? '#tv_chart_container ' : '';
    return (p +
        '.layout__area--center,' +
        p +
        '.layout__area--right,' +
        p +
        '.js-rootresizer__contents,' +
        p +
        '.chart-container,' +
        p +
        '.chart-container-border{' +
        'overflow:visible!important;clip-path:none!important;}' +
        p +
        '.chart-widget > .chart-markup-table > div:first-child .pane{' +
        'overflow:visible!important;clip-path:none!important;}' +
        p +
        '.chart-widget > .chart-markup-table > div:first-child .pane .chart-gui-wrapper{' +
        'overflow:visible!important;clip-path:none!important;}');
}
function injectChartContainerOverflowUnclip(targetDoc) {
    if (!targetDoc?.getElementById)
        return;
    const id = 'tv-chart-container-unclip';
    const css = buildChartDomUnclipCss(targetDoc);
    let node = targetDoc.getElementById(id);
    if (!node) {
        node = targetDoc.createElement('style');
        node.id = id;
        (targetDoc.head || targetDoc.documentElement).appendChild(node);
    }
    node.textContent = css;
}
function applyChartContainerOverflowUnclip() {
    eachChartDocument(injectChartContainerOverflowUnclip);
}
function scheduleChartDomUnclip() {
    function run() {
        applyChartContainerOverflowUnclip();
    }
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(run);
        });
    }
    catch {
        setTimeout(run, 0);
    }
    setTimeout(run, 100);
    setTimeout(run, 280);
}
function getChartMarkupTableContext() {
    const container = document.getElementById('tv_chart_container');
    if (!container)
        return null;
    let table = findOuterChartMarkupTable(document);
    let doc = document;
    if (!table || !container.contains(table)) {
        table = null;
    }
    if (!table) {
        try {
            const iframe = container.querySelector('iframe');
            if (iframe?.contentDocument) {
                table = findOuterChartMarkupTable(iframe.contentDocument);
                if (table)
                    doc = iframe.contentDocument;
            }
        }
        catch {
            // swallow
        }
    }
    return table ? { doc, table } : null;
}
function injectHidePriceScaleModeButtonsStyle(targetDoc) {
    if (!targetDoc?.getElementById)
        return;
    const id = 'tv-hide-price-scale-mode-buttons';
    if (targetDoc.getElementById(id))
        return;
    const style = targetDoc.createElement('style');
    style.id = id;
    style.textContent =
        '[class*="priceScaleModeButtons"]{' +
            'display:none!important;visibility:hidden!important;pointer-events:none!important;' +
            'width:0!important;height:0!important;overflow:hidden!important;opacity:0!important;}';
    (targetDoc.head || targetDoc.documentElement).appendChild(style);
}
function applyHidePriceScaleModeButtons() {
    eachChartDocument(injectHidePriceScaleModeButtonsStyle);
}
function scheduleHidePriceScaleModeButtons() {
    applyHidePriceScaleModeButtons();
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(applyHidePriceScaleModeButtons);
        });
    }
    catch {
        // swallow
    }
    setTimeout(applyHidePriceScaleModeButtons, 450);
}
function removeCandleVolumeScaleMarkup() {
    removeInjectedStyleByIdFromChartDocs('tv-candle-volume-markup');
}
function installTradingViewExternalOpenBridge() {
    function sendTvClicked(url) {
        sendToReactNative('CHART_TRADINGVIEW_CLICKED', url ? { url } : {});
    }
    function handleTradingViewLinkCapture(ev) {
        const t = ev.target;
        if (!t || typeof t.closest !== 'function')
            return;
        const a = t.closest('a');
        if (!a?.href || !isTradingViewExternalHref(a.href))
            return;
        const now = Date.now();
        if (now - (window.__mmLastTvExternalBridgeAt || 0) <
            TV_EXTERNAL_BRIDGE_DEBOUNCE_MS) {
            return;
        }
        window.__mmLastTvExternalBridgeAt = now;
        try {
            ev.preventDefault();
            ev.stopPropagation();
        }
        catch {
            // swallow
        }
        sendTvClicked(a.href);
    }
    function patchWindowOpen(win) {
        if (!win?.open || win.__mmTvOpenPatched)
            return;
        win.__mmTvOpenPatched = true;
        const origOpen = win.open.bind(win);
        win.open = function (url, name, specs) {
            if (url != null &&
                url !== '' &&
                isTradingViewExternalHref(String(url))) {
                const now2 = Date.now();
                if (now2 - (window.__mmLastTvExternalBridgeAt || 0) <
                    TV_EXTERNAL_BRIDGE_DEBOUNCE_MS) {
                    return null;
                }
                window.__mmLastTvExternalBridgeAt = now2;
                sendTvClicked(String(url));
                return null;
            }
            return origOpen(url, name, specs);
        };
    }
    function applyAll() {
        patchWindowOpen(window);
        eachChartDocument((doc) => {
            try {
                patchWindowOpen(doc.defaultView);
            }
            catch {
                // swallow
            }
            if (doc?.addEventListener && !doc.__mmTvLinkCaptureInstalled) {
                doc.__mmTvLinkCaptureInstalled = true;
                doc.addEventListener('click', handleTradingViewLinkCapture, true);
            }
        });
    }
    applyAll();
    try {
        const container = document.getElementById('tv_chart_container');
        const iframe = container?.querySelector('iframe');
        if (iframe) {
            iframe.addEventListener('load', applyAll);
        }
    }
    catch {
        // swallow
    }
    setTimeout(applyAll, 200);
    setTimeout(applyAll, 800);
    setTimeout(applyAll, 2000);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/loadLibrary.ts
/**
 * TradingView charting_library.js CDN loader.
 */


/* eslint-disable @typescript-eslint/no-explicit-any */
let libraryLoadAttempts = 0;
const maxLibraryLoadAttempts = 50;
function resetLibraryLoadAttempts() {
    libraryLoadAttempts = 0;
}
function getLibraryLoadAttempts() {
    return libraryLoadAttempts;
}
/**
 * Loads the TradingView charting library from CONFIG.libraryUrl.
 * Calls \`initChart\` when the library loads and data is available.
 */
function loadLibrary(initChart) {
    const s = getState();
    const scriptUrl = s.CONFIG.libraryUrl + 'charting_library.js';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.onload = () => {
        s.libraryLoaded = true;
        if (s.ohlcvData.length > 0) {
            initChart();
        }
    };
    script.onerror = () => {
        s.libraryError =
            'Failed to load TradingView library. URL: ' + scriptUrl;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML =
                '<div style="text-align:center;padding:20px;">' +
                    '<p style="color:#FF6B6B;margin-bottom:10px;">Failed to load chart library</p>' +
                    '<p style="font-size:12px;color:#888;">URL: ' +
                    scriptUrl +
                    '</p>' +
                    '<p style="font-size:12px;color:#888;">Check S3 access or CORS configuration.</p>' +
                    '</div>';
        }
        sendToReactNative('ERROR', { message: s.libraryError });
    };
    document.head.appendChild(script);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/chartLayout.ts
/**
 * Chart scale layout, series colors, and time-scale visibility.
 */




/* eslint-disable @typescript-eslint/no-explicit-any */
function applySeriesColors() {
    const s = getState();
    if (!s.chartWidget)
        return;
    const color = s.CONFIG.theme.successColor;
    try {
        s.chartWidget.applyOverrides(getSeriesColorOverrides(color));
        const series = s.chartWidget.activeChart().getSeries();
        series.setChartStyleProperties(2, {
            color,
            colorType: 'solid',
            linewidth: 2,
        });
        series.setChartStyleProperties(10, {
            topLineColor: color,
            bottomLineColor: color,
            topLineWidth: 2,
            bottomLineWidth: 2,
        });
    }
    catch {
        // swallow
    }
}
function syncMainSeriesToRightScale() {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    try {
        s.chartWidget.activeChart().getSeries().detachToRight();
    }
    catch {
        // swallow
    }
}
function scheduleLineChartLayoutReflow() {
    const s = getState();
    if (s.currentChartType !== 2 || !s.chartWidget)
        return;
    function run() {
        const st = getState();
        if (!st.chartWidget || st.currentChartType !== 2)
            return;
        try {
            syncMainSeriesToRightScale();
        }
        catch {
            // swallow
        }
    }
    try {
        requestAnimationFrame(run);
    }
    catch {
        setTimeout(run, 0);
    }
    setTimeout(run, 120);
}
function injectHideTimeAxisStyle() {
    const s = getState();
    const paneBg = s.CONFIG?.theme?.backgroundColor || '#131416';
    eachChartDocument((targetDoc) => {
        if (!targetDoc?.getElementById)
            return;
        const id = 'tv-hide-time-axis';
        const existing = targetDoc.getElementById(id);
        if (existing)
            existing.remove();
        const sel = tvScopedDomSelectors(targetDoc);
        const hide = 'display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;' +
            'max-height:0!important;overflow:hidden!important;pointer-events:none!important;opacity:0!important;' +
            'flex:0 0 0!important;margin:0!important;padding:0!important;border:none!important;';
        const style = targetDoc.createElement('style');
        style.id = id;
        style.textContent =
            sel.widgetSel + '{background-color:' + paneBg + '!important;}' +
                sel.chartRootSel + '{display:flex!important;flex-direction:column!important;background-color:' + paneBg + '!important;}' +
                sel.chartRootSel + ' > div{background-color:' + paneBg + '!important;}' +
                sel.chartRootSel + '>div:last-child{' + hide + '}' +
                sel.chartRootSel + '>div:last-child .time-axis,' +
                sel.chartRootSel + '>div:last-child [class*="price-axis-container"]{' + hide + '}' +
                sel.chartRootSel + '>div:first-child{display:flex!important;flex:1 1 auto!important;height:100%!important;min-height:0!important;' +
                'max-height:none!important;align-items:stretch!important;align-self:stretch!important;}' +
                sel.chartRootSel + '>div:first-child > .chart-markup-table.pane,' +
                sel.chartRootSel + '>div:first-child > .pane,' +
                sel.chartRootSel + '>div:first-child > .chart-markup-table.price-axis-container{' +
                'flex:1 1 auto!important;height:100%!important;min-height:100%!important;max-height:none!important;align-self:stretch!important;' +
                'background-color:' + paneBg + '!important;}' +
                sel.chartRootSel + '>div:first-child .chart-gui-wrapper{height:100%!important;min-height:100%!important;max-height:none!important;' +
                'background-color:' + paneBg + '!important;}' +
                sel.screenSel + '{background:' + paneBg + '!important;}';
        (targetDoc.head || targetDoc.documentElement).appendChild(style);
    });
}
function removeHideTimeAxisStyle() {
    removeInjectedStyleByIdFromChartDocs('tv-hide-time-axis');
}
function applyLineTimeScaleVisibility(hide) {
    const s = getState();
    if (!s.chartWidget)
        return;
    const shouldHide = s.currentChartType === 2 && hide;
    try {
        s.chartWidget.applyOverrides({ 'timeScale.visible': !shouldHide });
    }
    catch {
        // swallow
    }
    try {
        s.chartWidget.applyOverrides({ 'scalesProperties.hideTimeScale': shouldHide });
    }
    catch {
        // swallow
    }
    if (shouldHide) {
        injectHideTimeAxisStyle();
        function nudgeResizeAfterHideTimeAxis() {
            const st = getState();
            if (!st.chartWidget || st.currentChartType !== 2 || !getLineChrome().hideTimeScale)
                return;
            try {
                st.chartWidget.resize();
            }
            catch {
                // swallow
            }
        }
        try {
            requestAnimationFrame(() => {
                requestAnimationFrame(nudgeResizeAfterHideTimeAxis);
            });
        }
        catch {
            setTimeout(nudgeResizeAfterHideTimeAxis, 0);
        }
        setTimeout(nudgeResizeAfterHideTimeAxis, 120);
    }
    else {
        removeHideTimeAxisStyle();
    }
}
function updateCandleVolumeScaleColumnVisibility() {
    removeCandleVolumeScaleMarkup();
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    if (s.currentChartType === 2)
        return;
    if (!s.volumeStudyId)
        return;
    const ctx = getChartMarkupTableContext();
    if (!ctx)
        return;
    const targetDoc = ctx.doc;
    const sel = tvScopedDomSelectors(targetDoc);
    const bg = s.CONFIG.theme.backgroundColor;
    const style = targetDoc.createElement('style');
    style.id = 'tv-candle-volume-markup';
    style.textContent =
        sel.overflowRule +
            sel.widgetSel + '{background:' + bg + '!important;}' +
            sel.screenSel + '{background:' + bg + '!important;}' +
            sel.chartRootSel + '{background:' + bg + '!important;}';
    (targetDoc.head || targetDoc.documentElement).appendChild(style);
}
/**
 * Central scale/chrome applicator — called after chart ready, chart type change, and line chrome change.
 */
function applyChartScaleLayout(type, callbacks) {
    const s = getState();
    if (!s.chartWidget)
        return;
    const theme = s.CONFIG.theme;
    const lc = getLineChrome();
    const useCustomLabels = lc.useCustomPriceLabels;
    const useCustomDashed = lc.useCustomDashedLastPriceLine;
    const axisLineColor = theme.backgroundColor || '#131416';
    try {
        s.chartWidget.applyOverrides({
            'scalesProperties.showRightScale': true,
            'scalesProperties.showLeftScale': false,
            'scalesProperties.showSeriesLastValue': !useCustomLabels,
            'scalesProperties.showStudyLastValue': false,
            'scalesProperties.showSymbolLabels': false,
            'scalesProperties.showPriceScaleCrosshairLabel': !useCustomLabels,
            'scalesProperties.showTimeScaleCrosshairLabel': !useCustomLabels,
            'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
            'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',
            'scalesProperties.textColor': theme.textColor,
            'mainSeriesProperties.showPriceLine': !useCustomDashed,
            'timeScale.borderColor': axisLineColor,
            'scalesProperties.lineColor': axisLineColor,
            'paneProperties.separatorColor': theme.backgroundColor,
            'paneProperties.topMargin': 12,
            'paneProperties.bottomMargin': 8,
        });
    }
    catch {
        // swallow
    }
    removeLineChartMarkupStyle();
    syncMainSeriesToRightScale();
    if (type === 2) {
        scheduleLineChartLayoutReflow();
    }
    applyChartContainerOverflowUnclip();
    scheduleChartDomUnclip();
    updateCandleVolumeScaleColumnVisibility();
    applyHidePriceScaleModeButtons();
    applyLineTimeScaleVisibility(s.currentChartType === 2 ? lc.hideTimeScale : false);
    if (!useCustomLabels) {
        callbacks?.hideCustomCrosshairLabels?.();
    }
    else {
        callbacks?.scheduleLastCloseLabelUpdate?.();
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/overlays.ts
/**
 * Custom crosshair labels, last-close price pill, and visible-edge outline pill.
 */





/* eslint-disable @typescript-eslint/no-explicit-any */
function hideCustomCrosshairLabels() {
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
function getMainPriceAxisLeftRelativeToOverlay(overlay) {
    if (!overlay?.getBoundingClientRect)
        return null;
    const orect = overlay.getBoundingClientRect();
    let bestLeft = null;
    let bestTop = Infinity;
    eachChartDocument((doc) => {
        const nodes = doc.querySelectorAll('.price-axis-container');
        for (let i = 0; i < nodes.length; i++) {
            const r = nodes[i].getBoundingClientRect();
            if (r.width < 2 || r.height < 16)
                continue;
            if (r.top < bestTop) {
                bestTop = r.top;
                bestLeft = r.left - orect.left;
            }
        }
    });
    if (bestLeft === null || isNaN(bestLeft))
        return null;
    const maxW = overlay.clientWidth;
    if (maxW <= 0)
        return null;
    return Math.max(0, Math.min(bestLeft, maxW));
}
function positionPricePillAtPlotPriceBoundary(el, overlay, yPx) {
    if (!el)
        return;
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
    }
    else {
        el.style.left = 'auto';
        el.style.right = '0';
        el.style.transform = 'translateY(-50%)';
    }
}
function updateCustomCrosshairLabels(params) {
    const elP = document.getElementById('crosshair-price-label');
    const elT = document.getElementById('crosshair-time-label');
    const overlay = document.getElementById('custom-crosshair-overlay');
    if (!elP || !elT || !overlay)
        return;
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
    }
    catch { /* */ }
    const ow = overlay.clientWidth;
    function positionTimeLabel() {
        const tw = elT.offsetWidth;
        const halfTw = tw / 2;
        const clampedOx = Math.max(halfTw, Math.min(ox, ow - halfTw));
        elT.style.left = clampedOx + 'px';
        elT.style.transform = 'translateX(-50%)';
    }
    positionTimeLabel();
    try {
        requestAnimationFrame(positionTimeLabel);
    }
    catch { /* */ }
}
function scheduleLastCloseLabelUpdate() {
    if (!getLineChrome().useCustomPriceLabels)
        return;
    const s = getState();
    if (s.lastCloseLabelScheduled)
        return;
    s.lastCloseLabelScheduled = true;
    try {
        requestAnimationFrame(() => {
            s.lastCloseLabelScheduled = false;
            updateLastClosePriceLabel();
            updateVisibleEdgeOutlinePriceLabel();
        });
    }
    catch {
        s.lastCloseLabelScheduled = false;
        setTimeout(() => {
            updateLastClosePriceLabel();
            updateVisibleEdgeOutlinePriceLabel();
        }, 0);
    }
}
function hideLastClosePriceLabelDom() {
    const el = document.getElementById('last-close-price-label');
    if (el) {
        el.style.display = 'none';
        el.style.left = '';
        el.style.right = '';
        el.style.transform = '';
    }
}
function hideCustomSeriesLastValueLabelDom() {
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
function getPriceYForLastCloseOverlay(chart, price) {
    if (!chart || price === undefined || price === null || isNaN(Number(price)))
        return null;
    const p = Number(price);
    try {
        const panes = chart.getPanes();
        if (!panes?.length)
            return null;
        const pane = panes[0];
        const scale = pane.getMainSourcePriceScale();
        if (!scale)
            return null;
        const range = scale.getVisiblePriceRange();
        if (!range || range.from === undefined || range.to === undefined)
            return null;
        const lo = Math.min(range.from, range.to);
        const hi = Math.max(range.from, range.to);
        const h = pane.getHeight();
        if (!h || h <= 0)
            return null;
        const pClamped = Math.min(hi, Math.max(lo, p));
        const inverted = typeof scale.isInverted === 'function' && scale.isInverted();
        const mode = typeof scale.getMode === 'function' ? scale.getMode() : 0;
        if (mode === 1 && lo > 0 && hi > 0 && pClamped > 0) {
            const logLo = Math.log(lo);
            const logHi = Math.log(hi);
            const logP = Math.log(pClamped);
            if (logHi === logLo)
                return inverted ? 0 : h / 2;
            const t = (logP - logLo) / (logHi - logLo);
            return inverted ? t * h : (1 - t) * h;
        }
        if (inverted)
            return ((pClamped - lo) / (hi - lo)) * h;
        return ((hi - pClamped) / (hi - lo)) * h;
    }
    catch {
        return null;
    }
}
/** Resolve time+price for line-end overlay, last-close pill, and dashed line. */
function resolveLineEndOverlayPointFromState(chart) {
    // Inline version — imports from lineEndDot would be circular; keep it simple.
    const s = getState();
    const fallback = (() => {
        if (s.ohlcvData?.length) {
            const b = s.ohlcvData[s.ohlcvData.length - 1];
            const tr = Number(b.time);
            const cl = Number(b.close);
            if (isFinite(tr) && isFinite(cl)) {
                return { timeSec: tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr), price: cl };
            }
        }
        return null;
    })();
    if (!chart)
        return fallback;
    try {
        const series = chart.getSeries();
        if (!series)
            return fallback;
        if (typeof series.data === 'function') {
            const ds = series.data();
            if (ds && typeof ds.last === 'function') {
                const last = ds.last();
                if (last) {
                    const tvT = parseTimeFromTvDataLast(last);
                    const tvC = parseCloseFromTvDataLast(last);
                    if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
                        return { timeSec: tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT), price: tvC };
                    }
                }
            }
        }
    }
    catch {
        // swallow
    }
    return fallback;
}
function updateLastClosePriceLabel() {
    const el = document.getElementById('last-close-price-label');
    if (!el)
        return;
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
    const labelPrice = resolved && isFinite(resolved.price) ? resolved.price : lastBar.close;
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
function getVisibleTimeRangeSecFromChart(chart) {
    try {
        const br = chart.getVisibleBarsRange();
        if (br?.from !== undefined && br?.to !== undefined) {
            const fromSec = normalizeChartUnixSec(br.from);
            const toSec = normalizeChartUnixSec(br.to);
            if (fromSec !== null && toSec !== null) {
                return { lo: Math.min(fromSec, toSec), hi: Math.max(fromSec, toSec) };
            }
        }
    }
    catch { /* */ }
    try {
        const vr = chart.getVisibleRange?.();
        if (vr?.from !== undefined && vr?.to !== undefined) {
            const fromSec = normalizeChartUnixSec(vr.from);
            const toSec = normalizeChartUnixSec(vr.to);
            if (fromSec !== null && toSec !== null) {
                return { lo: Math.min(fromSec, toSec), hi: Math.max(fromSec, toSec) };
            }
        }
    }
    catch { /* */ }
    return null;
}
function getRightmostOhlcvBarInVisibleTimeRange(chart, data, slackMultiplier = 2) {
    const range = getVisibleTimeRangeSecFromChart(chart);
    if (!range || !data?.length)
        return null;
    const slackSec = getApproxBarDurationSec(data) * slackMultiplier;
    const loMs = (range.lo - slackSec) * 1000;
    const hiMs = (range.hi + slackSec) * 1000;
    let best = null;
    for (let i = 0; i < data.length; i++) {
        const t = data[i].time;
        if (t >= loMs && t <= hiMs && (!best || t > best.time))
            best = data[i];
    }
    return best;
}
function getVisiblePlotRightEdgeTimeMs(chart) {
    if (!chart)
        return null;
    try {
        const ts = chart.getTimeScale();
        if (!ts?.coordinateToTime || !ts?.width)
            return null;
        const w = ts.width();
        if (!(w > 2))
            return null;
        const x = Math.max(0, Math.floor(w - 1));
        const rawT = ts.coordinateToTime(x);
        if (rawT == null)
            return null;
        let tMs = chartRawTimeToUnixMs(rawT);
        if (tMs === null)
            return null;
        const vr = chart.getVisibleRange?.();
        if (vr?.to != null) {
            const capMs = chartRawTimeToUnixMs(vr.to);
            if (capMs !== null && tMs > capMs)
                tMs = capMs;
        }
        return tMs;
    }
    catch {
        return null;
    }
}
function updateVisibleEdgeOutlinePriceLabel() {
    const elOut = document.getElementById('custom-series-last-value-label');
    if (!elOut)
        return;
    const s = getState();
    if (!getLineChrome().useCustomPriceLabels || !s.chartWidget || !s.isChartReady || !s.ohlcvData?.length) {
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
    const edgeBar = rightmost || getRightmostOhlcvBarInVisibleTimeRange(chart, s.ohlcvData, 6);
    if (!edgeBar) {
        hideCustomSeriesLastValueLabelDom();
        return;
    }
    let price = Number(edgeBar.close);
    if (ct === 2) {
        const tEdgeMs = getVisiblePlotRightEdgeTimeMs(chart);
        if (tEdgeMs !== null) {
            const pLine = interpolateCloseAlongLineAtTimeMs(s.ohlcvData, tEdgeMs);
            if (pLine !== null && isFinite(pLine))
                price = pLine;
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
        if (isFinite(o) && isFinite(c) && c < o)
            outlineColor = downColor;
    }
    elOut.style.borderColor = outlineColor;
    elOut.style.color = outlineColor;
    elOut.textContent = formatCrosshairPrice(price);
    elOut.style.display = 'flex';
    const overlayOut = document.getElementById('custom-crosshair-overlay');
    positionPricePillAtPlotPriceBoundary(elOut, overlayOut, y);
}
function subscribeLastCloseLabelUpdates() {
    const s = getState();
    if (!s.chartWidget)
        return;
    const tick = scheduleLastCloseLabelUpdate;
    function tickIfCustomPriceLabels() {
        if (getLineChrome().useCustomPriceLabels)
            tick();
    }
    try {
        s.chartWidget.subscribe('series_event', (ev) => {
            if (ev === 'price_scale_changed')
                tickIfCustomPriceLabels();
        });
    }
    catch { /* */ }
    try {
        s.chartWidget.subscribe('panes_height_changed', tickIfCustomPriceLabels);
    }
    catch { /* */ }
    try {
        s.chartWidget.activeChart().onVisibleRangeChanged().subscribe(null, () => {
            tickIfCustomPriceLabels();
        });
    }
    catch { /* */ }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/lineEndDot.ts
/**
 * Line chart end dot (icon shape) — refresh, sweep, and visibility logic.
 */



/* eslint-disable @typescript-eslint/no-explicit-any */
const LINE_END_ICON_TIME_INSET_PX = 40;
const OUTLINE_EDGE_TIME_INSET_PX = 0;
const LINE_END_ICON_PROBE_STEP_PX = 8;
const LINE_END_ICON_MAX_PROBES = 14;
function getLineEndDotTimeAndPriceFromSeries(chart) {
    const s = getState();
    let fallback = null;
    if (s.ohlcvData?.length) {
        const b = s.ohlcvData[s.ohlcvData.length - 1];
        const tr = Number(b.time);
        const cl = Number(b.close);
        if (isFinite(tr) && isFinite(cl)) {
            fallback = { timeSec: tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr), price: cl };
        }
    }
    if (!chart)
        return fallback;
    try {
        const series = chart.getSeries();
        if (!series)
            return fallback;
        if (typeof series.data === 'function') {
            const ds = series.data();
            if (ds && typeof ds.last === 'function') {
                const last = ds.last();
                if (last) {
                    const tvT = parseTimeFromTvDataLast(last);
                    const tvC = parseCloseFromTvDataLast(last);
                    if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
                        return { timeSec: tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT), price: tvC };
                    }
                }
            }
        }
        if (typeof series.bars === 'function') {
            const bars = series.bars();
            if (bars?.length) {
                const lb = bars[bars.length - 1];
                const tvT2 = parseTimeFromTvDataLast(lb);
                const tvC2 = parseCloseFromTvDataLast(lb);
                if (tvT2 !== null && isFinite(tvT2) && tvC2 !== null && isFinite(tvC2)) {
                    return { timeSec: tvT2 >= 1e12 ? Math.floor(tvT2 / 1000) : Math.floor(tvT2), price: tvC2 };
                }
            }
        }
    }
    catch {
        // swallow
    }
    return fallback;
}
function resolveLineEndOverlayPoint(chart) {
    return getLineEndDotTimeAndPriceFromSeries(chart);
}
function shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) {
    const s = getState();
    const d = s.ohlcvData;
    if (!d || d.length < 2)
        return true;
    if (!chart || !isFinite(lastBarTimeSec))
        return true;
    try {
        const br = chart.getVisibleBarsRange();
        if (!br || br.from === undefined || br.to === undefined)
            return true;
        const brFromSec = normalizeChartUnixSec(br.from);
        const brToSec = normalizeChartUnixSec(br.to);
        if (brFromSec === null || brToSec === null)
            return true;
        const barDur = getApproxBarDurationSec(d);
        const visibleSpan = Math.abs(brToSec - brFromSec);
        if (visibleSpan > barDur * Math.max(d.length, 1) * 96)
            return true;
        if (lastBarTimeSec > brToSec + barDur * 4)
            return true;
        if (lastBarTimeSec + barDur * 4 < brToSec)
            return true;
    }
    catch {
        return true;
    }
    return false;
}
function trailingVisibleBarMatchesSeriesLast(chart, lastBarTimeSec) {
    const s = getState();
    try {
        const br = chart.getVisibleBarsRange();
        if (!br || br.to === undefined)
            return false;
        const brToSec = normalizeChartUnixSec(br.to);
        if (brToSec === null)
            return false;
        const barDur = getApproxBarDurationSec(s.ohlcvData);
        return lastBarTimeSec <= brToSec + barDur && lastBarTimeSec >= brToSec - 2 * barDur;
    }
    catch {
        return false;
    }
}
function getLineEndIconTimeSec(chart, lastBarTimeSec) {
    if (!chart || !isFinite(lastBarTimeSec))
        return lastBarTimeSec;
    if (shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) ||
        !trailingVisibleBarMatchesSeriesLast(chart, lastBarTimeSec)) {
        return lastBarTimeSec;
    }
    try {
        const ts = chart.getTimeScale();
        if (!ts?.coordinateToTime || !ts?.width)
            return lastBarTimeSec;
        const w = ts.width();
        if (!(w > LINE_END_ICON_TIME_INSET_PX + 4))
            return lastBarTimeSec;
        const vr = chart.getVisibleRange?.();
        const capSec = vr?.to != null ? normalizeChartUnixSec(vr.to) : null;
        for (let k = 0; k < LINE_END_ICON_MAX_PROBES; k++) {
            const x = Math.max(0, Math.floor(w - LINE_END_ICON_TIME_INSET_PX - k * LINE_END_ICON_PROBE_STEP_PX));
            const rawT = ts.coordinateToTime(x);
            if (rawT == null)
                continue;
            const numT = Number(rawT);
            if (!isFinite(numT))
                continue;
            let tNorm = normalizeChartUnixSec(numT);
            if (tNorm === null || tNorm < lastBarTimeSec)
                continue;
            if (capSec !== null && tNorm > capSec)
                tNorm = capSec;
            return tNorm;
        }
    }
    catch {
        return lastBarTimeSec;
    }
    return lastBarTimeSec;
}
function removeLineEndDot() {
    const s = getState();
    if (!s.lineEndDotShapeId || !s.chartWidget)
        return;
    try {
        s.chartWidget.activeChart().removeEntity(s.lineEndDotShapeId);
    }
    catch {
        // swallow
    }
    s.lineEndDotShapeId = null;
}
function sweepOrphanLineChartIconShapes() {
    const s = getState();
    if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        const shapes = chart.getAllShapes();
        if (!shapes?.length)
            return;
        for (let i = 0; i < shapes.length; i++) {
            if (/icon/i.test(String(shapes[i].name || ''))) {
                try {
                    chart.removeEntity(shapes[i].id);
                }
                catch { /* */ }
            }
        }
    }
    catch {
        // swallow
    }
}
function ensureNoLineChartEndIcons() {
    const s = getState();
    if (s.currentChartType === 2)
        return;
    removeLineEndDot();
    s.lineEndDotShapeId = null;
    if (!s.chartWidget || !s.isChartReady)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        const shapes = chart.getAllShapes();
        if (!shapes?.length)
            return;
        for (let i = 0; i < shapes.length; i++) {
            if (/icon/i.test(String(shapes[i].name || ''))) {
                try {
                    chart.removeEntity(shapes[i].id);
                }
                catch { /* */ }
            }
        }
    }
    catch {
        // swallow
    }
}
function refreshLineEndDot() {
    const s = getState();
    s.__lineEndDotPlacementGen = (s.__lineEndDotPlacementGen || 0) + 1;
    const placementGen = s.__lineEndDotPlacementGen;
    removeLineEndDot();
    sweepOrphanLineChartIconShapes();
    if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady || !s.ohlcvData.length)
        return;
    if (!getLineChrome().useCustomLineEndMarker)
        return;
    const color = s.CONFIG.theme.successColor;
    function placeLineEndIcon() {
        if (placementGen !== s.__lineEndDotPlacementGen)
            return;
        if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady)
            return;
        const chart = s.chartWidget.activeChart();
        const pt = resolveLineEndOverlayPoint(chart);
        if (!pt || !isFinite(pt.timeSec) || !isFinite(pt.price))
            return;
        if (placementGen !== s.__lineEndDotPlacementGen)
            return;
        const iconTimeSec = getLineEndIconTimeSec(chart, pt.timeSec);
        chart
            .createShape({ time: iconTimeSec, price: pt.price }, {
            shape: 'icon',
            icon: 0xf111,
            lock: true,
            overrides: { color, size: 16 },
            disableSelection: true,
            disableSave: true,
            disableUndo: true,
            showInObjectsTree: false,
            zOrder: 'top',
        })
            .then((id) => {
            if (placementGen !== s.__lineEndDotPlacementGen || s.currentChartType !== 2) {
                if (id)
                    try {
                        chart.removeEntity(id);
                    }
                    catch { /* */ }
                return;
            }
            if (id)
                s.lineEndDotShapeId = id;
        })
            .catch(() => { });
    }
    try {
        const chartForReady = s.chartWidget.activeChart();
        if (chartForReady && typeof chartForReady.dataReady === 'function') {
            chartForReady.dataReady(placeLineEndIcon);
        }
        else {
            try {
                requestAnimationFrame(placeLineEndIcon);
            }
            catch {
                setTimeout(placeLineEndIcon, 0);
            }
        }
    }
    catch {
        placeLineEndIcon();
    }
}
let lineEndDotVisibleRangeDebounce = null;
function clearLineEndDotVisibleRangeDebounce() {
    if (lineEndDotVisibleRangeDebounce) {
        clearTimeout(lineEndDotVisibleRangeDebounce);
        lineEndDotVisibleRangeDebounce = null;
    }
}
function scheduleLineEndDotAfterVisibleRangeChange() {
    const s = getState();
    if (s.currentChartType !== 2)
        return;
    if (!getLineChrome().useCustomLineEndMarker)
        return;
    if (lineEndDotVisibleRangeDebounce)
        clearTimeout(lineEndDotVisibleRangeDebounce);
    const epochAtSchedule = s.lineChartOhlcvEpoch;
    lineEndDotVisibleRangeDebounce = setTimeout(() => {
        lineEndDotVisibleRangeDebounce = null;
        if (s.lineChartOhlcvEpoch !== epochAtSchedule)
            return;
        if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady)
            return;
        try {
            const chart = s.chartWidget.activeChart();
            if (chart && typeof chart.dataReady === 'function') {
                chart.dataReady(() => {
                    if (s.lineChartOhlcvEpoch !== epochAtSchedule)
                        return;
                    refreshLineEndDot();
                });
            }
            else {
                refreshLineEndDot();
            }
        }
        catch {
            // swallow
        }
    }, 150);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/lastPrice.ts
/**
 * Last-price horizontal line overlays (candle + line chart modes).
 */





/* eslint-disable @typescript-eslint/no-explicit-any */
function sweepNonPositionHorizontalLines() {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady)
        return;
    try {
        const chart = s.chartWidget.activeChart();
        const shapes = chart.getAllShapes();
        if (!shapes?.length)
            return;
        const positionIds = s.positionShapeIds || [];
        for (let i = 0; i < shapes.length; i++) {
            const id = shapes[i].id;
            const name = String(shapes[i].name || '');
            if (!/horizontal|horz/i.test(name))
                continue;
            if (positionIds.indexOf(id) !== -1)
                continue;
            try {
                chart.removeEntity(id);
            }
            catch { /* */ }
        }
    }
    catch {
        // swallow
    }
}
function removeAllLastPriceHorizontalOverlays(options) {
    sweepNonPositionHorizontalLines();
    const s = getState();
    s.lastPriceShapeId = null;
    s.lineLastPriceShapeId = null;
    const hideDom = !(options?.hideLastCloseDom === false);
    if (hideDom)
        hideLastClosePriceLabelDom();
}
function createLastPriceLine() {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady || !s.ohlcvData.length)
        return;
    if (s.currentChartType !== 1) {
        removeAllLastPriceHorizontalOverlays();
        return;
    }
    if (!getLineChrome().useCustomDashedLastPriceLine) {
        removeAllLastPriceHorizontalOverlays({ hideLastCloseDom: !getLineChrome().useCustomPriceLabels });
        scheduleLastCloseLabelUpdate();
        return;
    }
    removeAllLastPriceHorizontalOverlays();
    const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
    const chart = s.chartWidget.activeChart();
    const color = s.CONFIG.theme.successColor;
    const candlePt = getLineEndDotTimeAndPriceFromSeries(chart);
    const candlePrice = candlePt && isFinite(candlePt.price) ? candlePt.price : lastBar.close;
    chart
        .createShape({ price: candlePrice }, {
        shape: 'horizontal_line', lock: true,
        overrides: { linecolor: color, linestyle: 2, linewidth: 1, showLabel: false, showPrice: false, fontsize: 11, horzLabelsAlign: 'right' },
        disableSelection: true, disableSave: true, disableUndo: true, showInObjectsTree: false, zOrder: 'bottom',
    })
        .then((id) => {
        if (s.currentChartType !== 1) {
            if (id)
                try {
                    chart.removeEntity(id);
                }
                catch { /* */ }
            return;
        }
        s.lastPriceShapeId = id;
        scheduleLastCloseLabelUpdate();
    })
        .catch(() => { });
}
function createLineLastPriceLine() {
    const s = getState();
    if (!s.chartWidget || !s.isChartReady || !s.ohlcvData.length)
        return;
    const shouldDraw = s.currentChartType === 2 && getLineChrome().useCustomDashedLastPriceLine;
    s.__lineLastPriceLinePlacementGen = (s.__lineLastPriceLinePlacementGen || 0) + 1;
    const placementGen = s.__lineLastPriceLinePlacementGen;
    removeAllLastPriceHorizontalOverlays();
    if (!shouldDraw)
        return;
    const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
    const chart = s.chartWidget.activeChart();
    const color = s.CONFIG.theme.successColor;
    const seriesPt = resolveLineEndOverlayPoint(chart);
    const linePrice = seriesPt && isFinite(seriesPt.price) ? seriesPt.price : lastBar.close;
    chart
        .createShape({ price: linePrice }, {
        shape: 'horizontal_line', lock: true,
        overrides: { linecolor: color, linestyle: 2, linewidth: 1, showLabel: false, showPrice: false, fontsize: 11, horzLabelsAlign: 'right' },
        disableSelection: true, disableSave: true, disableUndo: true, showInObjectsTree: false, zOrder: 'bottom',
    })
        .then((id) => {
        if (placementGen !== s.__lineLastPriceLinePlacementGen) {
            if (id)
                try {
                    chart.removeEntity(id);
                }
                catch { /* */ }
            return;
        }
        if (s.currentChartType !== 2 || !getLineChrome().useCustomDashedLastPriceLine) {
            if (id)
                try {
                    chart.removeEntity(id);
                }
                catch { /* */ }
            return;
        }
        s.lineLastPriceShapeId = id;
        scheduleLastCloseLabelUpdate();
    })
        .catch(() => { });
}
function refreshLineChartOverlays() {
    refreshLineEndDot();
    const s = getState();
    if (s.currentChartType === 2 && getLineChrome().useCustomDashedLastPriceLine) {
        createLineLastPriceLine();
    }
    else {
        removeAllLastPriceHorizontalOverlays({ hideLastCloseDom: !getLineChrome().useCustomPriceLabels });
        scheduleLastCloseLabelUpdate();
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/chartType.ts
/**
 * Chart type switching (candle ↔ line).
 */







/* eslint-disable @typescript-eslint/no-explicit-any */
function handleSetChartType(payload) {
    suppressChartUserInteraction(500);
    const s = getState();
    if (!s.chartWidget)
        return;
    const type = payload.type;
    s.currentChartType = type;
    if (!s.isChartReady)
        return;
    if (type === 2) {
        removeAllLastPriceHorizontalOverlays({
            hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
        });
    }
    else {
        ensureNoLineChartEndIcons();
    }
    try {
        const ac = s.chartWidget.activeChart();
        ac.setChartType(type);
        const color = s.CONFIG.theme.successColor;
        const series = ac.getSeries();
        if (type === 2) {
            series.setChartStyleProperties(2, {
                color,
                colorType: 'solid',
                linewidth: 2,
            });
        }
        else if (type === 10) {
            series.setChartStyleProperties(10, {
                topLineColor: color,
                bottomLineColor: color,
                topLineWidth: 2,
                bottomLineWidth: 2,
            });
        }
        applyChartScaleLayout(type, {
            hideCustomCrosshairLabels: hideCustomCrosshairLabels,
            scheduleLastCloseLabelUpdate: scheduleLastCloseLabelUpdate,
        });
        const capturedType = type;
        setTimeout(() => {
            if (s.currentChartType !== capturedType)
                return;
            if (capturedType === 2) {
                refreshLineChartOverlays();
            }
            else if (capturedType === 1) {
                createLastPriceLine();
            }
        }, 100);
    }
    catch (error) {
        sendToReactNative('ERROR', { message: error.message });
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/ohlcvData.ts
/**
 * SET_OHLCV_DATA and REALTIME_UPDATE handlers.
 */








/* eslint-disable @typescript-eslint/no-explicit-any */
function handleSetOHLCVData(payload, initChart) {
    if (!payload?.data?.length)
        return;
    const s = getState();
    suppressChartUserInteraction(700);
    s.ohlcvData = payload.data;
    bumpLineChartOhlcvEpoch();
    s.ohlcvGeneration++;
    if (payload.pagination) {
        s.ohlcvPagination = {
            nextCursor: payload.pagination.nextCursor || null,
            hasMore: !!payload.pagination.hasMore,
            assetId: payload.pagination.assetId || null,
            vsCurrency: payload.pagination.vsCurrency || null,
        };
    }
    else {
        s.ohlcvPagination = { nextCursor: null, hasMore: false, assetId: null, vsCurrency: null };
    }
    s.visibleFromMs = payload.visibleFromMs ?? null;
    s.visibleToMs = payload.visibleToMs ?? null;
    const newResolution = detectResolution(s.ohlcvData);
    function scheduleVisibleRangeAfterDataLoad(chart) {
        if (s.visibleFromMs == null)
            return;
        const capturedGen = s.ohlcvGeneration;
        const sub = chart.onDataLoaded();
        sub.subscribe(null, function onLoaded() {
            sub.unsubscribe(null, onLoaded);
            if (capturedGen !== s.ohlcvGeneration)
                return;
            const fromSec = Math.floor(s.visibleFromMs / 1000);
            const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
            const toSec = lastBar ? Math.ceil(lastBar.time / 1000) : Math.ceil(Date.now() / 1000);
            const barPadSec = getApproxBarDurationSec(s.ohlcvData) * 2;
            try {
                chart.setVisibleRange({ from: fromSec, to: toSec + barPadSec }, { percentRightMargin: 0 });
            }
            catch {
                // swallow
            }
        });
    }
    if (s.chartWidget && s.isChartReady) {
        const previousResolution = s.currentResolution;
        s.currentResolution = newResolution;
        try {
            const chart = s.chartWidget.activeChart();
            if (previousResolution !== newResolution) {
                chart.setResolution(newResolution, () => {
                    try {
                        chart.resetData();
                        beginDeferredLayoutSettleAfterOhlcvReload();
                        scheduleVisibleRangeAfterDataLoad(chart);
                    }
                    catch {
                        abortDeferredLayoutSettleAndNotify();
                    }
                });
            }
            else {
                try {
                    chart.resetData();
                    beginDeferredLayoutSettleAfterOhlcvReload();
                    scheduleVisibleRangeAfterDataLoad(chart);
                }
                catch {
                    abortDeferredLayoutSettleAndNotify();
                }
            }
        }
        catch {
            abortDeferredLayoutSettleAndNotify();
            s.chartWidget.remove();
            s.chartWidget = null;
            s.isChartReady = false;
            s.activeStudies = new Map();
            s.volumeStudyId = null;
            s.volumeIsOverlay = null;
            s.lastPriceShapeId = null;
            s.lineEndDotShapeId = null;
            s.lineLastPriceShapeId = null;
            s.positionShapeIds = [];
            s.realtimeCallbacks = {};
            s.currentChartType = 2;
            initChart();
        }
    }
    else if (s.chartWidget && !s.isChartReady) {
        s.currentResolution = newResolution;
    }
    else if (!s.chartWidget) {
        s.currentResolution = newResolution;
        initChart();
    }
}
function handleRealtimeUpdate(payload) {
    if (!payload?.bar)
        return;
    const s = getState();
    const bar = payload.bar;
    if (s.ohlcvData.length > 0) {
        const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
        if (lastBar.time === bar.time) {
            s.ohlcvData[s.ohlcvData.length - 1] = bar;
        }
        else {
            s.ohlcvData.push(bar);
        }
    }
    else {
        s.ohlcvData.push(bar);
    }
    bumpLineChartOhlcvEpoch();
    const tick = {
        time: bar.time, open: bar.open, high: bar.high,
        low: bar.low, close: bar.close, volume: bar.volume,
    };
    const guids = Object.keys(s.realtimeCallbacks);
    for (let i = 0; i < guids.length; i++) {
        s.realtimeCallbacks[guids[i]](tick);
    }
    if (s.currentChartType === 2) {
        refreshLineChartOverlays();
    }
    else if (s.currentChartType === 1) {
        ensureNoLineChartEndIcons();
        if (getLineChrome().useCustomDashedLastPriceLine) {
            createLastPriceLine();
        }
        else {
            removeAllLastPriceHorizontalOverlays({ hideLastCloseDom: !getLineChrome().useCustomPriceLabels });
            scheduleLastCloseLabelUpdate();
        }
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/handleSetLineChrome.ts
/**
 * SET_LINE_CHROME message handler — separated to avoid circular deps
 * between lineChrome.ts and overlay/layout modules.
 */






/* eslint-disable @typescript-eslint/no-explicit-any */
function handleSetLineChrome(payload) {
    const resolved = resolveLineChromeFromPayload(payload);
    if (!resolved)
        return;
    const s = getState();
    s.CONFIG = s.CONFIG || {};
    s.CONFIG.lineChrome = resolved;
    if (!resolved.useCustomLineEndMarker) {
        clearLineEndDotVisibleRangeDebounce();
    }
    if (!resolved.useCustomPriceLabels) {
        s.lastCloseLabelScheduled = false;
    }
    if (!s.isChartReady || !s.chartWidget)
        return;
    applyChartScaleLayout(s.currentChartType, {
        hideCustomCrosshairLabels: hideCustomCrosshairLabels,
        scheduleLastCloseLabelUpdate: scheduleLastCloseLabelUpdate,
    });
    if (s.currentChartType === 2) {
        refreshLineChartOverlays();
    }
    else if (s.currentChartType === 1) {
        if (getLineChrome().useCustomDashedLastPriceLine) {
            createLastPriceLine();
        }
        else {
            removeAllLastPriceHorizontalOverlays({
                hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
            });
            scheduleLastCloseLabelUpdate();
        }
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/messageHandler.ts
/**
 * Inbound message dispatcher — routes RN postMessage events to handlers.
 */








/* eslint-disable @typescript-eslint/no-explicit-any */
let _initChart = () => { };
/** Must be called once at bootstrap so handleSetOHLCVData can trigger chart init. */
function setInitChartRef(fn) {
    _initChart = fn;
}
function handleMessage(event) {
    try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const s = getState();
        if (!s.isChartReady && message.type !== 'SET_OHLCV_DATA') {
            s.pendingMessages.push(message);
            return;
        }
        switch (message.type) {
            case 'SET_OHLCV_DATA':
                handleSetOHLCVData(message.payload, _initChart);
                break;
            case 'ADD_INDICATOR':
                handleAddIndicator(message.payload);
                break;
            case 'REMOVE_INDICATOR':
                handleRemoveIndicator(message.payload);
                break;
            case 'SET_CHART_TYPE':
                handleSetChartType(message.payload);
                break;
            case 'SET_LINE_CHROME':
                handleSetLineChrome(message.payload);
                break;
            case 'SET_POSITION_LINES':
                handleSetPositionLines(message.payload);
                break;
            case 'REALTIME_UPDATE':
                handleRealtimeUpdate(message.payload);
                break;
            case 'TOGGLE_VOLUME':
                handleToggleVolume(message.payload);
                break;
        }
    }
    catch (error) {
        sendToReactNative('ERROR', { message: error.message });
    }
}
function registerMessageListeners() {
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/initChart.ts
/**
 * TradingView widget initialization and onChartReady orchestrator.
 */














/** TV only supports a fixed set of IANA timezone IDs. */
const TV_SUPPORTED_TIMEZONES = [
    'Etc/UTC', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Tunis',
    'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Caracas', 'America/Chicago',
    'America/El_Salvador', 'America/Halifax', 'America/Juneau', 'America/Lima', 'America/Los_Angeles', 'America/Mexico_City',
    'America/New_York', 'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo', 'America/Toronto', 'America/Vancouver',
    'Asia/Astana', 'Asia/Ashkhabad', 'Asia/Bahrain', 'Asia/Bangkok', 'Asia/Chongqing', 'Asia/Colombo', 'Asia/Dhaka', 'Asia/Dubai',
    'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Jerusalem', 'Asia/Karachi', 'Asia/Kabul', 'Asia/Kathmandu',
    'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Kuwait', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia', 'Asia/Qatar', 'Asia/Riyadh',
    'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo', 'Asia/Yangon',
    'Atlantic/Azores', 'Atlantic/Reykjavik', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Sydney',
    'Europe/Amsterdam', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Berlin', 'Europe/Bratislava', 'Europe/Brussels',
    'Europe/Bucharest', 'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul',
    'Europe/Lisbon', 'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta', 'Europe/Moscow', 'Europe/Oslo',
    'Europe/Paris', 'Europe/Prague', 'Europe/Riga', 'Europe/Rome', 'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Vienna',
    'Europe/Vilnius', 'Europe/Warsaw', 'Europe/Zurich', 'Pacific/Auckland', 'Pacific/Chatham', 'Pacific/Fakaofo',
    'Pacific/Honolulu', 'Pacific/Norfolk', 'US/Mountain',
];
const CANONICAL_TO_TV = {
    'America/Denver': 'US/Mountain',
    'Asia/Ashgabat': 'Asia/Ashkhabad',
    'Asia/Almaty': 'Asia/Astana',
};
function resolveUserTimezone() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
        const mapped = CANONICAL_TO_TV[tz] || tz;
        return TV_SUPPORTED_TIMEZONES.indexOf(mapped) !== -1 ? mapped : 'Etc/UTC';
    }
    catch {
        return 'Etc/UTC';
    }
}
/**
 * Builds the TradingView custom datafeed that reads from the shared state.
 */
function buildCustomDatafeed() {
    const s = getState();
    return {
        onReady(callback) {
            setTimeout(() => {
                callback({
                    supported_resolutions: [...SUPPORTED_RESOLUTIONS],
                    supports_marks: false,
                    supports_timescale_marks: false,
                    supports_time: true,
                });
            }, 0);
        },
        searchSymbols(_u, _e, _t, onResult) { onResult([]); },
        resolveSymbol(symbolName, onResolve) {
            setTimeout(() => {
                onResolve({
                    name: symbolName, ticker: symbolName, description: symbolName,
                    type: 'crypto', session: '24x7', timezone: 'Etc/UTC', exchange: '',
                    minmov: 1, pricescale: 100, variable_tick_size: VARIABLE_TICK_SIZE,
                    has_intraday: true, has_daily: true, has_weekly_and_monthly: true,
                    supported_resolutions: [...SUPPORTED_RESOLUTIONS],
                    volume_precision: 0, data_status: 'endofday',
                });
            }, 0);
        },
        getBars(_si, _res, periodParams, onResult, onError) {
            try {
                const fromMs = periodParams.from * 1000;
                const toMs = periodParams.to * 1000;
                const countBack = periodParams.countBack;
                const firstRequest = periodParams.firstDataRequest;
                function deliverBars(bars, meta) {
                    onResult(bars, meta);
                    if (s.__mmLayoutSettlePending && periodParams.firstDataRequest) {
                        queueTryCompleteLayoutSettleAfterData();
                    }
                }
                const bars = filterBarsForRange(s.ohlcvData, fromMs, toMs, countBack);
                if (bars.length > 0) {
                    deliverBars(bars, { noData: false });
                    return;
                }
                if (firstRequest || s.ohlcvData.length === 0) {
                    deliverBars([], { noData: true });
                    return;
                }
                const oldestTs = s.ohlcvData[0].time;
                fetchOlderBars({ onResult, oldestAtDefer: oldestTs }, {
                    getOhlcvPagination: () => s.ohlcvPagination,
                    getOhlcvGeneration: () => s.ohlcvGeneration,
                    getOhlcvData: () => s.ohlcvData,
                    setOhlcvData: (d) => { s.ohlcvData = d; },
                    updatePagination: (cursor, hasNext) => {
                        s.ohlcvPagination.nextCursor = cursor;
                        s.ohlcvPagination.hasMore = hasNext;
                    },
                    onLayoutSettlePending: () => {
                        if (s.__mmLayoutSettlePending)
                            queueTryCompleteLayoutSettleAfterData();
                    },
                    sendDebug: (msg) => sendToReactNative('DEBUG', { message: msg }),
                });
            }
            catch (error) {
                abortDeferredLayoutSettleAndNotify();
                onError(error?.message ? error.message : String(error));
            }
        },
        subscribeBars(_si, _res, onTick, listenerGuid) {
            s.realtimeCallbacks[listenerGuid] = onTick;
        },
        unsubscribeBars(listenerGuid) {
            delete s.realtimeCallbacks[listenerGuid];
        },
    };
}
let initChart_libraryLoadAttempts = 0;
const initChart_maxLibraryLoadAttempts = 50;
function initChart() {
    const s = getState();
    if (s.chartWidget)
        return;
    if (typeof TradingView === 'undefined') {
        initChart_libraryLoadAttempts++;
        if (initChart_libraryLoadAttempts >= initChart_maxLibraryLoadAttempts) {
            const errorMsg = 'TradingView library failed to initialize after ' + initChart_maxLibraryLoadAttempts * 100 + 'ms';
            const overlay = document.getElementById('loading-overlay');
            if (overlay)
                overlay.textContent = errorMsg;
            sendToReactNative('ERROR', { message: errorMsg });
            return;
        }
        setTimeout(initChart, 100);
        return;
    }
    if (s.ohlcvData.length === 0)
        return;
    try {
        const theme = s.CONFIG.theme;
        const features = s.CONFIG.features || {};
        const lcInit = getLineChrome();
        const initCustomLabels = lcInit.useCustomPriceLabels;
        const initCustomDashed = lcInit.useCustomDashedLastPriceLine;
        const disabledFeatures = (features.disabledFeatures || []).slice();
        if (!features.enableDrawingTools) {
            disabledFeatures.push('left_toolbar', 'context_menus');
        }
        const visibleToSec = Math.ceil((s.visibleToMs ?? Date.now()) / 1000);
        const initBarPadSec = getApproxBarDurationSec(s.ohlcvData) * 2;
        const tfOption = s.visibleFromMs != null
            ? { type: 'time-range', from: Math.floor(s.visibleFromMs / 1000), to: visibleToSec + initBarPadSec }
            : undefined;
        const userTimezone = resolveUserTimezone();
        s.chartWidget = new TradingView.widget({
            symbol: s.currentSymbol,
            interval: s.currentResolution || '5',
            timeframe: tfOption,
            container: 'tv_chart_container',
            datafeed: buildCustomDatafeed(),
            library_path: s.CONFIG.libraryUrl,
            locale: 'en',
            timezone: userTimezone,
            fullscreen: false,
            autosize: true,
            theme: 'Dark',
            disabled_features: disabledFeatures.concat('use_localstorage_for_settings'),
            enabled_features: ['study_templates', 'iframe_loading_same_origin'],
            custom_themes: {
                dark: {
                    color1: generatePaletteShades(theme.successColor),
                    color3: generatePaletteShades(theme.errorColor),
                },
            },
            overrides: Object.assign({
                'paneProperties.background': theme.backgroundColor,
                'paneProperties.backgroundType': 'solid',
                'paneProperties.vertGridProperties.color': 'transparent',
                'paneProperties.horzGridProperties.color': 'transparent',
                'scalesProperties.textColor': theme.textColor,
                'scalesProperties.lineColor': theme.backgroundColor || '#131416',
                'timeScale.borderColor': theme.backgroundColor || '#131416',
                'scalesProperties.fontSize': 12,
                'scalesProperties.showStudyLastValue': false,
                'scalesProperties.showSeriesLastValue': !initCustomLabels,
                'scalesProperties.showSymbolLabels': false,
                'scalesProperties.showRightScale': true,
                'scalesProperties.showLeftScale': false,
                'scalesProperties.showPriceScaleCrosshairLabel': !initCustomLabels,
                'scalesProperties.showTimeScaleCrosshairLabel': !initCustomLabels,
                'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
                'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',
                'mainSeriesProperties.showPriceLine': !initCustomDashed,
                'mainSeriesProperties.candleStyle.upColor': theme.successColor,
                'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
                'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
                'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
                'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
                'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
            }, getSeriesColorOverrides(theme.successColor)),
            loading_screen: {
                backgroundColor: theme.backgroundColor,
                foregroundColor: theme.successColor,
            },
        });
        s.chartWidget.onChartReady(() => {
            suppressChartUserInteraction(1500);
            s.isChartReady = true;
            s.__mmLayoutSettlePending = false;
            clearMmLayoutSettleFallbackTimer();
            document.getElementById('loading-overlay')?.classList.add('hidden');
            s.pendingMessages.forEach((msg) => { handleMessage({ data: msg }); });
            s.pendingMessages = [];
            applySeriesColors();
            applyChartScaleLayout(s.currentChartType, { hideCustomCrosshairLabels: hideCustomCrosshairLabels, scheduleLastCloseLabelUpdate: scheduleLastCloseLabelUpdate });
            scheduleHidePriceScaleModeButtons();
            if (s.currentChartType === 2) {
                refreshLineChartOverlays();
            }
            else {
                ensureNoLineChartEndIcons();
                createLastPriceLine();
            }
            try {
                s.chartWidget.activeChart().selection().onChanged().subscribe(null, () => {
                    s.chartWidget.activeChart().selection().clear();
                });
            }
            catch { /* */ }
            let chartTimeScaleLayoutDebounce = null;
            try {
                s.chartWidget.activeChart().getTimeScale().barSpacingChanged().subscribe(null, () => {
                    if (chartTimeScaleLayoutDebounce)
                        clearTimeout(chartTimeScaleLayoutDebounce);
                    chartTimeScaleLayoutDebounce = setTimeout(() => {
                        chartTimeScaleLayoutDebounce = null;
                        if (!s.chartWidget)
                            return;
                        try {
                            applyChartContainerOverflowUnclip();
                            scheduleLastCloseLabelUpdate();
                            if (s.currentChartType === 2) {
                                try {
                                    requestAnimationFrame(() => refreshLineChartOverlays());
                                }
                                catch { /* */ }
                            }
                        }
                        catch { /* */ }
                    }, 80);
                });
            }
            catch { /* */ }
            subscribeLastCloseLabelUpdates();
            sendToReactNative('CHART_READY', {});
            installTradingViewExternalOpenBridge();
            // Chart interaction analytics
            let zoomDebounce = null;
            let panDebounce = null;
            let zoomLastFired = 0;
            function scheduleChartInteractZoom() {
                if (Date.now() < s.__mmSuppressChartInteractUntil)
                    return;
                if (zoomDebounce)
                    clearTimeout(zoomDebounce);
                zoomDebounce = setTimeout(() => {
                    zoomDebounce = null;
                    if (Date.now() < s.__mmSuppressChartInteractUntil || !s.chartWidget || !s.isChartReady)
                        return;
                    sendToReactNative('CHART_INTERACTED', { interaction_type: 'zoom' });
                    zoomLastFired = Date.now();
                }, 450);
            }
            function scheduleChartInteractPan() {
                if (Date.now() < s.__mmSuppressChartInteractUntil)
                    return;
                if (Date.now() - zoomLastFired < 500)
                    return;
                if (panDebounce)
                    clearTimeout(panDebounce);
                panDebounce = setTimeout(() => {
                    panDebounce = null;
                    if (Date.now() < s.__mmSuppressChartInteractUntil || Date.now() - zoomLastFired < 500)
                        return;
                    if (!s.chartWidget || !s.isChartReady)
                        return;
                    sendToReactNative('CHART_INTERACTED', { interaction_type: 'pan' });
                }, 450);
            }
            try {
                s.chartWidget.activeChart().getTimeScale().barSpacingChanged().subscribe(null, scheduleChartInteractZoom);
            }
            catch { /* */ }
            try {
                s.chartWidget.activeChart().onVisibleRangeChanged().subscribe(null, () => {
                    scheduleChartInteractPan();
                    if (getLineChrome().useCustomLineEndMarker)
                        scheduleLineEndDotAfterVisibleRangeChange();
                });
            }
            catch { /* */ }
            // Crosshair
            try {
                s.ohlcvBarVisible = false;
                s.ohlcvBarShownAt = 0;
                s.ohlcvDismissUntil = 0;
                s.__mmTooltipChartInteractSent = false;
                s.chartWidget.activeChart().crossHairMoved().subscribe(null, (params) => {
                    if (!params || params.price === undefined || params.time === undefined) {
                        hideCustomCrosshairLabels();
                        return;
                    }
                    if (Date.now() < s.ohlcvDismissUntil) {
                        hideCustomCrosshairLabels();
                        return;
                    }
                    updateCustomCrosshairLabels(params);
                    if (!s.ohlcvBarVisible)
                        s.ohlcvBarShownAt = Date.now();
                    s.ohlcvBarVisible = true;
                    const targetTime = params.time * 1000;
                    let closestBar = null;
                    let minDiff = Infinity;
                    for (let i = 0; i < s.ohlcvData.length; i++) {
                        const diff = Math.abs(s.ohlcvData[i].time - targetTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestBar = s.ohlcvData[i];
                        }
                    }
                    if (closestBar) {
                        if (!s.__mmTooltipChartInteractSent) {
                            sendToReactNative('CHART_INTERACTED', { interaction_type: 'tooltip' });
                            s.__mmTooltipChartInteractSent = true;
                        }
                        sendToReactNative('CROSSHAIR_MOVE', {
                            data: { time: closestBar.time, open: closestBar.open, high: closestBar.high, low: closestBar.low, close: closestBar.close, volume: closestBar.volume },
                        });
                    }
                });
                let mouseDownTime = 0;
                s.chartWidget.subscribe('mouse_down', () => { mouseDownTime = Date.now(); s.ohlcvDismissUntil = 0; });
                s.chartWidget.subscribe('mouse_up', () => {
                    if (!s.ohlcvBarVisible)
                        return;
                    const pressDuration = Date.now() - mouseDownTime;
                    if (pressDuration < 400) {
                        if (Date.now() - s.ohlcvBarShownAt < 500)
                            return;
                        s.ohlcvBarVisible = false;
                        s.ohlcvBarShownAt = 0;
                        s.ohlcvDismissUntil = Date.now() + 800;
                        hideCustomCrosshairLabels();
                        setTimeout(() => {
                            s.__mmTooltipChartInteractSent = false;
                            sendToReactNative('CROSSHAIR_MOVE', { data: null });
                        }, 50);
                    }
                });
            }
            catch { /* */ }
        });
    }
    catch (error) {
        sendToReactNative('ERROR', { message: 'Failed to initialize chart: ' + (error?.message || String(error)) });
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/bootstrap.ts
/**
 * Bootstrap — self-executing entry point that wires up the chart.
 *
 * Must be the last import in index.ts so all other modules are defined
 * before this module's top-level side effects run.
 */




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
s.ohlcvPagination = s.ohlcvPagination || { nextCursor: null, hasMore: false, assetId: null, vsCurrency: null };
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
}
else {
    loadLibrary(initChart);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/index.ts
/**
 * Barrel entry point for the AdvancedChart WebView bundle.
 *
 * Webpack bundles this file as an IIFE; the build script then writes the
 * result into chartLogicString.ts as an inlineable string constant.
 */

























var __webpack_export_target__ = self;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;`;
