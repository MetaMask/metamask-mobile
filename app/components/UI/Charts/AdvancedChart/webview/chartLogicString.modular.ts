// AUTO-GENERATED — do not edit manually.
// Re-generate with: yarn build:advanced-chart-webview
//
// Source: app/components/UI/Charts/AdvancedChart/webview/src/

/* eslint-disable */
// prettier-ignore
const chartLogicString = `/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
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

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/bridge.ts
// Typed bridge between the WebView IIFE and React Native.
//
// Wraps the same window.ReactNativeWebView.postMessage(...) call shape that
// legacy chartLogic.js's sendToReactNative() uses, so the RN-side
// parseWebViewMessage in AdvancedChart.types.ts decodes our messages without
// any change to its consumers.
/**
 * Posts a typed message to React Native via window.ReactNativeWebView.
 * Equivalent to legacy \`sendToReactNative(type, payload)\` at chartLogic.js
 * line ~98. Silently no-ops when window.ReactNativeWebView is absent (e.g.
 * during unit tests in a jsdom environment without the RN bridge stub).
 */
function postToRN(type, payload) {
    const bridge = window.ReactNativeWebView;
    if (!bridge) {
        return;
    }
    try {
        bridge.postMessage(JSON.stringify({ type, payload }));
    }
    catch {
        // postMessage / JSON.stringify failure: nothing to do — the WebView
        // cannot inform RN of its own bridge failure.
    }
}
/**
 * Reports a runtime error to React Native via the ERROR channel. Matches the
 * legacy \`sendToReactNative('ERROR', { message })\` pattern used throughout
 * chartLogic.js.
 */
function reportErrorToRN(error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    postToRN('ERROR', { message });
}
/**
 * Registers a single inbound listener. React Native posts JSON strings via
 * webView.postMessage; the WebView receives them on window 'message' on iOS
 * and document 'message' on Android (see chartLogic.js line ~400). We
 * subscribe to both so consumers don't have to.
 *
 * The returned function unsubscribes — useful for tests; the real bundle
 * subscribes once at bootstrap and never unsubscribes.
 */
function onFromRN(handler) {
    const dispatch = (event) => {
        let parsed;
        try {
            parsed =
                typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        }
        catch (parseError) {
            reportErrorToRN(parseError);
            return;
        }
        if (!parsed || typeof parsed !== 'object') {
            return;
        }
        const candidate = parsed;
        if (typeof candidate.type !== 'string') {
            return;
        }
        // Trusting the type narrowing here is fine because messages/handler.ts
        // re-validates via a switch on candidate.type before dispatching to a
        // typed handler. Phase 1 only routes SET_THEME_COLORS, but the listener
        // forwards every well-formed message so the handler can decide.
        handler(parsed);
    };
    // iOS posts arrive on window; Android posts arrive on document. Subscribe
    // to both to match legacy chartLogic.js handleMessage wiring.
    window.addEventListener('message', dispatch);
    document.addEventListener('message', dispatch);
    return () => {
        window.removeEventListener('message', dispatch);
        document.removeEventListener('message', dispatch);
    };
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/state.ts
// Module-local state container for the AdvancedChart WebView.
//
// Replaces the legacy \`window.chartWidget\`, \`window.isChartReady\`,
// \`window.currentSymbol\`, etc. (chartLogic.js lines ~21-60). Module-scoped
// variables — not window.* globals — so behaviour is testable and ownership
// is explicit. Future phases extend this with the OHLCV slice, the indicator
// slice, and so on; the convention is "core state goes here, feature-local
// state goes in features/<feature>/state.ts or overlays/<feature>/state.ts".
const emptyPagination = () => ({
    nextCursor: null,
    hasMore: false,
    assetId: null,
    vsCurrency: null,
});
const state = {
    widget: null,
    isChartReady: false,
    currentSymbol: 'ASSET',
    currentResolution: '5',
    currentChartType: 2,
    theme: null,
    libraryLoaded: false,
    libraryError: null,
    ohlcvData: [],
    ohlcvGeneration: 0,
    ohlcvPagination: emptyPagination(),
    visibleFromMs: null,
    visibleToMs: null,
    realtimeCallbacks: {},
};
// ----- Widget lifecycle ---------------------------------------------------
function getWidget() {
    return state.widget;
}
function setWidget(widget) {
    state.widget = widget;
}
function isChartReady() {
    return state.isChartReady;
}
function setChartReady(ready) {
    state.isChartReady = ready;
}
// ----- Symbol + resolution ------------------------------------------------
function getCurrentSymbol() {
    return state.currentSymbol;
}
function setCurrentSymbol(symbol) {
    state.currentSymbol = symbol;
}
function getCurrentResolution() {
    return state.currentResolution;
}
function setCurrentResolution(resolution) {
    state.currentResolution = resolution;
}
// ----- Theme --------------------------------------------------------------
function getTheme() {
    return state.theme;
}
function setTheme(theme) {
    state.theme = theme;
}
// ----- Library load -------------------------------------------------------
function isLibraryLoaded() {
    return state.libraryLoaded;
}
function setLibraryLoaded(loaded) {
    state.libraryLoaded = loaded;
}
function getLibraryError() {
    return state.libraryError;
}
function setLibraryError(error) {
    state.libraryError = error;
}
// ----- Chart type --------------------------------------------------------
function getCurrentChartType() {
    return state.currentChartType;
}
function setCurrentChartType(type) {
    state.currentChartType = type;
}
// ----- OHLCV data --------------------------------------------------------
function getOhlcvData() {
    return state.ohlcvData;
}
function setOhlcvData(data) {
    state.ohlcvData = data;
}
function appendOrReplaceLastBar(bar) {
    const data = state.ohlcvData;
    if (data.length > 0 && data[data.length - 1].time === bar.time) {
        data[data.length - 1] = bar;
    }
    else {
        data.push(bar);
    }
}
function prependOhlcvBars(bars) {
    state.ohlcvData = bars.concat(state.ohlcvData);
}
function getOhlcvGeneration() {
    return state.ohlcvGeneration;
}
function state_bumpOhlcvGeneration() {
    state.ohlcvGeneration += 1;
    return state.ohlcvGeneration;
}
function getOhlcvPagination() {
    return state.ohlcvPagination;
}
function setOhlcvPagination(pagination) {
    state.ohlcvPagination = pagination;
}
function clearOhlcvPagination() {
    state.ohlcvPagination = emptyPagination();
}
// ----- Visible range ------------------------------------------------------
function getVisibleFromMs() {
    return state.visibleFromMs;
}
function setVisibleFromMs(ms) {
    state.visibleFromMs = ms;
}
function getVisibleToMs() {
    return state.visibleToMs;
}
function setVisibleToMs(ms) {
    state.visibleToMs = ms;
}
// ----- Realtime tick subscribers ------------------------------------------
function registerRealtimeCallback(listenerGuid, cb) {
    state.realtimeCallbacks[listenerGuid] = cb;
}
function unregisterRealtimeCallback(listenerGuid) {
    delete state.realtimeCallbacks[listenerGuid];
}
function getRealtimeCallbacks() {
    return state.realtimeCallbacks;
}
/**
 * Resets state to defaults — useful for unit tests. NOT for runtime use; the
 * WebView is created fresh per mount (the RN side recreates the HTML when
 * the theme or feature flags change).
 */
function __resetStateForTests() {
    state.widget = null;
    state.isChartReady = false;
    state.currentSymbol = 'ASSET';
    state.currentResolution = '5';
    state.currentChartType = 2;
    state.theme = null;
    state.libraryLoaded = false;
    state.libraryError = null;
    state.ohlcvData = [];
    state.ohlcvGeneration = 0;
    state.ohlcvPagination = emptyPagination();
    state.visibleFromMs = null;
    state.visibleToMs = null;
    state.realtimeCallbacks = {};
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/loadLibrary.ts
// Loads the TradingView Advanced Charts library from window.CONFIG.libraryUrl
// by injecting a <script> tag into the document head.
//
// Mirrors legacy chartLogic.js \`loadLibrary()\` (lines ~5211-5237) but returns
// a Promise so callers can \`await\` library readiness in bootstrap.ts.


const CHARTING_LIBRARY_FILE = 'charting_library.js';
/**
 * Loads the TradingView library script. Subsequent calls resolve immediately
 * if the library is already loaded; rejected if a previous load failed.
 */
function loadLibrary_loadTradingViewLibrary(libraryUrl) {
    if (isLibraryLoaded()) {
        return Promise.resolve();
    }
    const existingError = getLibraryError();
    if (existingError) {
        return Promise.reject(new Error(existingError));
    }
    return new Promise((resolve, reject) => {
        const scriptUrl = libraryUrl + CHARTING_LIBRARY_FILE;
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scriptUrl;
        script.onload = () => {
            setLibraryLoaded(true);
            resolve();
        };
        script.onerror = () => {
            const message = \`Failed to load TradingView library. URL: \${scriptUrl}\`;
            setLibraryError(message);
            reportErrorToRN(message);
            reject(new Error(message));
        };
        document.head.appendChild(script);
    });
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/messages/handler.ts
// Inbound message dispatcher. Modules register typed handlers for the message
// types they own; the dispatcher routes incoming messages by \`type\`.
//
// Mirrors legacy chartLogic.js \`handleMessage\` (lines ~341-401) but inverts
// control: instead of a hard-coded switch, modules subscribe via
// registerHandler. This lets Phase 2/3/5/6 add message types without editing
// this file.
//
// Phase 1 routes SET_THEME_COLORS via widget/theme.ts.

const handlers = new Map();
/**
 * Register a handler for a single inbound message type. Subsequent calls
 * with the same type replace the previous handler (intentional — there's
 * one owner per message type by convention).
 */
function registerHandler(type, handler) {
    handlers.set(type, handler);
}
/**
 * Dispatches an incoming message to the registered handler. Unknown types
 * are silently dropped — future phases will add their handlers; the
 * dispatcher doesn't need to know what's coming.
 *
 * Errors inside a handler are forwarded to RN via ERROR.
 */
function dispatchInboundMessage(message) {
    const handler = handlers.get(message.type);
    if (!handler)
        return;
    try {
        handler(message.payload);
    }
    catch (error) {
        reportErrorToRN(error);
    }
}
/** Test-only: clear all registered handlers. */
function __resetHandlersForTests() {
    handlers.clear();
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/theme.ts
// Theme application + SET_THEME_COLORS hot-swap handler.
//
// Ported from chartLogic.js: getThemeLineColor (line ~1034),
// getThemeLastPriceLineColor (~1044), getSeriesColorOverrides (~1084),
// applySeriesStyleProperties (~1114), applySeriesColors (~1134), and
// handleSetThemeColors (~1158).
//
// Phase 1 simplifications vs legacy:
// - Drops \`useCustomPriceLabels\` branching (custom chrome is being removed;
//   TV built-in scale + crosshair labels are always used).
// - Drops in-place shape recolor for line-end dot / dashed last-price / pills
//   (all chrome shapes that no longer exist).
// - Volume study recolor is wired through a subscribe callback so Phase 3's
//   features/volume/ can register without theme.ts knowing about it.


const listeners = new Set();
/**
 * Subscribe to theme changes. The callback fires whenever
 * applyThemeColors() updates state.theme. Returns an unsubscribe.
 */
function subscribeTheme(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
/**
 * Returns the series stroke color. Falls back to successColor when
 * lineColor is unset (ambient feature off).
 */
function getThemeLineColor(theme) {
    return theme.lineColor || theme.successColor;
}
/**
 * Returns the current-price line color. Honors currentPriceColor when set,
 * else matches the series line color.
 */
function getThemeLastPriceLineColor(theme) {
    return theme.currentPriceColor || getThemeLineColor(theme);
}
/**
 * Returns the TradingView main-series style overrides for a given line color.
 */
function getSeriesColorOverrides(lineColor, lastPriceLineColor) {
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
function getBuiltInScaleLabelOverrides(theme) {
    const crosshairBg = theme.crosshairBackgroundColor ||
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
function getCandleStyleOverrides(theme) {
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
function initThemeFromConfig(theme) {
    setTheme(theme);
}
/**
 * Hot-swap theme colors. Mirrors legacy chartLogic.js handleSetThemeColors
 * but without the chrome-shape updates (those features are deleted).
 */
function applyThemeColors(payload) {
    const current = getTheme();
    if (!current)
        return;
    const updated = {
        ...current,
        ...(payload.lineColor != null && { lineColor: payload.lineColor }),
        ...(payload.successColor != null && { successColor: payload.successColor }),
        ...(payload.errorColor != null && { errorColor: payload.errorColor }),
        ...(payload.currentPriceColor != null && {
            currentPriceColor: payload.currentPriceColor,
        }),
    };
    setTheme(updated);
    const widget = getWidget();
    if (!widget || !isChartReady()) {
        // Theme is now updated in state; the next listener / chart-ready cycle
        // will pick it up. Mid-init theme changes are rare in practice.
        notifyListeners(updated);
        return;
    }
    try {
        widget.applyOverrides({
            ...getCandleStyleOverrides(updated),
            ...getSeriesColorOverrides(getThemeLineColor(updated), getThemeLastPriceLineColor(updated)),
            ...getBuiltInScaleLabelOverrides(updated),
        });
    }
    catch (error) {
        reportErrorToRN(error);
    }
    notifyListeners(updated);
}
function notifyListeners(theme) {
    for (const listener of listeners) {
        try {
            listener(theme);
        }
        catch (error) {
            reportErrorToRN(error);
        }
    }
}
/** Test-only: clear all subscribers. */
function __resetThemeForTests() {
    listeners.clear();
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/pagination/priceApi.ts
// Default OHLCV paginator — fetches older bars from the MetaMask Price API.
//
// Used by widget/datafeed.ts when state.ohlcvPagination has a cursor. Phase 6
// adds pagination/rnBacked.ts as an alternative strategy (consumer-supplied
// fetchOlderBars callback for Perps' RN-backed candle source).
//
// Ported from chartLogic.js \`fetchOlderBars\` (lines ~4991-5072), trimmed of
// the layout-settle pending machinery and trade-marker refresh hook (those
// belong to later phases / are gone after Phase 4).


const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';
/**
 * Fetches the next page from the Price API and merges new bars into state.
 * Resolves with the slice strictly older than \`oldestAtDefer\` (TV's getBars
 * wants only bars before its current visible window). Returns \`noData: true\`
 * when the cursor is exhausted or the response yields no older bars.
 *
 * Aborts with \`noData: true\` when ohlcvGeneration changes mid-flight (a newer
 * SET_OHLCV_DATA has invalidated this fetch).
 */
async function fetchOlderBarsFromPriceApi(request) {
    const pag = getOhlcvPagination();
    if (!pag.nextCursor || !pag.hasMore || !pag.assetId) {
        return { olderBars: [], noData: true };
    }
    const generation = getOhlcvGeneration();
    const params = [];
    params.push(\`nextCursor=\${encodeURIComponent(pag.nextCursor)}\`);
    if (pag.vsCurrency) {
        params.push(\`vsCurrency=\${encodeURIComponent(pag.vsCurrency)}\`);
    }
    const url = \`\${OHLCV_BASE_URL}/\${pag.assetId}?\${params.join('&')}\`;
    let response;
    try {
        response = await fetch(url);
    }
    catch (error) {
        if (generation !== getOhlcvGeneration()) {
            return { olderBars: [], noData: true };
        }
        reportErrorToRN(error);
        return { olderBars: [], noData: true };
    }
    if (!response.ok) {
        if (generation !== getOhlcvGeneration()) {
            return { olderBars: [], noData: true };
        }
        reportErrorToRN(new Error(\`OHLCV API error: \${response.status}\`));
        return { olderBars: [], noData: true };
    }
    let parsed;
    try {
        parsed = (await response.json());
    }
    catch (error) {
        reportErrorToRN(error);
        return { olderBars: [], noData: true };
    }
    if (generation !== getOhlcvGeneration()) {
        return { olderBars: [], noData: true };
    }
    if (!parsed || !Array.isArray(parsed.data)) {
        reportErrorToRN(new Error('OHLCV API response: invalid payload'));
        return { olderBars: [], noData: true };
    }
    const newBars = parsed.data.map((c) => ({
        time: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
    }));
    setOhlcvPagination({
        ...pag,
        nextCursor: parsed.nextCursor ?? null,
        hasMore: !!parsed.hasNext,
    });
    if (newBars.length > 0) {
        prependOhlcvBars(newBars);
    }
    const olderBars = newBars.filter((b) => b.time < request.oldestAtDefer);
    return { olderBars, noData: olderBars.length === 0 };
}
/**
 * Test-only helper: invalidates any in-flight fetches by bumping the generation.
 */
function invalidateInFlightFetches() {
    bumpOhlcvGeneration();
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/datafeed.ts
// TradingView UDF datafeed object passed into the widget constructor.
//
// Ported from chartLogic.js \`customDatafeed\` (lines ~5074-5203) and its
// helpers \`filterBarsForRange\` (~4944), \`fetchOlderBars\` (~4991).
// Phase 2 wires the default Price API paginator; Phase 6 swaps in
// pagination/rnBacked.ts when consumers opt into the custom strategy.



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
const VARIABLE_TICK_SIZE = [
    '0.0000000001',
    '0.000001',
    '0.00000001',
    '0.0001',
    '0.000001',
    '0.01',
    '0.0001',
    '1',
    '0.01',
    '10000',
    '0.1',
].join(' ');
/** Strips internal fields from an OHLCVBar to the shape TV expects. */
function toTVBar(bar) {
    return {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
    };
}
/**
 * Filters the in-memory OHLCV array to the requested time window.
 * Mirrors legacy \`filterBarsForRange\`: returns bars in [fromMs, toMs); if
 * fewer than countBack bars match, falls back to the last countBack bars
 * before toMs.
 */
function filterBarsForRange(fromMs, toMs, countBack) {
    const all = getOhlcvData();
    const inRange = [];
    for (const bar of all) {
        if (bar.time >= fromMs && bar.time < toMs) {
            inRange.push(toTVBar(bar));
        }
    }
    if (inRange.length >= countBack) {
        return inRange;
    }
    const beforeTo = all.filter((b) => b.time < toMs);
    const startIdx = Math.max(0, beforeTo.length - countBack);
    return beforeTo.slice(startIdx).map(toTVBar);
}
const customDatafeed = {
    onReady(callback) {
        setTimeout(() => {
            callback({
                supported_resolutions: SUPPORTED_RESOLUTIONS,
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true,
            });
        }, 0);
    },
    searchSymbols(_userInput, _exchange, _symbolType, onResult) {
        onResult([]);
    },
    resolveSymbol(symbolName, onResolve, _onError) {
        const info = {
            name: symbolName,
            ticker: symbolName,
            description: symbolName,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: '',
            minmov: 1,
            pricescale: 100,
            variable_tick_size: VARIABLE_TICK_SIZE,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: SUPPORTED_RESOLUTIONS,
            volume_precision: 0,
            data_status: 'endofday',
        };
        setTimeout(() => onResolve(info), 0);
    },
    getBars(_symbolInfo, _resolution, periodParams, onResult, onError) {
        try {
            const fromMs = periodParams.from * 1000;
            const toMs = periodParams.to * 1000;
            const { countBack, firstDataRequest } = periodParams;
            const bars = filterBarsForRange(fromMs, toMs, countBack);
            if (bars.length > 0) {
                onResult(bars, { noData: false });
                return;
            }
            const all = getOhlcvData();
            if (firstDataRequest || all.length === 0) {
                onResult([], { noData: true });
                return;
            }
            // Page older bars from the default Price API paginator. Phase 6 will
            // route this through a consumer-supplied strategy when pagination.mode
            // === 'custom'.
            const oldestAtDefer = all[0].time;
            fetchOlderBarsFromPriceApi({ oldestAtDefer })
                .then(({ olderBars, noData }) => {
                onResult(olderBars, { noData });
            })
                .catch((error) => {
                reportErrorToRN(error);
                onResult([], { noData: true });
            });
        }
        catch (error) {
            onError(error instanceof Error ? error.message : String(error ?? 'Unknown'));
        }
    },
    subscribeBars(_symbolInfo, _resolution, onTick, listenerGuid) {
        registerRealtimeCallback(listenerGuid, onTick);
    },
    unsubscribeBars(listenerGuid) {
        unregisterRealtimeCallback(listenerGuid);
    },
};
/**
 * Forward a realtime tick to every TradingView subscribeBars listener.
 * Called from widget/ohlcvIngestion.ts on REALTIME_UPDATE.
 */
function forwardRealtimeTick(tick) {
    const callbacks = getRealtimeCallbacks();
    for (const guid of Object.keys(callbacks)) {
        try {
            callbacks[guid](tick);
        }
        catch (error) {
            reportErrorToRN(error);
        }
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/resolution.ts
// Maps OHLCV bar intervals (milliseconds) to TradingView resolution strings.
//
// Ported verbatim from chartLogic.js INTERVAL_MS_TO_TV + detectResolution
// (lines ~463-505). Phase 2 consumes this from widget/ohlcvIngestion.ts.
/** OHLCV bar interval in milliseconds → TradingView resolution code. */
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
const DEFAULT_RESOLUTION = '5';
/**
 * Picks the closest matching TV resolution for an OHLCV bar series.
 * Uses the median diff over the first few bars so a single gap doesn't skew
 * the result (matches legacy chartLogic.js detectResolution semantics).
 */
function detectResolution(data) {
    if (data.length < 2) {
        return DEFAULT_RESOLUTION;
    }
    const sampleCount = Math.min(data.length - 1, 10);
    const diffs = [];
    for (let i = 0; i < sampleCount; i++) {
        diffs.push(data[i + 1].time - data[i].time);
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    let best = DEFAULT_RESOLUTION;
    let bestDist = Infinity;
    for (const key of Object.keys(INTERVAL_MS_TO_TV)) {
        const intervalMs = Number(key);
        const distance = Math.abs(intervalMs - median);
        if (distance < bestDist) {
            bestDist = distance;
            best = INTERVAL_MS_TO_TV[intervalMs];
        }
    }
    return best;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/timeUtils.ts
// Time normalization helpers used across modules.
//
// Ported from chartLogic.js: normalizeChartUnixSec (line ~3564),
// chartRawTimeToUnixMs (line ~3573), getApproxBarDurationSec (line ~3587).
// Phase 2's widget/ohlcvIngestion.ts and pagination/priceApi.ts consume
// these.
/**
 * Convert a timestamp to unix seconds, accepting either ms or seconds.
 * Values ≥ 1e12 are treated as milliseconds (~Sep 2001 in seconds; safe
 * threshold). Returns null for non-finite input.
 */
function normalizeChartUnixSec(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return null;
    }
    return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}
/**
 * Convert a raw TradingView timestamp to unix milliseconds. Unlike
 * normalizeChartUnixSec, keeps sub-second precision when the input is already
 * in seconds (multiplies by 1000 instead of flooring).
 */
function chartRawTimeToUnixMs(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return null;
    }
    if (n >= 1e12) {
        return n;
    }
    return n * 1000;
}
const DEFAULT_BAR_DURATION_SEC = 300;
const MIN_BAR_DURATION_SEC = 60;
/**
 * Approximates the bar duration (seconds) for a series of OHLCV bars by
 * measuring the gap between the last two points. Used for visible-range
 * alignment and end-icon insets.
 *
 * Returns a sensible default when the series is too short.
 */
function getApproxBarDurationSec(bars) {
    if (!bars || bars.length < 2) {
        return DEFAULT_BAR_DURATION_SEC;
    }
    const lastMs = Math.abs(bars[bars.length - 1].time - bars[bars.length - 2].time);
    return Math.max(MIN_BAR_DURATION_SEC, Math.round(lastMs / 1000));
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/ohlcvIngestion.ts
// SET_OHLCV_DATA and REALTIME_UPDATE inbound handlers.
//
// Ported from chartLogic.js: handleSetOHLCVData (~line 507) and
// handleRealtimeUpdate (~line 658).
//
// Phase 2 simplifications vs legacy:
// - No \`__mmLayoutSettlePending\` / \`beginDeferredLayoutSettleAfterOhlcvReload\`
//   plumbing — CHART_LAYOUT_SETTLED is emitted on chart ready and on each
//   data load directly.
// - No chrome-related branches (\`refreshLineChartOverlays\`, line-end-dot,
//   custom dashed price line) — those features are deleted in Phase 4.
// - No trade-marker / indicator-state clear paths — Phase 5 / Phase 3 own
//   those overlays and they hook into their own message types, not into
//   SET_OHLCV_DATA's reset path.





let firstDataCallback = null;
let firstDataDelivered = false;
/**
 * Registers the callback invoked the first time SET_OHLCV_DATA arrives.
 * Bootstrap wires this to widget creation (loads the TV library if needed,
 * then calls createChartWidget).
 */
function onFirstOhlcvData(cb) {
    firstDataCallback = cb;
}
function handleSetOHLCVData(payload) {
    if (!payload || !payload.data || payload.data.length === 0) {
        return;
    }
    setOhlcvData(payload.data);
    state_bumpOhlcvGeneration();
    if (payload.pagination) {
        setOhlcvPagination({
            nextCursor: payload.pagination.nextCursor ?? null,
            hasMore: !!payload.pagination.hasMore,
            assetId: payload.pagination.assetId ?? null,
            vsCurrency: payload.pagination.vsCurrency ?? null,
        });
    }
    else {
        clearOhlcvPagination();
    }
    setVisibleFromMs(payload.visibleFromMs ?? null);
    setVisibleToMs(payload.visibleToMs ?? null);
    const newResolution = detectResolution(payload.data);
    const previousResolution = getCurrentResolution();
    setCurrentResolution(newResolution);
    const widget = getWidget();
    if (widget && isChartReady()) {
        try {
            const chart = widget.activeChart();
            if (previousResolution !== newResolution) {
                chart.setResolution(newResolution, () => {
                    try {
                        chart.resetData();
                        applyVisibleRange(chart);
                        emitLayoutSettled();
                    }
                    catch (error) {
                        reportErrorToRN(error);
                    }
                });
            }
            else {
                chart.resetData();
                applyVisibleRange(chart);
                emitLayoutSettled();
            }
        }
        catch (error) {
            reportErrorToRN(error);
        }
        return;
    }
    if (!widget && firstDataCallback && !firstDataDelivered) {
        firstDataDelivered = true;
        try {
            firstDataCallback();
        }
        catch (error) {
            firstDataDelivered = false;
            reportErrorToRN(error);
        }
    }
}
function handleRealtimeUpdate(payload) {
    if (!payload || !payload.bar)
        return;
    const bar = payload.bar;
    appendOrReplaceLastBar(bar);
    forwardRealtimeTick({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
    });
}
function applyVisibleRange(chart) {
    const fromMs = getVisibleFromMs();
    if (fromMs == null) {
        try {
            chart.getTimeScale().setRightOffset(2);
        }
        catch (error) {
            reportErrorToRN(error);
        }
        return;
    }
    const capturedGeneration = getOhlcvGeneration();
    const subscription = chart.onDataLoaded();
    const onLoaded = () => {
        subscription.unsubscribe(null, onLoaded);
        if (capturedGeneration !== getOhlcvGeneration()) {
            return;
        }
        const data = getOhlcvData();
        const lastBar = data[data.length - 1];
        const toSec = lastBar
            ? Math.ceil(lastBar.time / 1000)
            : Math.ceil(Date.now() / 1000);
        const barPadSec = getApproxBarDurationSec(data) * 2;
        try {
            chart.setVisibleRange({ from: Math.floor(fromMs / 1000), to: toSec + barPadSec }, { percentRightMargin: 0 });
        }
        catch (error) {
            reportErrorToRN(error);
        }
    };
    subscription.subscribe(null, onLoaded);
}
function emitLayoutSettled() {
    const send = () => {
        if (getWidget() && isChartReady()) {
            postToRN('CHART_LAYOUT_SETTLED', {});
        }
    };
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(send);
        });
    }
    catch {
        setTimeout(send, 48);
    }
}
/** Test-only: clear the first-data trigger and the delivery flag. */
function __resetOhlcvIngestionForTests() {
    firstDataCallback = null;
    firstDataDelivered = false;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/types.ts
// Shared types for the AdvancedChart WebView modules.
//
// These types are local to the WebView bundle. Cross-bridge payload shapes that
// must match the RN side live in messages/contract.ts and mirror the unions in
// app/components/UI/Charts/AdvancedChart/AdvancedChart.types.ts.
/** Chart type integers used by TradingView's setChartType / currentChartType. */
var ChartType;
(function (ChartType) {
    ChartType[ChartType["Candles"] = 1] = "Candles";
    ChartType[ChartType["Line"] = 2] = "Line";
})(ChartType || (ChartType = {}));

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/scaleLayout.ts
// Centralised price-scale + pane-layout overrides.
//
// Ported from chartLogic.js \`applyChartScaleLayout\` (~line 1270). Applied on
// every chart-type switch and once on chart-ready so candle and line charts
// share the same visible Y range. Without paneProperties.topMargin /
// bottomMargin, TV auto-fits the line series tighter than the candle series
// (close-only vs high/low) and the line chart looks zoomed in.
//
// Phase 2 simplifications vs legacy:
// - Drops chrome-related toggles (showSeriesLastValue/CrosshairLabel
//   conditionals — TV built-in always on now)
// - Drops DOM overflow unclip / hide-price-scale-buttons (no chrome to hide)


const PANE_TOP_MARGIN = 12;
const PANE_BOTTOM_MARGIN = 8;
function buildScaleLayoutOverrides() {
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
function applyScaleLayout(_type) {
    const widget = getWidget();
    if (!widget || !isChartReady())
        return;
    try {
        widget.applyOverrides(buildScaleLayoutOverrides());
    }
    catch (error) {
        reportErrorToRN(error);
        return;
    }
    syncMainSeriesToRightScale(widget);
}
function syncMainSeriesToRightScale(widget) {
    try {
        widget.activeChart().getSeries().detachToRight();
    }
    catch {
        // detachToRight can fail mid-teardown; safe to ignore.
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/chartType.ts
// SET_CHART_TYPE handler — switches between candle (1) and line (2) types.
//
// Ported from chartLogic.js handleSetChartType (~line 2457). After
// setChartType, the legacy code calls applyChartScaleLayout to re-apply
// pane margins + right-scale binding; without it the line chart auto-fits
// to close-only and looks "zoomed in" vs the candle chart's high/low range.




function handleSetChartType(payload) {
    const widget = getWidget();
    if (!widget) {
        // Widget not built yet; persist the desired type so initChart picks it up.
        setCurrentChartType(payload.type);
        return;
    }
    setCurrentChartType(payload.type);
    if (!isChartReady()) {
        return;
    }
    try {
        widget.activeChart().setChartType(payload.type);
        applyScaleLayout(payload.type);
        // TradingView may rebind scales asynchronously after a type switch; the
        // legacy code re-applies on the next animation frame for the line chart.
        // Doing it for both types is safe.
        requestAnimationFrame(() => applyScaleLayout(payload.type));
    }
    catch (error) {
        reportErrorToRN(error);
    }
}


;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/visualOverrides.ts
// Visual override application — grid colour, pane separator, current-price
// line colour. Driven from CONFIG.visualOverrides (set by the consumer's
// \`visualOverrides\` prop on the RN side).
//
// New module in Phase 2 — there was no single legacy equivalent; the legacy
// code spread these overrides across init + theme + series style branches.
// Centralising here lets Perps (Phase 6) feed surface-specific overrides via
// the same path.


/**
 * Builds the TradingView override object from a VisualOverridesConfig.
 * Returned shape is suitable for passing into TradingView's \`applyOverrides\`.
 */
function buildVisualOverrides(config) {
    if (!config)
        return {};
    const overrides = {};
    if (config.gridLineColor != null) {
        overrides['paneProperties.vertGridProperties.color'] = config.gridLineColor;
        overrides['paneProperties.horzGridProperties.color'] = config.gridLineColor;
    }
    if (config.hidePaneSeparator) {
        overrides['paneProperties.separatorColor'] = 'rgba(0,0,0,0)';
    }
    if (config.currentPriceLineColor != null) {
        overrides['mainSeriesProperties.priceLineColor'] =
            config.currentPriceLineColor;
    }
    return overrides;
}
/**
 * Apply visual overrides to a live widget. Safe to call before chart-ready —
 * TradingView queues overrides internally. Errors are forwarded to RN.
 */
function applyVisualOverrides(config) {
    const widget = getWidget();
    if (!widget)
        return;
    const overrides = buildVisualOverrides(config);
    if (Object.keys(overrides).length === 0)
        return;
    try {
        widget.applyOverrides(overrides);
    }
    catch (error) {
        reportErrorToRN(error);
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/tvDomHelpers.ts
// Pure DOM traversal helpers for TradingView's same-origin iframe layout.
//
// Ported from chartLogic.js: findOuterChartMarkupTable (~line 1977) and
// eachChartDocument (~line 2003). Used by externalLinkBridge and (in later
// phases) by indicator legend overlay layout calculations.
/**
 * Find the outermost \`.chart-markup-table\` element in a document — the
 * container that wraps the price + time axes. Skips inner panes and axis
 * containers so consumers can reason about chart bounds.
 */
function findOuterChartMarkupTable(doc) {
    if (!doc) {
        return null;
    }
    const list = doc.querySelectorAll('.chart-markup-table');
    for (const el of Array.from(list)) {
        const className = el.className ? String(el.className) : '';
        if (el.classList.contains('pane'))
            continue;
        if (className.indexOf('price-axis-container') !== -1)
            continue;
        if (className.indexOf('time-axis') !== -1)
            continue;
        return el;
    }
    return list.length ? list[0] : null;
}
/**
 * Run \`fn(document)\` and \`fn(iframe.contentDocument)\` for the TradingView
 * same-origin iframe. TradingView's chart can mount in either the host doc
 * or a same-origin iframe depending on \`iframe_loading_same_origin\`; helpers
 * that traverse DOM should hit both.
 */
function eachChartDocument(fn) {
    try {
        fn(document);
    }
    catch {
        // Continue to the iframe document.
    }
    try {
        const container = document.getElementById('tv_chart_container');
        const iframe = container?.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
            fn(iframe.contentDocument);
        }
    }
    catch {
        // No-op — iframe access can fail for cross-origin or detached frames.
    }
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/externalLinkBridge.ts
// Intercepts in-iframe TradingView link clicks and forwards them to React
// Native via CHART_TRADINGVIEW_CLICKED, so the user opens links in the
// system browser instead of letting the iframe navigate.
//
// Ported from chartLogic.js: TV_EXTERNAL_BRIDGE_DEBOUNCE_MS,
// isTradingViewExternalHostname, isTradingViewExternalHref,
// installTradingViewExternalOpenBridge (lines ~2016-2122).


const TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;
// Module-local debounce timestamp; replaces window.__mmLastTvExternalBridgeAt.
let lastBridgeAt = 0;
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
        const base = window.location?.href ?? 'https://localhost/';
        const u = new URL(href, base);
        return isTradingViewExternalHostname(u.hostname);
    }
    catch {
        return false;
    }
}
function sendTradingViewClicked(url) {
    postToRN('CHART_TRADINGVIEW_CLICKED', url ? { url } : {});
}
function handleTradingViewLinkCapture(ev) {
    const target = ev.target;
    if (!target || typeof target.closest !== 'function')
        return;
    const anchor = target.closest('a');
    if (!anchor || !anchor.href || !isTradingViewExternalHref(anchor.href)) {
        return;
    }
    const now = Date.now();
    if (now - lastBridgeAt < TV_EXTERNAL_BRIDGE_DEBOUNCE_MS)
        return;
    lastBridgeAt = now;
    try {
        ev.preventDefault();
        ev.stopPropagation();
    }
    catch {
        // preventDefault on a passive listener throws; safe to ignore.
    }
    sendTradingViewClicked(anchor.href);
}
function patchWindowOpen(win) {
    if (!win || !win.open || win.__mmTvOpenPatched)
        return;
    win.__mmTvOpenPatched = true;
    const origOpen = win.open.bind(win);
    win.open = function patchedOpen(url, target, features) {
        if (url != null && url !== '' && isTradingViewExternalHref(String(url))) {
            const now = Date.now();
            if (now - lastBridgeAt < TV_EXTERNAL_BRIDGE_DEBOUNCE_MS) {
                return null;
            }
            lastBridgeAt = now;
            sendTradingViewClicked(String(url));
            return null;
        }
        return origOpen(url, target, features);
    };
}
function applyAllOnce() {
    patchWindowOpen(window);
    eachChartDocument((doc) => {
        try {
            patchWindowOpen(doc.defaultView);
        }
        catch {
            // defaultView access can fail in detached iframes.
        }
        const flagged = doc;
        if (doc && doc.addEventListener && !flagged.__mmTvLinkCaptureInstalled) {
            flagged.__mmTvLinkCaptureInstalled = true;
            doc.addEventListener('click', handleTradingViewLinkCapture, true);
        }
    });
}
/**
 * Installs the bridge. Safe to call multiple times — each document is
 * tagged with __mmTvLinkCaptureInstalled to avoid duplicate listeners.
 *
 * Reapplies on the iframe \`load\` event and after 200ms / 800ms / 2000ms
 * because TradingView creates the iframe asynchronously and may swap its
 * contentDocument; we don't have a reliable single signal for "fully loaded".
 */
function installTradingViewExternalOpenBridge() {
    applyAllOnce();
    try {
        const container = document.getElementById('tv_chart_container');
        const iframe = container?.querySelector('iframe');
        if (iframe) {
            iframe.addEventListener('load', applyAllOnce);
        }
    }
    catch {
        // No-op — container/iframe may not exist yet on early calls.
    }
    setTimeout(applyAllOnce, 200);
    setTimeout(applyAllOnce, 800);
    setTimeout(applyAllOnce, 2000);
}
/** Test-only: reset module state between tests. */
function __resetExternalLinkBridgeForTests() {
    lastBridgeAt = 0;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/widget/initChart.ts
// TradingView widget creation and onChartReady orchestration.
//
// Ported from chartLogic.js initChart() / onChartReady (lines ~5242-5601),
// stripped of:
//   - chrome-related branches (useCustomLabels / useCustomDashed) — Phase 4
//   - data-dependent gating (\`window.ohlcvData.length === 0\`) — Phase 2 calls
//     this function only once data is in
//   - custom crosshair listener + chart-interaction analytics — Phase 2
//     (interaction/) will own this
//   - line-end overlays / last-price overlays / legend overlay refresh —
//     Phase 4 deletes the first two; Phase 3 owns the legend
//
// Phase 1's job is the constructor call + onChartReady hook + library load
// orchestration. Phase 2 wires the datafeed.





/**
 * Generates a 19-shade palette from a base hex color, light→base→dark.
 * Used for TradingView \`custom_themes.dark.color{1,3}\`. Ported verbatim
 * from chartLogic.js \`generatePaletteShades\` (~line 999).
 */
function generatePaletteShades(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const shades = [];
    for (let i = 0; i < 19; i++) {
        const t = i / 18;
        let sr;
        let sg;
        let sb;
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
 * Shared TV widget defaults, minus disabled_features (computed from
 * CONFIG.features at call time). Mirrors legacy enabled_features list.
 */
const DEFAULT_ENABLED_FEATURES = [
    'study_templates',
    'iframe_loading_same_origin',
    'always_show_legend_values_on_mobile',
];
function resolveDisabledFeatures(features) {
    const list = (features.disabledFeatures ?? []).slice();
    if (!features.enableDrawingTools) {
        list.push('left_toolbar');
        list.push('context_menus');
    }
    list.push('use_localstorage_for_settings');
    return list;
}
function buildWidgetOverrides(theme) {
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
        ...getSeriesColorOverrides(getThemeLineColor(theme), getThemeLastPriceLineColor(theme)),
        ...getBuiltInScaleLabelOverrides(theme),
    };
}
/**
 * Builds the TradingView widget. Returns the widget; the caller is expected
 * to store it via setWidget(). Emits CHART_READY + CHART_LAYOUT_SETTLED to
 * RN when the widget reports onChartReady.
 */
function createChartWidget(config, options) {
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
        timezone: options.timezone ?? 'Etc/UTC',
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
            }
            catch (error) {
                reportErrorToRN(error);
            }
        }
    });
    return widget;
}
function hideLoadingOverlay() {
    try {
        const el = document.getElementById('loading-overlay');
        el?.classList.add('hidden');
    }
    catch {
        // Loading overlay may be absent in non-template contexts (e.g. tests).
    }
}
/**
 * Posts CHART_LAYOUT_SETTLED after two rAF ticks so RN's skeleton overlay
 * can hide once TradingView has actually laid out. Mirrors legacy
 * scheduleChartLayoutSettledNotify (~line 118).
 */
function scheduleChartLayoutSettledNotify() {
    const send = () => {
        if (getWidget()) {
            postToRN('CHART_LAYOUT_SETTLED', {});
        }
    };
    try {
        requestAnimationFrame(() => {
            requestAnimationFrame(send);
        });
    }
    catch {
        setTimeout(send, 48);
    }
}
/**
 * Ensures library is loaded, then awaits caller-provided pre-widget setup.
 * Phase 2's ohlcvIngestion calls this once SET_OHLCV_DATA arrives.
 */
async function ensureLibraryLoaded(libraryUrl) {
    await loadTradingViewLibrary(libraryUrl);
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/interaction/crosshair.ts
// Crosshair → CROSSHAIR_MOVE message bridge + short-tap dismiss.
//
// Subscribes to TradingView's crossHairMoved() and posts the nearest OHLCV
// bar to RN. RN side's parseWebViewMessage routes this to onCrosshairMove,
// and AdvancedChart.tsx's OHLCVBar component reads \`payload.data\`.
//
// Also subscribes to mouse_down / mouse_up so a short tap (< 400ms) after a
// visible crosshair session dismisses the OHLCV bar — matches legacy
// chartLogic.js (~lines 5742-5779). Without this the OHLCV bar lingers
// forever after a long-press shows it.
//
// Ported from chartLogic.js (~line 5672) but simplified:
// - No custom DOM crosshair-label drawing (Phase 4 deleted that)
// - No marker hit-test bookkeeping (Phase 5's overlays/tradeMarkers owns it)


const session = {
    visible: false,
    shownAt: 0,
    dismissUntil: 0,
    tooltipInteractSent: false,
    mouseDownAt: 0,
};
const SHORT_TAP_MS = 400;
const SYNTHETIC_CLICK_GUARD_MS = 500;
const DISMISS_WINDOW_MS = 800;
const DISMISS_RN_DELAY_MS = 50;
function nearestBar(timeSec, data) {
    if (data.length === 0)
        return null;
    const targetMs = timeSec * 1000;
    let best = null;
    let bestDiff = Infinity;
    for (const bar of data) {
        const diff = Math.abs(bar.time - targetMs);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = bar;
        }
    }
    return best;
}
function toCrosshairData(bar) {
    if (!bar)
        return null;
    return {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
    };
}
/**
 * Subscribes the chart's crosshair-move event. Each tick posts CROSSHAIR_MOVE
 * with the nearest OHLCV bar shaped as CrosshairData, or null when the
 * crosshair dismisses or when we're inside the post-tap dismiss window.
 */
function attachCrosshairListener(chart) {
    try {
        const subscription = chart.crossHairMoved();
        subscription.subscribe(null, (params) => {
            if (!params || params.price === undefined || params.time === undefined) {
                postToRN('CROSSHAIR_MOVE', { data: null });
                return;
            }
            if (Date.now() < session.dismissUntil) {
                postToRN('CROSSHAIR_MOVE', { data: null });
                return;
            }
            const bar = nearestBar(params.time, getOhlcvData());
            if (!session.visible) {
                session.shownAt = Date.now();
            }
            session.visible = true;
            if (bar && !session.tooltipInteractSent) {
                postToRN('CHART_INTERACTED', { interaction_type: 'tooltip' });
                session.tooltipInteractSent = true;
            }
            postToRN('CROSSHAIR_MOVE', { data: toCrosshairData(bar) });
        });
    }
    catch (error) {
        reportErrorToRN(error);
    }
}
/**
 * Subscribes mouse_down / mouse_up so a short tap after a long-press-shown
 * crosshair dismisses the OHLCV bar on the RN side. TV's built-in crosshair
 * line will stay on the chart (no TV API for programmatic dismiss); only the
 * RN-side OHLCV bar reads \`CROSSHAIR_MOVE { data: null }\` to hide itself.
 */
function attachTapDismiss(widget) {
    try {
        widget.subscribe('mouse_down', () => {
            session.mouseDownAt = Date.now();
            session.dismissUntil = 0;
        });
        widget.subscribe('mouse_up', () => {
            if (!session.visible)
                return;
            const pressDuration = Date.now() - session.mouseDownAt;
            if (pressDuration >= SHORT_TAP_MS)
                return;
            // Avoid dismissing the bar in response to the synthetic mouse-up that
            // fires when a long-press finally releases — only dismiss if the bar
            // has been visible long enough to be a deliberate "second tap".
            if (Date.now() - session.shownAt < SYNTHETIC_CLICK_GUARD_MS)
                return;
            session.visible = false;
            session.shownAt = 0;
            session.dismissUntil = Date.now() + DISMISS_WINDOW_MS;
            setTimeout(() => {
                session.tooltipInteractSent = false;
                postToRN('CROSSHAIR_MOVE', { data: null });
            }, DISMISS_RN_DELAY_MS);
        });
    }
    catch (error) {
        reportErrorToRN(error);
    }
}
/** Test-only: reset the module-local crosshair session state. */
function __resetCrosshairForTests() {
    session.visible = false;
    session.shownAt = 0;
    session.dismissUntil = 0;
    session.tooltipInteractSent = false;
    session.mouseDownAt = 0;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/interaction/visibleRange.ts
// Visible-range / bar-spacing → CHART_INTERACTED analytics.
//
// Subscribes to TradingView's barSpacingChanged (zoom) and
// onVisibleRangeChanged (pan), debouncing each by 450ms and skipping pan
// events that fire within 500ms of a zoom (the same finger gesture often
// triggers both).
//
// Ported from chartLogic.js zoom/pan debounce code in onChartReady
// (~lines 5587-5661), trimmed of the legacy \`__mmSuppressChartInteractUntil\`
// suppression (which gated analytics during OHLCV reloads — we emit
// CHART_LAYOUT_SETTLED on each reload directly, so analytics can ignore
// that gate).


const DEBOUNCE_MS = 450;
const PAN_SKIP_AFTER_ZOOM_MS = 500;
const debounce = {
    zoomTimer: null,
    panTimer: null,
    zoomLastFiredAt: 0,
};
function fireZoom() {
    if (!getWidget() || !isChartReady())
        return;
    postToRN('CHART_INTERACTED', { interaction_type: 'zoom' });
    debounce.zoomLastFiredAt = Date.now();
}
function firePan() {
    if (!getWidget() || !isChartReady())
        return;
    if (Date.now() - debounce.zoomLastFiredAt < PAN_SKIP_AFTER_ZOOM_MS) {
        return;
    }
    postToRN('CHART_INTERACTED', { interaction_type: 'pan' });
}
function scheduleZoom() {
    if (debounce.zoomTimer)
        clearTimeout(debounce.zoomTimer);
    debounce.zoomTimer = setTimeout(() => {
        debounce.zoomTimer = null;
        fireZoom();
    }, DEBOUNCE_MS);
}
function schedulePan() {
    if (Date.now() - debounce.zoomLastFiredAt < PAN_SKIP_AFTER_ZOOM_MS)
        return;
    if (debounce.panTimer)
        clearTimeout(debounce.panTimer);
    debounce.panTimer = setTimeout(() => {
        debounce.panTimer = null;
        firePan();
    }, DEBOUNCE_MS);
}
/**
 * Subscribes zoom (barSpacingChanged) and pan (onVisibleRangeChanged) to the
 * debounced CHART_INTERACTED emitters. Safe to call once per chart-ready.
 */
function attachVisibleRangeListeners(chart) {
    try {
        chart.getTimeScale().barSpacingChanged().subscribe(null, scheduleZoom);
    }
    catch (error) {
        reportErrorToRN(error);
    }
    try {
        chart.onVisibleRangeChanged().subscribe(null, schedulePan);
    }
    catch (error) {
        reportErrorToRN(error);
    }
}
/** Test-only: reset the debounce state between cases. */
function __resetVisibleRangeForTests() {
    if (debounce.zoomTimer)
        clearTimeout(debounce.zoomTimer);
    if (debounce.panTimer)
        clearTimeout(debounce.panTimer);
    debounce.zoomTimer = null;
    debounce.panTimer = null;
    debounce.zoomLastFiredAt = 0;
}

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/bootstrap.ts
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












function readConfig() {
    const config = window.CONFIG;
    if (!config) {
        throw new Error('window.CONFIG is missing — AdvancedChartTemplate must inline ' +
            'CONFIG before chartLogic runs.');
    }
    return config;
}
/**
 * Phase 1 + 2 bootstrap. Returns the resolved CONFIG so callers (and tests)
 * can inspect what booted. Idempotent on its inbound subscription — the
 * WebView is not expected to bootstrap twice.
 */
function bootstrap() {
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
    loadLibrary_loadTradingViewLibrary(config.libraryUrl).catch((error) => {
        reportErrorToRN(error);
    });
    onFirstOhlcvData(() => {
        loadLibrary_loadTradingViewLibrary(config.libraryUrl)
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
                    }
                    catch (error) {
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

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/index.ts
// AdvancedChart WebView IIFE entry point.
//
// Evaluated at runtime inside the WebView after AdvancedChartTemplate has
// inlined window.CONFIG via a preceding <script> block. Calls bootstrap()
// to seed state, wire the RN bridge, register Phase 1 handlers, and begin
// loading the TradingView library.
//
// Future phases register their handlers / overlays / features inside their
// own modules; this file stays a thin entry point.


try {
    bootstrap();
}
catch (error) {
    reportErrorToRN(error);
}

var __webpack_export_target__ = self;
for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;`;
export default chartLogicString;
