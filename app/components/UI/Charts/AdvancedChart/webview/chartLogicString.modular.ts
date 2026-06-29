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
const state = {
    widget: null,
    isChartReady: false,
    currentSymbol: 'ASSET',
    currentResolution: '5',
    theme: null,
    libraryLoaded: false,
    libraryError: null,
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
    state.theme = null;
    state.libraryLoaded = false;
    state.libraryError = null;
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
function loadTradingViewLibrary(libraryUrl) {
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

;// CONCATENATED MODULE: ./app/components/UI/Charts/AdvancedChart/webview/src/core/bootstrap.ts
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




function readConfig() {
    const config = window.CONFIG;
    if (!config) {
        throw new Error('window.CONFIG is missing — AdvancedChartTemplate must inline ' +
            'CONFIG before chartLogic runs.');
    }
    return config;
}
/**
 * Phase 1 bootstrap. Returns the resolved CONFIG so callers (and tests) can
 * inspect what booted. Idempotent in the sense that the inbound listener is
 * a single subscription — the WebView is not expected to bootstrap twice.
 */
function bootstrap() {
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
