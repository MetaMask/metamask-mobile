/**
 * TradingView Chart WebView Logic
 *
 * Generic charting logic for TradingView Advanced Charts.
 * Embedded into the WebView HTML at runtime via chartLogicString.ts.
 *
 * CONFIG is injected before this script runs and contains:
 * - libraryUrl: string
 * - theme: { backgroundColor, borderColor, textColor, successColor, errorColor, primaryColor }
 * - lineChrome: { hideTimeScale, useCustomLineEndMarker, useCustomDashedLastPriceLine,
 *   useCustomPriceLabels }
 *   Single source of truth; `SET_LINE_CHROME` replaces it. Missing keys in old HTML fall back in
 *   `getLineChrome` via `LINE_CHROME_DEFAULTS`.
 */

// ============================================
// Global State
// ============================================
window.chartWidget = null;
window.ohlcvData = [];
window.currentSymbol = 'ASSET';
window.activeStudies = new Map();
window.positionShapeIds = [];
window.isChartReady = false;
window.pendingMessages = [];
window.libraryLoaded = false;
window.libraryError = null;
window.realtimeCallbacks = {};
/**
 * Pagination state for WebView-side direct fetching.
 * Populated by `SET_OHLCV_DATA` when `payload.pagination` is present.
 */
window.ohlcvPagination = {
  nextCursor: null,
  hasMore: false,
  assetId: null,
  vsCurrency: null,
};
/** Bumped on each `SET_OHLCV_DATA` so in-flight fetches from a previous series are discarded. */
window.ohlcvGeneration = 0;
/** Visible-range start (ms) from RN; used to clip bars on first load so the chart auto-fits correctly. */
window.visibleFromMs = null;
/** Visible-range end (ms) from RN; anchors the timeframe `to` to the last candle instead of Date.now(). */
window.visibleToMs = null;
// Default line chart (ChartType.Line === 2); RN SET_CHART_TYPE overrides when chart mounts.
window.currentChartType = 2;
window.lineLastPriceShapeId = null;
/** Bumped when `ohlcvData` is replaced or last bar changes; visible-range dot refresh ignores stale timers. */
window.lineChartOhlcvEpoch = 0;

/** Skip `CHART_INTERACTED` (zoom / pan) while data/layout updates run. */
window.__mmSuppressChartInteractUntil = 0;
/** One `CHART_INTERACTED` tooltip per crosshair session (until dismiss). */
window.__mmTooltipChartInteractSent = false;

function suppressChartUserInteraction(ms) {
  window.__mmSuppressChartInteractUntil = Date.now() + (ms || 600);
}

/**
 * When true, we defer `CHART_LAYOUT_SETTLED` until the datafeed delivers a post-reload response
 * (see `beginDeferredLayoutSettleAfterOhlcvReload`) or until the fallback timer fires.
 */
window.__mmLayoutSettlePending = false;
/** Return value of `setTimeout` for settle fallback; cleared when settle completes or aborts. */
window.__mmLayoutSettleFallbackTimer = null;

function bumpLineChartOhlcvEpoch() {
  window.lineChartOhlcvEpoch = (window.lineChartOhlcvEpoch || 0) + 1;
}

// ============================================
// Communication with React Native
// ============================================
function sendToReactNative(type, payload) {
  payload = payload || {};
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: type, payload: payload }),
    );
  }
}

/**
 * Posts `CHART_LAYOUT_SETTLED` to React Native so the native skeleton overlay can hide.
 *
 * Uses two nested `requestAnimationFrame` calls so the message runs after the browser has had a
 * chance to apply layout/paint from TradingView’s internal updates (with a `setTimeout` fallback
 * if rAF is unavailable).
 *
 * Does not apply chart scale or line overlays — callers that need that run
 * `applyChartScaleLayout` / `refreshLineChartOverlays` before invoking this (see
 * `tryCompleteLayoutSettleAfterDataCore`).
 */
function scheduleChartLayoutSettledNotify() {
  try {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.chartWidget && window.isChartReady) {
          sendToReactNative('CHART_LAYOUT_SETTLED', {});
        }
      });
    });
  } catch (e) {
    try {
      setTimeout(function () {
        if (window.chartWidget && window.isChartReady) {
          sendToReactNative('CHART_LAYOUT_SETTLED', {});
        }
      }, 48);
    } catch (e2) {}
  }
}

/** Milliseconds to wait if TradingView never calls `getBars` again after `resetData` (e.g. same-resolution cache). */
var LAYOUT_SETTLE_DATA_FALLBACK_MS = 400;

/**
 * Clears the WebView-side fallback timer that would force `CHART_LAYOUT_SETTLED` if data delivery
 * never completes. Safe to call when no timer is active.
 */
function clearMmLayoutSettleFallbackTimer() {
  if (window.__mmLayoutSettleFallbackTimer != null) {
    clearTimeout(window.__mmLayoutSettleFallbackTimer);
    window.__mmLayoutSettleFallbackTimer = null;
  }
}

/**
 * Performs the “real” layout settle: applies our scale/line overrides, then notifies RN.
 *
 * - No-ops if `__mmLayoutSettlePending` is false (idempotent / avoids double-fire).
 * - Clears the pending flag and the fallback timer, then runs `applyChartScaleLayout` and line
 *   overlays when applicable, then `scheduleChartLayoutSettledNotify`.
 */
function tryCompleteLayoutSettleAfterDataCore() {
  if (!window.__mmLayoutSettlePending) {
    return;
  }
  window.__mmLayoutSettlePending = false;
  clearMmLayoutSettleFallbackTimer();
  try {
    if (window.chartWidget && window.isChartReady) {
      applyChartScaleLayout(window.currentChartType);
      if (window.currentChartType === 2) {
        refreshLineChartOverlays();
      }
    }
  } catch (e) {}
  scheduleChartLayoutSettledNotify();
}

/**
 * Defers `tryCompleteLayoutSettleAfterDataCore` by two animation frames so TradingView can merge
 * the bars returned from `getBars` into the series before we tweak scale and tell RN to hide the
 * skeleton. Falls back to a short timeout if rAF throws.
 */
function queueTryCompleteLayoutSettleAfterData() {
  if (!window.__mmLayoutSettlePending) {
    return;
  }
  try {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tryCompleteLayoutSettleAfterDataCore();
      });
    });
  } catch (e) {
    setTimeout(tryCompleteLayoutSettleAfterDataCore, 32);
  }
}

/**
 * Starts the deferred settle lifecycle after `resetData()` / `setResolution` or before resolving a
 * deferred `getBars` (pagination).
 *
 * **Why:** Firing `CHART_LAYOUT_SETTLED` immediately after `resetData()` returns is too early —
 * TradingView often loads/refreshes series data asynchronously via `getBars`. RN then hides the
 * skeleton while the canvas is still empty or mid-transition (flicker).
 *
 * **Completion paths:**
 * 1. `getBars` invokes `onResult` with `periodParams.firstDataRequest === true` for this reload →
 *    `queueTryCompleteLayoutSettleAfterData`.
 * 2. `finishDeferredGetBars` (history pagination) calls the pending `onResult` → same queue.
 * 3. `LAYOUT_SETTLE_DATA_FALLBACK_MS` elapses without (1)/(2) → force complete (same-resolution edge).
 *
 * **Errors:** Use `abortDeferredLayoutSettleAndNotify` so RN never stays stuck with the skeleton on.
 */
function beginDeferredLayoutSettleAfterOhlcvReload() {
  clearMmLayoutSettleFallbackTimer();
  window.__mmLayoutSettlePending = true;
  window.__mmLayoutSettleFallbackTimer = setTimeout(function () {
    window.__mmLayoutSettleFallbackTimer = null;
    if (window.__mmLayoutSettlePending) {
      tryCompleteLayoutSettleAfterDataCore();
    }
  }, LAYOUT_SETTLE_DATA_FALLBACK_MS);
}

/**
 * Clears deferred state and always sends `CHART_LAYOUT_SETTLED` (e.g. `resetData` threw, `getBars`
 * error, or widget teardown). Ensures the native loading skeleton does not remain indefinitely.
 */
function abortDeferredLayoutSettleAndNotify() {
  window.__mmLayoutSettlePending = false;
  clearMmLayoutSettleFallbackTimer();
  scheduleChartLayoutSettledNotify();
}

// ============================================
// Message Handler
// ============================================
function handleMessage(event) {
  try {
    var message =
      typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

    if (!window.isChartReady && message.type !== 'SET_OHLCV_DATA') {
      window.pendingMessages.push(message);
      return;
    }

    switch (message.type) {
      case 'SET_OHLCV_DATA':
        handleSetOHLCVData(message.payload);
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
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

/** Mirrors `DEFAULT_LINE_CHROME` in AdvancedChart.types.ts (WebView cannot import RN modules). */
var LINE_CHROME_DEFAULTS = {
  hideTimeScale: false,
  useCustomLineEndMarker: true,
  useCustomDashedLastPriceLine: true,
  useCustomPriceLabels: true,
};

function lineChromePickBool(lc, key, fallback) {
  return lc[key] !== undefined ? !!lc[key] : fallback;
}

/**
 * Effective line chrome: `CONFIG.lineChrome` written by the HTML template and `SET_LINE_CHROME`.
 */
function getLineChrome() {
  var lc = (window.CONFIG && window.CONFIG.lineChrome) || {};
  return {
    hideTimeScale: lineChromePickBool(
      lc,
      'hideTimeScale',
      LINE_CHROME_DEFAULTS.hideTimeScale,
    ),
    useCustomLineEndMarker: lineChromePickBool(
      lc,
      'useCustomLineEndMarker',
      LINE_CHROME_DEFAULTS.useCustomLineEndMarker,
    ),
    useCustomDashedLastPriceLine: lineChromePickBool(
      lc,
      'useCustomDashedLastPriceLine',
      LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine,
    ),
    useCustomPriceLabels: lineChromePickBool(
      lc,
      'useCustomPriceLabels',
      LINE_CHROME_DEFAULTS.useCustomPriceLabels,
    ),
  };
}

/**
 * Normalizes RN `SET_LINE_CHROME` payload onto a full boolean quad; any missing key uses default.
 */
function resolveLineChromeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    hideTimeScale:
      payload.hideTimeScale !== undefined
        ? !!payload.hideTimeScale
        : LINE_CHROME_DEFAULTS.hideTimeScale,
    useCustomLineEndMarker:
      payload.useCustomLineEndMarker !== undefined
        ? !!payload.useCustomLineEndMarker
        : LINE_CHROME_DEFAULTS.useCustomLineEndMarker,
    useCustomDashedLastPriceLine:
      payload.useCustomDashedLastPriceLine !== undefined
        ? !!payload.useCustomDashedLastPriceLine
        : LINE_CHROME_DEFAULTS.useCustomDashedLastPriceLine,
    useCustomPriceLabels:
      payload.useCustomPriceLabels !== undefined
        ? !!payload.useCustomPriceLabels
        : LINE_CHROME_DEFAULTS.useCustomPriceLabels,
  };
}

function handleSetLineChrome(payload) {
  var resolved = resolveLineChromeFromPayload(payload);
  if (!resolved) {
    return;
  }
  window.CONFIG = window.CONFIG || {};
  window.CONFIG.lineChrome = resolved;
  if (!resolved.useCustomLineEndMarker) {
    clearLineEndDotVisibleRangeDebounce();
  }
  if (!resolved.useCustomPriceLabels) {
    window.lastCloseLabelScheduled = false;
  }
  if (!window.isChartReady || !window.chartWidget) {
    return;
  }
  applyChartScaleLayout(window.currentChartType);
  if (window.currentChartType === 2) {
    refreshLineChartOverlays();
  } else if (window.currentChartType === 1) {
    if (getLineChrome().useCustomDashedLastPriceLine) {
      createLastPriceLine();
    } else {
      removeAllLastPriceHorizontalOverlays({
        hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
      });
      scheduleLastCloseLabelUpdate();
    }
  }
}

// ============================================
// Data Handlers
// ============================================
var INTERVAL_MS_TO_TV = {
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

function detectResolution(data) {
  if (data.length < 2) return '5';
  // Use median of first few diffs to avoid gaps skewing the result
  var diffs = [];
  var len = Math.min(data.length - 1, 10);
  for (var i = 0; i < len; i++) {
    diffs.push(data[i + 1].time - data[i].time);
  }
  diffs.sort(function (a, b) {
    return a - b;
  });
  var median = diffs[Math.floor(diffs.length / 2)];

  // Find closest match
  var keys = Object.keys(INTERVAL_MS_TO_TV);
  var best = '5';
  var bestDist = Infinity;
  for (var k = 0; k < keys.length; k++) {
    var d = Math.abs(Number(keys[k]) - median);
    if (d < bestDist) {
      bestDist = d;
      best = INTERVAL_MS_TO_TV[keys[k]];
    }
  }
  return best;
}

function handleSetOHLCVData(payload) {
  if (!payload || !payload.data || payload.data.length === 0) return;

  suppressChartUserInteraction(700);

  window.ohlcvData = payload.data;
  bumpLineChartOhlcvEpoch();
  window.ohlcvGeneration++;

  if (payload.pagination) {
    window.ohlcvPagination = {
      nextCursor: payload.pagination.nextCursor || null,
      hasMore: !!payload.pagination.hasMore,
      assetId: payload.pagination.assetId || null,
      vsCurrency: payload.pagination.vsCurrency || null,
    };
  } else {
    window.ohlcvPagination = {
      nextCursor: null,
      hasMore: false,
      assetId: null,
      vsCurrency: null,
    };
  }

  var visibleFromMs =
    payload.visibleFromMs != null ? payload.visibleFromMs : null;
  window.visibleFromMs = visibleFromMs;

  var visibleToMs = payload.visibleToMs != null ? payload.visibleToMs : null;
  window.visibleToMs = visibleToMs;

  var newResolution = detectResolution(window.ohlcvData);

  function scheduleVisibleRangeAfterDataLoad(chart) {
    if (visibleFromMs == null) return;
    var capturedGeneration = window.ohlcvGeneration;
    var sub = chart.onDataLoaded();
    sub.subscribe(null, function onLoaded() {
      sub.unsubscribe(null, onLoaded);
      if (capturedGeneration !== window.ohlcvGeneration) {
        return;
      }
      var fromSec = Math.floor(visibleFromMs / 1000);
      var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
      var toSec = lastBar
        ? Math.ceil(lastBar.time / 1000)
        : Math.ceil(Date.now() / 1000);
      try {
        chart.setVisibleRange(
          { from: fromSec, to: toSec },
          { percentRightMargin: 0 },
        );
      } catch (e) {
        // setVisibleRange can fail if chart is mid-teardown
      }
    });
  }

  if (window.chartWidget && window.isChartReady) {
    var previousResolution = window.currentResolution;
    window.currentResolution = newResolution;

    try {
      var chart = window.chartWidget.activeChart();
      if (previousResolution !== newResolution) {
        chart.setResolution(newResolution, function () {
          try {
            chart.resetData();
            beginDeferredLayoutSettleAfterOhlcvReload();
            scheduleVisibleRangeAfterDataLoad(chart);
          } catch (eR) {
            abortDeferredLayoutSettleAndNotify();
            return;
          }
        });
      } else {
        try {
          chart.resetData();
          beginDeferredLayoutSettleAfterOhlcvReload();
          scheduleVisibleRangeAfterDataLoad(chart);
        } catch (e) {
          abortDeferredLayoutSettleAndNotify();
          return;
        }
      }
    } catch (e) {
      abortDeferredLayoutSettleAndNotify();
      window.chartWidget.remove();
      window.chartWidget = null;
      window.isChartReady = false;
      window.activeStudies = new Map();
      window.volumeStudyId = null;
      window.volumeIsOverlay = null;
      window.lastPriceShapeId = null;
      window.lineEndDotShapeId = null;
      window.lineLastPriceShapeId = null;
      window.positionShapeIds = [];
      window.realtimeCallbacks = {};
      window.currentChartType = 2;
      initChart();
    }
  } else if (window.chartWidget && !window.isChartReady) {
    window.currentResolution = newResolution;
  } else if (!window.chartWidget) {
    window.currentResolution = newResolution;
    libraryLoadAttempts = 0;
    initChart();
  }
}

// ============================================
// Realtime Update Handler
// ============================================
function handleRealtimeUpdate(payload) {
  if (!payload || !payload.bar) return;

  var bar = payload.bar;

  // Append or update the last bar in the local data store
  if (window.ohlcvData.length > 0) {
    var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
    if (lastBar.time === bar.time) {
      window.ohlcvData[window.ohlcvData.length - 1] = bar;
    } else {
      window.ohlcvData.push(bar);
    }
  } else {
    window.ohlcvData.push(bar);
  }
  bumpLineChartOhlcvEpoch();

  // Forward to all active TradingView subscribeBars callbacks
  var tick = {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
  var guids = Object.keys(window.realtimeCallbacks);
  for (var i = 0; i < guids.length; i++) {
    window.realtimeCallbacks[guids[i]](tick);
  }

  // Update price indicators based on current chart type
  if (window.currentChartType === 2) {
    refreshLineChartOverlays();
  } else if (window.currentChartType === 1) {
    ensureNoLineChartEndIcons();
    if (getLineChrome().useCustomDashedLastPriceLine) {
      createLastPriceLine();
    } else {
      removeAllLastPriceHorizontalOverlays({
        hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
      });
      scheduleLastCloseLabelUpdate();
    }
  }
}

// ============================================
// Indicator Handlers
//
// Curated subset for Token Details mobile UX. Consumers needing the full
// TradingView study picker can re-enable header_widget via disabledFeatures
// prop, which exposes TradingView's native indicator UI.
// ============================================
function isOwnStringKey(key) {
  return (
    typeof key === 'string' &&
    key !== '__proto__' &&
    key !== 'constructor' &&
    key !== 'prototype'
  );
}

function handleAddIndicator(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || !payload.name) return;

  var indicatorName = payload.name;
  if (!isOwnStringKey(indicatorName)) return;

  if (window.activeStudies.has(indicatorName)) {
    return;
  }

  try {
    var chart = window.chartWidget.activeChart();
    var studyName, inputs;

    switch (indicatorName) {
      case 'MACD':
        studyName = 'MACD';
        inputs = { in_0: 12, in_1: 26, in_2: 9 };
        break;
      case 'RSI':
        studyName = 'Relative Strength Index';
        inputs = { in_0: 14 };
        break;
      case 'MA200':
        studyName = 'Moving Average';
        inputs = { in_0: 200 };
        break;
      default:
        studyName = indicatorName;
        inputs = payload.inputs || {};
        break;
    }

    chart
      .createStudy(studyName, false, false, inputs)
      .then(function (studyId) {
        window.activeStudies.set(indicatorName, studyId);
        sendToReactNative('INDICATOR_ADDED', {
          name: indicatorName,
          id: String(studyId),
        });
      })
      .catch(function (error) {
        sendToReactNative('ERROR', {
          message: 'Failed to add indicator: ' + error.message,
        });
      });
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

function handleRemoveIndicator(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || !payload.name) return;

  var indicatorName = payload.name;
  if (!isOwnStringKey(indicatorName)) return;
  if (!window.activeStudies.has(indicatorName)) return;

  var studyId = window.activeStudies.get(indicatorName);
  if (!studyId) return;

  try {
    var chart = window.chartWidget.activeChart();
    chart.removeEntity(studyId);
    window.activeStudies.delete(indicatorName);
    sendToReactNative('INDICATOR_REMOVED', { name: indicatorName });
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

// ============================================
// Series Color Helper
// ============================================
function generatePaletteShades(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var shades = [];
  for (var i = 0; i < 19; i++) {
    var t = i / 18;
    var sr, sg, sb;
    if (t < 0.5) {
      var f = 1 - t * 2;
      sr = Math.round(r + (255 - r) * f);
      sg = Math.round(g + (255 - g) * f);
      sb = Math.round(b + (255 - b) * f);
    } else {
      var f2 = (t - 0.5) * 2;
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

// ============================================
// Chart Type Handler
// ============================================

/**
 * Series stroke colors only (no scale chrome). Scale layout is applyChartScaleLayout.
 */
function applySeriesColors() {
  if (!window.chartWidget) return;
  var color = window.CONFIG.theme.successColor;
  try {
    window.chartWidget.applyOverrides(getSeriesColorOverrides(color));
    var series = window.chartWidget.activeChart().getSeries();
    series.setChartStyleProperties(2, {
      color: color,
      colorType: 'solid',
      linewidth: 2,
    });
    series.setChartStyleProperties(10, {
      topLineColor: color,
      bottomLineColor: color,
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  } catch (e) {}
}

/**
 * Pin main series to the right price scale (line and candles).
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ISeriesApi/
 */
function syncMainSeriesToRightScale() {
  if (!window.chartWidget || !window.isChartReady) return;
  try {
    window.chartWidget.activeChart().getSeries().detachToRight();
  } catch (e) {}
}

/**
 * setChartType() can reset scale attachment — re-apply right scale + time-scale offset for line
 * (right offset keeps the end dot off the edge).
 */
function scheduleLineChartLayoutReflow() {
  if (window.currentChartType !== 2 || !window.chartWidget) return;
  function run() {
    if (!window.chartWidget || window.currentChartType !== 2) return;
    try {
      syncMainSeriesToRightScale();
      syncTimeScaleRightMargin(true);
    } catch (e) {}
  }
  try {
    requestAnimationFrame(run);
  } catch (e) {
    setTimeout(run, 0);
  }
  setTimeout(run, 120);
}

function applyChartScaleLayout(type) {
  if (!window.chartWidget) return;

  var theme = window.CONFIG.theme;
  var isLineChart = type === 2;
  var lc = getLineChrome();
  var useCustomLabels = lc.useCustomPriceLabels;
  var useCustomDashed = lc.useCustomDashedLastPriceLine;
  /** Match pane background so time/price scale rules disappear; labels use textColor above. */
  var axisLineColor = theme.backgroundColor || '#131416';

  try {
    window.chartWidget.applyOverrides({
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
      'paneProperties.topMargin': 8,
      // Same margin in both modes so scale padding (and logo anchor) does not shift on toggle.
      'paneProperties.bottomMargin': 8,
    });
  } catch (e) {}

  removeLineChartMarkupStyle();
  syncMainSeriesToRightScale();
  syncTimeScaleRightMargin(isLineChart);
  if (isLineChart) {
    scheduleLineChartLayoutReflow();
  }
  applyChartContainerOverflowUnclip();
  scheduleChartDomUnclip();
  updateCandleVolumeScaleColumnVisibility();
  applyHidePriceScaleModeButtons();
  applyLineTimeScaleVisibility(
    window.currentChartType === 2 ? lc.hideTimeScale : false,
  );
  if (!useCustomLabels) {
    hideCustomCrosshairLabels();
  } else {
    scheduleLastCloseLabelUpdate();
  }
}

/**
 * Subscript helpers for tiny prices — mirrors app/util/number/subscriptNotation.ts.
 * This file is injected as a standalone script string in the chart WebView (see chartLogicString.ts),
 * not executed in the Metro/RN bundle, so we cannot import or require the shared TS module.
 */
var SUBSCRIPT_DIGITS_CROSSHAIR = [
  '₀',
  '₁',
  '₂',
  '₃',
  '₄',
  '₅',
  '₆',
  '₇',
  '₈',
  '₉',
];

function toSubscriptDigitsCrosshair(n) {
  return String(n)
    .split('')
    .map(function (digit) {
      return SUBSCRIPT_DIGITS_CROSSHAIR[parseInt(digit, 10)];
    })
    .join('');
}

function formatSubscriptNotationCrosshair(abs) {
  if (abs > 0 && abs < 0.0001) {
    var priceStr = abs.toFixed(20);
    var match = priceStr.match(/^0\.0*([1-9]\d*)/);
    if (match) {
      var leadingZeros = priceStr.indexOf(match[1]) - 2;
      if (leadingZeros >= 4) {
        var sig = match[1];
        var significantDigits =
          sig.slice(0, 4).replace(/0{1,4}$/, '') || sig.slice(0, 2);
        return (
          '0.0' + toSubscriptDigitsCrosshair(leadingZeros) + significantDigits
        );
      }
    }
  }
  return null;
}

/**
 * Custom crosshair labels (DOM overlay in #chart_surface; built-in TV labels disabled).
 * Number only — no currency symbol.
 */
function formatCrosshairPrice(price) {
  if (price === undefined || price === null || isNaN(Number(price))) {
    return '';
  }
  var p = Number(price);
  if (p === 0) {
    return '0.00';
  }
  var abs = Math.abs(p);
  var sub = formatSubscriptNotationCrosshair(abs);
  if (sub) {
    return p < 0 ? '-' + sub : sub;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: abs >= 1 ? 2 : 4,
  }).format(p);
}

function formatCrosshairTime(timeSeconds) {
  if (
    timeSeconds === undefined ||
    timeSeconds === null ||
    isNaN(Number(timeSeconds))
  ) {
    return '';
  }
  var d = new Date(Number(timeSeconds) * 1000);
  var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = [
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
  var w = weekdays[d.getDay()];
  var day = d.getDate();
  var mo = months[d.getMonth()];
  var y = String(d.getFullYear()).slice(-2);
  var h = String(d.getHours());
  var min = String(d.getMinutes());
  if (h.length < 2) {
    h = '0' + h;
  }
  if (min.length < 2) {
    min = '0' + min;
  }
  return w + ' ' + day + ' ' + mo + " '" + y + ' ' + h + ':' + min;
}

function hideCustomCrosshairLabels() {
  var elP = document.getElementById('crosshair-price-label');
  var elT = document.getElementById('crosshair-time-label');
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

/**
 * X (px from #custom-crosshair-overlay left) of the **left** edge of the main pane’s
 * `.price-axis-container` (smallest `top` = main chart price scale). Same as where the plot
 * ends; scale legend text starts inside this column, not on the plot side.
 */
function getMainPriceAxisLeftRelativeToOverlay(overlay) {
  if (!overlay || !overlay.getBoundingClientRect) {
    return null;
  }
  var orect = overlay.getBoundingClientRect();
  var bestLeft = null;
  var bestTop = Infinity;
  eachChartDocument(function (doc) {
    var nodes = doc.querySelectorAll('.price-axis-container');
    var i;
    for (i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect();
      if (r.width < 2 || r.height < 16) {
        continue;
      }
      if (r.top < bestTop) {
        bestTop = r.top;
        bestLeft = r.left - orect.left;
      }
    }
  });
  if (bestLeft === null || isNaN(bestLeft)) {
    return null;
  }
  var maxW = overlay.clientWidth;
  if (maxW <= 0) {
    return null;
  }
  return Math.max(0, Math.min(bestLeft, maxW));
}

/**
 * Place crosshair / last-close pills with the **left** edge on the main-chart / price-scale
 * boundary (same X as `getMainPriceAxisLeftRelativeToOverlay`). TradingView’s horizontal
 * crosshair line ends there; anchoring the pill here removes the gap vs right-aligning to
 * legend text (narrow pills like “1.00” sat too far right).
 */
function positionPricePillAtPlotPriceBoundary(el, overlay, yPx) {
  if (!el) {
    return;
  }
  el.style.top = yPx + 'px';
  if (!overlay) {
    el.style.left = 'auto';
    el.style.right = '0';
    el.style.transform = 'translateY(-50%)';
    return;
  }
  var boundaryLeft = getMainPriceAxisLeftRelativeToOverlay(overlay);
  if (boundaryLeft !== null && !isNaN(boundaryLeft) && boundaryLeft >= 0) {
    var w = el.offsetWidth;
    if (!w || w <= 0) {
      w = 0;
    }
    var pillLeft = boundaryLeft + 2; // Adding 2px to the boundary left to ensure the pill is not too close to the boundary.
    var maxW = overlay.clientWidth;
    if (maxW > 0) {
      pillLeft = Math.max(0, Math.min(pillLeft, maxW - w));
    }
    el.style.left = pillLeft + 'px';
    el.style.right = 'auto';
    el.style.transform = 'translateY(-50%)';
  } else {
    el.style.left = 'auto';
    el.style.right = '0';
    el.style.transform = 'translateY(-50%)';
  }
}

function updateCustomCrosshairLabels(params) {
  var elP = document.getElementById('crosshair-price-label');
  var elT = document.getElementById('crosshair-time-label');
  var overlay = document.getElementById('custom-crosshair-overlay');
  if (!elP || !elT || !overlay) {
    return;
  }
  if (!getLineChrome().useCustomPriceLabels) {
    hideCustomCrosshairLabels();
    return;
  }
  var ox = params.offsetX;
  var oy = params.offsetY;
  if (ox === undefined || oy === undefined || isNaN(ox) || isNaN(oy)) {
    hideCustomCrosshairLabels();
    return;
  }
  elP.textContent = formatCrosshairPrice(params.price);
  var tSec =
    params.userTime !== undefined && params.userTime !== null
      ? params.userTime
      : params.time;
  elT.textContent = formatCrosshairTime(tSec);
  elP.style.display = 'flex';
  elT.style.display = 'flex';
  function positionPricePill() {
    positionPricePillAtPlotPriceBoundary(elP, overlay, oy);
  }
  positionPricePill();
  try {
    requestAnimationFrame(positionPricePill);
  } catch (e) {}
  /* Time label: left + translateX(-50%) → center at crosshair X; remeasure after layout. */
  var ow = overlay.clientWidth;
  function positionTimeLabel() {
    var tw = elT.offsetWidth;
    var halfTw = tw / 2;
    var clampedOx = Math.max(halfTw, Math.min(ox, ow - halfTw));
    elT.style.left = clampedOx + 'px';
    elT.style.transform = 'translateX(-50%)';
  }
  positionTimeLabel();
  try {
    requestAnimationFrame(positionTimeLabel);
  } catch (e) {}
}

// --- Last close price pill (same layout as crosshair labels in AdvancedChartTemplate) ---
window.lastCloseLabelScheduled = false;

/**
 * Coalesces DOM updates for the right-axis price pills into one animation frame so pan/zoom bursts
 * do not thrash layout. Updates: (1) filled last-close, (2) optional outline visible-edge pill.
 */
function scheduleLastCloseLabelUpdate() {
  if (!getLineChrome().useCustomPriceLabels) {
    return;
  }
  if (window.lastCloseLabelScheduled) {
    return;
  }
  window.lastCloseLabelScheduled = true;
  try {
    requestAnimationFrame(function () {
      window.lastCloseLabelScheduled = false;
      /*
       * 1) Filled last-close: candle or line when useCustomPriceLabels.
       * 2) Outline visible-edge: second pill when tail is off-screen (same flag).
       */
      updateLastClosePriceLabel();
      updateVisibleEdgeOutlinePriceLabel();
    });
  } catch (e) {
    window.lastCloseLabelScheduled = false;
    setTimeout(function () {
      updateLastClosePriceLabel();
      updateVisibleEdgeOutlinePriceLabel();
    }, 0);
  }
}

function hideLastClosePriceLabelDom() {
  var el = document.getElementById('last-close-price-label');
  if (el) {
    el.style.display = 'none';
    el.style.left = '';
    el.style.right = '';
    el.style.transform = '';
  }
}

/**
 * Hides the outline pill and clears inline positioning set by `positionPricePillAtPlotPriceBoundary`.
 * Safe to call when the DOM node is missing (older cached HTML).
 */
function hideCustomSeriesLastValueLabelDom() {
  var elC = document.getElementById('custom-series-last-value-label');
  if (elC) {
    elC.style.display = 'none';
    elC.style.left = '';
    elC.style.right = '';
    elC.style.transform = '';
    elC.style.borderColor = '';
    elC.style.color = '';
  }
}

/**
 * Updates `#custom-series-last-value-label`: **close price of the rightmost OHLCV bar whose time
 * still lies inside the chart’s visible bars range**, positioned on the price scale like the
 * last-close pill. Shown only when:
 * - `getLineChrome().useCustomPriceLabels`, and
 * - chart is ready with data, and
 * - chart type is candle or line, and
 * - the **series tail** (latest bar) is **not** in the visible time window (e.g. user panned left),
 * - and we successfully resolve a visible-edge bar and a Y coordinate.
 *
 * When the outline’s chart Y would overlap the filled last-close pill, nudges the outline
 * **up or down** (smaller vs larger Y) so the higher price stays above the lower on the pane.
 *
 * Candlestick: outline border + text use theme success (close >= open) or error (down bar).
 * Line chart: success color only (matches single-series stroke).
 */
function updateVisibleEdgeOutlinePriceLabel() {
  var elOut = document.getElementById('custom-series-last-value-label');
  if (!elOut) {
    return;
  }
  var w = window;
  if (
    !getLineChrome().useCustomPriceLabels ||
    !w.chartWidget ||
    !w.isChartReady ||
    !w.ohlcvData ||
    !w.ohlcvData.length
  ) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  var ct = w.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  var chart = w.chartWidget.activeChart();
  var tailBar = w.ohlcvData[w.ohlcvData.length - 1];
  if (isSeriesTailBarTimeVisibleOnChart(chart, tailBar.time)) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  var edgeBar = getRightmostOhlcvBarInVisibleTimeRange(chart, w.ohlcvData);
  if (!edgeBar) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  var price = edgeBar.close;
  var y = getPriceYForLastCloseOverlay(chart, price);
  if (y === null || y === undefined || isNaN(y)) {
    elOut.style.display = 'none';
    elOut.style.borderColor = '';
    elOut.style.color = '';
    return;
  }
  var lastBarClose = w.ohlcvData[w.ohlcvData.length - 1];
  var resolvedLast = resolveLineEndOverlayPoint(chart);
  var lastClosePrice =
    resolvedLast && isFinite(resolvedLast.price)
      ? resolvedLast.price
      : lastBarClose.close;
  var yLastClose = getPriceYForLastCloseOverlay(chart, lastClosePrice);

  var theme = (w.CONFIG && w.CONFIG.theme) || {};
  var upColor = theme.successColor || '#0C9F76';
  var downColor = theme.errorColor || '#E06470';
  var outlineColor = upColor;
  if (ct === 1) {
    var o = Number(edgeBar.open);
    var c = Number(edgeBar.close);
    if (isFinite(o) && isFinite(c) && c < o) {
      outlineColor = downColor;
    }
  }
  elOut.style.borderColor = outlineColor;
  elOut.style.color = outlineColor;
  elOut.textContent = formatCrosshairPrice(price);
  elOut.style.display = 'flex';
  var overlayOut = document.getElementById('custom-crosshair-overlay');

  var yPos = y;
  positionPricePillAtPlotPriceBoundary(elOut, overlayOut, yPos);
  var gapPx = 4;
  var elLast = document.getElementById('last-close-price-label');
  var hO = elOut.offsetHeight;
  if (!hO || hO < 8) {
    hO = 24;
  }
  if (
    elLast &&
    elLast.style.display !== 'none' &&
    elLast.offsetHeight > 0 &&
    yLastClose !== null &&
    yLastClose !== undefined &&
    !isNaN(yLastClose)
  ) {
    var hF = elLast.offsetHeight;
    var half = (hF + hO) / 2 + gapPx;
    if (Math.abs(y - yLastClose) < half) {
      var minCenter = hO / 2 + 2;
      var maxCenter =
        overlayOut && overlayOut.clientHeight > 0
          ? overlayOut.clientHeight - hO / 2 - 2
          : Infinity;
      var edgeAboveFilled =
        y < yLastClose ||
        (Math.abs(y - yLastClose) < 1 &&
          Number(price) > Number(lastClosePrice));
      if (edgeAboveFilled) {
        yPos = yLastClose - hF / 2 - gapPx - hO / 2;
        if (yPos < minCenter) {
          yPos = minCenter;
        }
      } else {
        yPos = yLastClose + hF / 2 + gapPx + hO / 2;
        if (yPos > maxCenter) {
          yPos = Math.max(minCenter, maxCenter);
        }
      }
      positionPricePillAtPlotPriceBoundary(elOut, overlayOut, yPos);
    }
  }
}

/**
 * Y pixel for a price (same space as crosshair `offsetY`). Uses
 * `priceToCoordinate` / `priceToPixels` when present; else visible range → pane height.
 */
function getPriceYForLastCloseOverlay(chart, price) {
  if (!chart || price === undefined || price === null || isNaN(Number(price))) {
    return null;
  }
  var p = Number(price);
  try {
    var panes = chart.getPanes();
    if (!panes || !panes.length) return null;
    var pane = panes[0];
    var scale = pane.getMainSourcePriceScale();
    if (!scale) return null;

    var y;
    if (typeof scale.priceToCoordinate === 'function') {
      y = scale.priceToCoordinate(p);
    } else if (typeof scale.priceToPixels === 'function') {
      y = scale.priceToPixels(p);
    }
    if (y !== null && y !== undefined && !isNaN(y)) return y;

    var range = scale.getVisiblePriceRange();
    if (!range || range.from === undefined || range.to === undefined) {
      return null;
    }
    var lo = Math.min(range.from, range.to);
    var hi = Math.max(range.from, range.to);
    if (p < lo || p > hi) return null;
    var h = pane.getHeight();
    if (!h || h <= 0) return null;
    return ((hi - p) / (hi - lo)) * h;
  } catch (e) {
    return null;
  }
}

/**
 * Last-close DOM pill when `useCustomPriceLabels` (candle or line).
 * Stays visible alongside the crosshair price pill (crosshair stacks above when Y aligns).
 */
function updateLastClosePriceLabel() {
  var el = document.getElementById('last-close-price-label');
  if (!el) {
    return;
  }
  var w = window;
  if (!getLineChrome().useCustomPriceLabels) {
    hideLastClosePriceLabelDom();
    return;
  }
  if (
    !w.chartWidget ||
    !w.isChartReady ||
    !w.ohlcvData ||
    !w.ohlcvData.length
  ) {
    hideLastClosePriceLabelDom();
    return;
  }
  var ct = w.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideLastClosePriceLabelDom();
    return;
  }
  var lastBar = w.ohlcvData[w.ohlcvData.length - 1];
  var chart = w.chartWidget.activeChart();
  var resolved = resolveLineEndOverlayPoint(chart);
  var labelPrice =
    resolved && isFinite(resolved.price) ? resolved.price : lastBar.close;
  var y = getPriceYForLastCloseOverlay(chart, labelPrice);
  if (y === null || y === undefined || isNaN(y)) {
    el.style.display = 'none';
    return;
  }
  el.textContent = formatCrosshairPrice(labelPrice);
  el.style.display = 'flex';
  var overlay = document.getElementById('custom-crosshair-overlay');
  positionPricePillAtPlotPriceBoundary(el, overlay, y);
}

/**
 * Debounced line-end icon refresh when the time scale pans. Uses `lineChartOhlcvEpoch` so a burst
 * of `onVisibleRangeChanged` during interval switches does not run after newer `SET_OHLCV_DATA`.
 */
var lineEndDotVisibleRangeDebounce = null;

/** Clears pending visible-range debounce so no `refreshLineEndDot` runs after chrome turns off. */
function clearLineEndDotVisibleRangeDebounce() {
  if (lineEndDotVisibleRangeDebounce) {
    clearTimeout(lineEndDotVisibleRangeDebounce);
    lineEndDotVisibleRangeDebounce = null;
  }
}

function scheduleLineEndDotAfterVisibleRangeChange() {
  if (window.currentChartType !== 2) {
    return;
  }
  if (!getLineChrome().useCustomLineEndMarker) {
    return;
  }
  if (lineEndDotVisibleRangeDebounce) {
    clearTimeout(lineEndDotVisibleRangeDebounce);
  }
  var epochAtSchedule = window.lineChartOhlcvEpoch;
  lineEndDotVisibleRangeDebounce = setTimeout(function () {
    lineEndDotVisibleRangeDebounce = null;
    if (window.lineChartOhlcvEpoch !== epochAtSchedule) {
      return;
    }
    if (
      window.currentChartType !== 2 ||
      !window.chartWidget ||
      !window.isChartReady
    ) {
      return;
    }
    try {
      var chart = window.chartWidget.activeChart();
      if (chart && typeof chart.dataReady === 'function') {
        chart.dataReady(function () {
          if (window.lineChartOhlcvEpoch !== epochAtSchedule) {
            return;
          }
          refreshLineEndDot();
        });
      } else {
        refreshLineEndDot();
      }
    } catch (e) {}
  }, 150);
}

/**
 * Subscribes to anything that changes the visible price level or time window so both the filled
 * last-close pill and the optional outline “visible edge” pill stay aligned with the chart.
 */
function subscribeLastCloseLabelUpdates() {
  if (!window.chartWidget) return;
  var tick = scheduleLastCloseLabelUpdate;
  function tickIfCustomPriceLabels() {
    if (getLineChrome().useCustomPriceLabels) {
      tick();
    }
  }
  try {
    window.chartWidget.subscribe('series_event', function (ev) {
      if (ev === 'price_scale_changed') tickIfCustomPriceLabels();
    });
  } catch (e) {}
  try {
    window.chartWidget.subscribe(
      'panes_height_changed',
      tickIfCustomPriceLabels,
    );
  } catch (e) {}
  try {
    window.chartWidget
      .activeChart()
      .onVisibleRangeChanged()
      .subscribe(null, function () {
        tickIfCustomPriceLabels();
        if (getLineChrome().useCustomLineEndMarker) {
          scheduleLineEndDotAfterVisibleRangeChange();
        }
      });
  } catch (e) {}
}

/**
 * Line chart: small right gap so the end dot isn’t flush/clipped against the pane edge.
 * Candle: small offset so createLastPriceLine isn’t clipped at the Y-axis.
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ITimeScaleApi/
 */
var LINE_CHART_RIGHT_OFFSET_BARS = 3;
var CANDLE_CHART_RIGHT_GAP_BARS = 3;

function syncTimeScaleRightMargin(isLineChart) {
  if (!window.chartWidget) return;
  try {
    var ts = window.chartWidget.activeChart().getTimeScale();
    ts.usePercentageRightOffset().setValue(false);
    var gap =
      window.visibleFromMs != null
        ? LINE_CHART_RIGHT_OFFSET_BARS
        : isLineChart
          ? LINE_CHART_RIGHT_OFFSET_BARS
          : CANDLE_CHART_RIGHT_GAP_BARS;
    ts.defaultRightOffset().setValue(gap);
    ts.setRightOffset(gap);
  } catch (e) {}
}

/**
 * TradingView adds `chart-markup-table` to the root and to inner cells; `querySelector('.chart-markup-table')`
 * can return an inner node — pick the outer wrapper.
 */
function findOuterChartMarkupTable(doc) {
  if (!doc || !doc.querySelectorAll) {
    return null;
  }
  var list = doc.querySelectorAll('.chart-markup-table');
  var i;
  var el;
  var cn;
  for (i = 0; i < list.length; i++) {
    el = list[i];
    cn = el.className && String(el.className);
    if (el.classList.contains('pane')) {
      continue;
    }
    if (cn.indexOf('price-axis-container') !== -1) {
      continue;
    }
    if (cn.indexOf('time-axis') !== -1) {
      continue;
    }
    return el;
  }
  return list.length ? list[0] : null;
}

/** Run fn(document) and fn(iframe.contentDocument) when the chart lives in TV’s same-origin iframe. */
function eachChartDocument(fn) {
  try {
    fn(document);
  } catch (e) {}
  try {
    var container = document.getElementById('tv_chart_container');
    var iframe = container && container.querySelector('iframe');
    if (iframe && iframe.contentDocument) {
      fn(iframe.contentDocument);
    }
  } catch (e2) {}
}

var TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;

function isTradingViewExternalHostname(hostname) {
  if (!hostname) return false;
  var h = String(hostname).toLowerCase();
  return (
    h === 'tradingview.com' ||
    h === 'www.tradingview.com' ||
    /\.tradingview\.com$/.test(h)
  );
}

function isTradingViewExternalHref(href) {
  if (!href) return false;
  try {
    var base =
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : 'https://localhost/';
    var u = new URL(href, base);
    return isTradingViewExternalHostname(u.hostname);
  } catch (e) {
    return false;
  }
}

/**
 * Same-origin chart iframe + Android: WebView often skips shouldOverrideUrlLoading for subframes.
 * Intercept window.open + real <a> navigations here and let RN open the browser (deduped there).
 */
function installTradingViewExternalOpenBridge() {
  function sendTvClicked(url) {
    sendToReactNative('CHART_TRADINGVIEW_CLICKED', url ? { url: url } : {});
  }

  function handleTradingViewLinkCapture(ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== 'function') {
      return;
    }
    var a = t.closest('a');
    if (!a || !a.href || !isTradingViewExternalHref(a.href)) {
      return;
    }
    var now = Date.now();
    if (
      now - (window.__mmLastTvExternalBridgeAt || 0) <
      TV_EXTERNAL_BRIDGE_DEBOUNCE_MS
    ) {
      return;
    }
    window.__mmLastTvExternalBridgeAt = now;
    try {
      ev.preventDefault();
      ev.stopPropagation();
    } catch (e1) {}
    sendTvClicked(a.href);
  }

  function patchWindowOpen(win) {
    if (!win || !win.open || win.__mmTvOpenPatched) {
      return;
    }
    win.__mmTvOpenPatched = true;
    var origOpen = win.open.bind(win);
    win.open = function (url, name, specs) {
      if (url != null && url !== '' && isTradingViewExternalHref(String(url))) {
        var now2 = Date.now();
        if (
          now2 - (window.__mmLastTvExternalBridgeAt || 0) <
          TV_EXTERNAL_BRIDGE_DEBOUNCE_MS
        ) {
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
    eachChartDocument(function (doc) {
      try {
        patchWindowOpen(doc.defaultView);
      } catch (e2) {}
      if (doc && doc.addEventListener && !doc.__mmTvLinkCaptureInstalled) {
        doc.__mmTvLinkCaptureInstalled = true;
        doc.addEventListener('click', handleTradingViewLinkCapture, true);
      }
    });
  }

  applyAll();
  try {
    var container = document.getElementById('tv_chart_container');
    var iframe = container && container.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', applyAll);
    }
  } catch (e3) {}
  setTimeout(applyAll, 200);
  setTimeout(applyAll, 800);
  setTimeout(applyAll, 2000);
}

function removeInjectedStyleByIdFromChartDocs(styleId) {
  eachChartDocument(function (d) {
    var node = d.getElementById(styleId);
    if (node) {
      node.remove();
    }
  });
}

/** Remove legacy injected line-chart markup stylesheet (if present). */
function removeLineChartMarkupStyle() {
  removeInjectedStyleByIdFromChartDocs('tv-line-chart-markup');
}

/**
 * Line chart: hide time-axis row via TradingView overrides (if supported) plus DOM fallback
 * (same pattern as tv-candle-volume-markup). No effect on candle mode when hide is false.
 */
function injectHideTimeAxisStyle() {
  var paneBg =
    window.CONFIG && window.CONFIG.theme && window.CONFIG.theme.backgroundColor
      ? String(window.CONFIG.theme.backgroundColor)
      : '#131416';
  eachChartDocument(function (targetDoc) {
    if (!targetDoc || !targetDoc.getElementById) {
      return;
    }
    var id = 'tv-hide-time-axis';
    var existing = targetDoc.getElementById(id);
    if (existing) {
      existing.remove();
    }
    var sel = tvScopedDomSelectors(targetDoc);
    // Collapse time row — TV keeps chart-markup-table / chart-widget at pane+time height (~204px)
    // while the main row + .pane stay at ~176px inline; the empty strip is transparent and shows
    // .chart-container-border .screen-* (rgb(19,20,22)) as a dark band. Fill that strip with the
    // same surface as the chart and stretch the first row to the full widget height.
    var hide =
      'display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;' +
      'max-height:0!important;overflow:hidden!important;pointer-events:none!important;opacity:0!important;' +
      'flex:0 0 0!important;margin:0!important;padding:0!important;border:none!important;';
    var style = targetDoc.createElement('style');
    style.id = id;
    style.textContent =
      sel.widgetSel +
      '{background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '{display:flex!important;flex-direction:column!important;background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      ' > div{' +
      'background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '>div:last-child{' +
      hide +
      '}' +
      sel.chartRootSel +
      '>div:last-child .time-axis,' +
      sel.chartRootSel +
      '>div:last-child [class*="price-axis-container"]{' +
      hide +
      '}' +
      sel.chartRootSel +
      '>div:first-child{display:flex!important;flex:1 1 auto!important;height:100%!important;min-height:0!important;' +
      'max-height:none!important;align-items:stretch!important;align-self:stretch!important;}' +
      sel.chartRootSel +
      '>div:first-child > .chart-markup-table.pane,' +
      sel.chartRootSel +
      '>div:first-child > .pane,' +
      sel.chartRootSel +
      '>div:first-child > .chart-markup-table.price-axis-container{' +
      'flex:1 1 auto!important;height:100%!important;min-height:100%!important;max-height:none!important;align-self:stretch!important;' +
      'background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '>div:first-child .chart-gui-wrapper{height:100%!important;min-height:100%!important;max-height:none!important;' +
      'background-color:' +
      paneBg +
      '!important;}' +
      sel.screenSel +
      '{background:' +
      paneBg +
      '!important;}';
    (targetDoc.head || targetDoc.documentElement).appendChild(style);
  });
}

function removeHideTimeAxisStyle() {
  removeInjectedStyleByIdFromChartDocs('tv-hide-time-axis');
}

function applyLineTimeScaleVisibility(hide) {
  if (!window.chartWidget) return;
  var shouldHide = window.currentChartType === 2 && hide;
  try {
    window.chartWidget.applyOverrides({
      'timeScale.visible': !shouldHide,
    });
  } catch (e) {}
  try {
    window.chartWidget.applyOverrides({
      'scalesProperties.hideTimeScale': shouldHide,
    });
  } catch (e2) {}
  if (shouldHide) {
    injectHideTimeAxisStyle();
    function nudgeResizeAfterHideTimeAxis() {
      if (
        !window.chartWidget ||
        window.currentChartType !== 2 ||
        !getLineChrome().hideTimeScale
      ) {
        return;
      }
      try {
        window.chartWidget.resize();
      } catch (e) {}
    }
    try {
      requestAnimationFrame(function () {
        requestAnimationFrame(nudgeResizeAfterHideTimeAxis);
      });
    } catch (e) {
      setTimeout(nudgeResizeAfterHideTimeAxis, 0);
    }
    setTimeout(nudgeResizeAfterHideTimeAxis, 120);
  } else {
    removeHideTimeAxisStyle();
  }
}

/**
 * TradingView sets overflow:hidden on several layout shells (.chart-container, etc.) and may
 * re-apply after resize — refresh textContent so !important keeps winning. Also open the first
 * price pane + gui wrapper; the watermark ring often straddles the pane bottom.
 */
function buildChartDomUnclipCss(targetDoc) {
  var top = targetDoc === document;
  var p = top ? '#tv_chart_container ' : '';
  return (
    p +
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
    'overflow:visible!important;clip-path:none!important;}'
  );
}

function injectChartContainerOverflowUnclip(targetDoc) {
  if (!targetDoc || !targetDoc.getElementById) {
    return;
  }
  var id = 'tv-chart-container-unclip';
  var css = buildChartDomUnclipCss(targetDoc);
  var node = targetDoc.getElementById(id);
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

/** TV relayout is async — re-apply unclip after it sets inline overflow again. */
function scheduleChartDomUnclip() {
  function run() {
    applyChartContainerOverflowUnclip();
  }
  try {
    requestAnimationFrame(function () {
      requestAnimationFrame(run);
    });
  } catch (e) {
    setTimeout(run, 0);
  }
  setTimeout(run, 100);
  setTimeout(run, 280);
}

/**
 * Locate outer .chart-markup-table (TradingView may host it under #tv_chart_container or in a same-origin iframe).
 */
function getChartMarkupTableContext() {
  var container = document.getElementById('tv_chart_container');
  if (!container) {
    return null;
  }
  var table = findOuterChartMarkupTable(document);
  var doc = document;
  if (!table || !container.contains(table)) {
    table = null;
  }
  if (!table) {
    try {
      var iframe = container.querySelector('iframe');
      if (iframe && iframe.contentDocument) {
        table = findOuterChartMarkupTable(iframe.contentDocument);
        if (table) {
          doc = iframe.contentDocument;
        }
      }
    } catch (e) {}
  }
  return table ? { doc: doc, table: table } : null;
}

/** CSS selector prefix: top window uses `#tv_chart_container `; chart iframe document uses none. */
function tvScopedDomSelectors(targetDoc) {
  var top = targetDoc === document;
  var p = top ? '#tv_chart_container ' : '';
  return {
    overflowRule:
      buildChartDomUnclipCss(targetDoc) +
      (top
        ? '#tv_chart_container{overflow:visible!important;}'
        : '.chart-widget{overflow:visible!important;}'),
    chartRootSel: p + '.chart-widget > .chart-markup-table',
    screenSel: p + '.chart-container-border [class^="screen-"]',
    widgetSel: p + '.chart-widget',
  };
}

/**
 * Mobile Advanced Charts show Auto / Log toggles (DOM: class substring `priceScaleModeButtons`).
 * No documented `disabled_features` entry matches this; hide the control group in the chart document.
 */
function injectHidePriceScaleModeButtonsStyle(targetDoc) {
  if (!targetDoc || !targetDoc.getElementById) {
    return;
  }
  var id = 'tv-hide-price-scale-mode-buttons';
  if (targetDoc.getElementById(id)) {
    return;
  }
  var style = targetDoc.createElement('style');
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
    requestAnimationFrame(function () {
      requestAnimationFrame(applyHidePriceScaleModeButtons);
    });
  } catch (e) {}
  setTimeout(applyHidePriceScaleModeButtons, 450);
}

/**
 * Remove injected candle+volume layout stylesheet (surface backgrounds + overflowRule unclip).
 */
function removeCandleVolumeScaleMarkup() {
  removeInjectedStyleByIdFromChartDocs('tv-candle-volume-markup');
}

/**
 * Candle + volume (overlay on single pane): paint widget / screen / chart-root to the theme
 * background. `overflowRule` (first) already includes unclip for `.chart-gui-wrapper` via
 * `buildChartDomUnclipCss`. Older time-scale / error-card DOM patches were removed after QA.
 */
function updateCandleVolumeScaleColumnVisibility() {
  removeCandleVolumeScaleMarkup();

  if (!window.chartWidget || !window.isChartReady) {
    return;
  }
  if (window.currentChartType === 2) {
    return;
  }
  if (!window.volumeStudyId) {
    return;
  }

  var ctx = getChartMarkupTableContext();
  if (!ctx) {
    return;
  }

  var targetDoc = ctx.doc;
  var sel = tvScopedDomSelectors(targetDoc);
  var bg = window.CONFIG.theme.backgroundColor;

  var style = targetDoc.createElement('style');
  style.id = 'tv-candle-volume-markup';

  style.textContent =
    sel.overflowRule +
    sel.widgetSel +
    '{background:' +
    bg +
    '!important;}' +
    sel.screenSel +
    '{background:' +
    bg +
    '!important;}' +
    sel.chartRootSel +
    '{background:' +
    bg +
    '!important;}';
  (targetDoc.head || targetDoc.documentElement).appendChild(style);
}

function handleSetChartType(payload) {
  suppressChartUserInteraction(500);

  if (!window.chartWidget) return;

  var type = payload.type;
  window.currentChartType = type;

  if (!window.isChartReady) return;

  // Immediately remove old indicators when switching types (don't wait for setTimeout)
  if (type === 2) {
    removeAllLastPriceHorizontalOverlays({
      hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
    });
  } else {
    ensureNoLineChartEndIcons();
  }

  try {
    var ac = window.chartWidget.activeChart();
    ac.setChartType(type);

    var color = window.CONFIG.theme.successColor;
    var series = ac.getSeries();
    if (type === 2) {
      series.setChartStyleProperties(2, {
        color: color,
        colorType: 'solid',
        linewidth: 2,
      });
    } else if (type === 10) {
      series.setChartStyleProperties(10, {
        topLineColor: color,
        bottomLineColor: color,
        topLineWidth: 2,
        bottomLineWidth: 2,
      });
    }

    applyChartScaleLayout(type);

    // Update price indicators after chart type change
    // Capture type to prevent stale updates if user switches again quickly
    var capturedType = type;
    setTimeout(function () {
      if (window.currentChartType !== capturedType) return;

      if (capturedType === 2) {
        refreshLineChartOverlays();
      } else if (capturedType === 1) {
        createLastPriceLine();
      }
    }, 100);
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

// ============================================
// Position Lines (unified SET_POSITION_LINES)
// ============================================

function clearPositionLines() {
  if (!window.chartWidget || !window.isChartReady) return;

  try {
    var chart = window.chartWidget.activeChart();
    for (var i = 0; i < window.positionShapeIds.length; i++) {
      try {
        chart.removeEntity(window.positionShapeIds[i]);
      } catch (e) {
        // Shape may already be removed
      }
    }
    window.positionShapeIds = [];
  } catch (error) {
    sendToReactNative('ERROR', {
      message: 'Failed to clear position lines: ' + error.message,
    });
  }
}

function handleSetPositionLines(payload) {
  if (!window.chartWidget || !window.isChartReady) return;

  // Clear existing lines first
  clearPositionLines();

  // null or missing position means "clear only"
  if (!payload || !payload.position) return;

  var position = payload.position;
  var theme = window.CONFIG.theme;

  try {
    var chart = window.chartWidget.activeChart();
    var lines = [];

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
    // TODO: currentPrice is defined in PositionLines but not yet rendered here.
    // Add a line for position.currentPrice (e.g. a solid line showing live mark
    // price) when the Perps integration is ready.

    for (var i = 0; i < lines.length; i++) {
      (function (line) {
        chart
          .createShape(
            { price: line.price },
            {
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
            },
          )
          .then(function (entityId) {
            if (entityId) {
              window.positionShapeIds.push(entityId);
            }
          })
          .catch(function () {
            // Shape creation can fail silently
          });
      })(lines[i]);
    }
  } catch (error) {
    sendToReactNative('ERROR', {
      message: 'Failed to add position lines: ' + error.message,
    });
  }
}

// ============================================
// Last close: green dashed horizontal_line (showPrice:false) + DOM pill (#last-close-price-label,
// same styles as crosshair labels in AdvancedChartTemplate)
// ============================================
window.lastPriceShapeId = null;
/** Invalidates in-flight `createLineLastPriceLine` `createShape` when a newer refresh runs. */
window.__lineLastPriceLinePlacementGen = 0;

/**
 * Deletes all horizontal_line drawing shapes except Perps position lines (IDs in
 * positionShapeIds). TradingView createShape is async; rapid REALTIME_UPDATE (e.g.
 * polling) or layout refreshes can create a new last-price line before the previous
 * createShape finishes, leaving an orphan — two green price tags on the Y-axis.
 * This sweep removes duplicates so only one last-price overlay can remain before
 * a fresh createLastPriceLine / createLineLastPriceLine runs.
 */
function sweepNonPositionHorizontalLines() {
  if (!window.chartWidget || !window.isChartReady) return;
  try {
    var chart = window.chartWidget.activeChart();
    var shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) return;
    var positionIds = window.positionShapeIds || [];
    for (var i = 0; i < shapes.length; i++) {
      var id = shapes[i].id;
      var name = String(shapes[i].name || '');
      if (!/horizontal|horz/i.test(name)) continue;
      if (positionIds.indexOf(id) !== -1) continue;
      try {
        chart.removeEntity(id);
      } catch (e) {}
    }
  } catch (e) {}
}

function createLastPriceLine() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.ohlcvData.length === 0) return;

  // Custom shape duplicates the native last-price UI — only for candlesticks (type 1).
  if (window.currentChartType !== 1) {
    removeAllLastPriceHorizontalOverlays();
    return;
  }

  if (!getLineChrome().useCustomDashedLastPriceLine) {
    removeAllLastPriceHorizontalOverlays({
      hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
    });
    scheduleLastCloseLabelUpdate();
    return;
  }

  removeAllLastPriceHorizontalOverlays();

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;
  var candlePt = getLineEndDotTimeAndPriceFromSeries(chart);
  var candlePrice =
    candlePt && isFinite(candlePt.price) ? candlePt.price : lastBar.close;

  chart
    .createShape(
      { price: candlePrice },
      {
        shape: 'horizontal_line',
        lock: true,
        overrides: {
          linecolor: color,
          linestyle: 2,
          linewidth: 1,
          showLabel: false,
          showPrice: false,
          fontsize: 11,
          horzLabelsAlign: 'right',
        },
        disableSelection: true,
        disableSave: true,
        disableUndo: true,
        showInObjectsTree: false,
        zOrder: 'bottom',
      },
    )
    .then(function (id) {
      // If type changed while creating, remove the shape
      if (window.currentChartType !== 1) {
        if (id) {
          try {
            chart.removeEntity(id);
          } catch (e) {}
        }
        return;
      }
      window.lastPriceShapeId = id;
      scheduleLastCloseLabelUpdate();
    })
    .catch(function (e) {
      // Silent catch - shape creation can fail if chart state changes
    });
}

/**
 * Clears last-close horizontal_line overlays for both chart modes. Candle mode
 * tracks lastPriceShapeId; line mode tracks lineLastPriceShapeId — same sweep,
 * both refs must be nulled when removing drawings.
 * @param { { hideLastCloseDom?: boolean } } [options] — pass `hideLastCloseDom: false` to keep the
 * last-close DOM pill when custom dashed line is off but custom labels stay on.
 */
function removeAllLastPriceHorizontalOverlays(options) {
  sweepNonPositionHorizontalLines();
  window.lastPriceShapeId = null;
  window.lineLastPriceShapeId = null;
  var hideDom = true;
  if (options && options.hideLastCloseDom === false) {
    hideDom = false;
  }
  if (hideDom) {
    hideLastClosePriceLabelDom();
  }
}

function createLineLastPriceLine() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.ohlcvData.length === 0) return;

  var shouldDrawLineLastPrice =
    window.currentChartType === 2 &&
    getLineChrome().useCustomDashedLastPriceLine;

  window.__lineLastPriceLinePlacementGen =
    (window.__lineLastPriceLinePlacementGen || 0) + 1;
  var placementGen = window.__lineLastPriceLinePlacementGen;

  removeAllLastPriceHorizontalOverlays();

  if (!shouldDrawLineLastPrice) {
    return;
  }

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;
  var seriesPt = resolveLineEndOverlayPoint(chart);
  var linePrice =
    seriesPt && isFinite(seriesPt.price) ? seriesPt.price : lastBar.close;

  chart
    .createShape(
      { price: linePrice },
      {
        shape: 'horizontal_line',
        lock: true,
        overrides: {
          linecolor: color,
          linestyle: 2,
          linewidth: 1,
          showLabel: false,
          showPrice: false,
          fontsize: 11,
          horzLabelsAlign: 'right',
        },
        disableSelection: true,
        disableSave: true,
        disableUndo: true,
        showInObjectsTree: false,
        zOrder: 'bottom',
      },
    )
    .then(function (id) {
      if (placementGen !== window.__lineLastPriceLinePlacementGen) {
        if (id) {
          try {
            chart.removeEntity(id);
          } catch (e) {}
        }
        return;
      }
      if (
        window.currentChartType !== 2 ||
        !getLineChrome().useCustomDashedLastPriceLine
      ) {
        if (id) {
          try {
            chart.removeEntity(id);
          } catch (e2) {}
        }
        return;
      }
      window.lineLastPriceShapeId = id;
      scheduleLastCloseLabelUpdate();
    })
    .catch(function () {});
}

function refreshLineChartOverlays() {
  refreshLineEndDot();
  if (
    window.currentChartType === 2 &&
    getLineChrome().useCustomDashedLastPriceLine
  ) {
    createLineLastPriceLine();
  } else {
    removeAllLastPriceHorizontalOverlays({
      hideLastCloseDom: !getLineChrome().useCustomPriceLabels,
    });
    scheduleLastCloseLabelUpdate();
  }
}

// ============================================
// Line chart end dot (~16px design): native line has no marker size API
// ============================================
window.lineEndDotShapeId = null;
/**
 * Incremented on each `refreshLineEndDot` so in-flight `createShape` callbacks from an older run
 * discard their shape instead of orphaning a second icon (rapid layout / realtime / dataReady).
 */
window.__lineEndDotPlacementGen = 0;

/**
 * Bar time from TV `data().last()` / `bars()[n]` (seconds or ms; same shape as OHLCV tuple).
 */
function parseTimeFromTvDataLast(last) {
  if (last === null || last === undefined) {
    return null;
  }
  if (Array.isArray(last)) {
    var t0 = Number(last[0]);
    return isFinite(t0) ? t0 : null;
  }
  if (typeof last === 'object') {
    if (last.time !== undefined && last.time !== null) {
      var nt = Number(last.time);
      if (isFinite(nt)) {
        return nt;
      }
    }
    var v = last.value;
    if (Array.isArray(v) && v.length > 0) {
      var tv = Number(v[0]);
      if (isFinite(tv)) {
        return tv;
      }
    }
  }
  return null;
}

/**
 * Close from TV last bar object / OHLCV tuple (index 4).
 */
function parseCloseFromTvDataLast(last) {
  if (last === null || last === undefined) {
    return null;
  }
  if (Array.isArray(last)) {
    if (last.length > 4) {
      var c = Number(last[4]);
      if (isFinite(c)) {
        return c;
      }
    }
    return null;
  }
  if (typeof last === 'object') {
    if (last.close !== undefined && last.close !== null) {
      var nc = Number(last.close);
      if (isFinite(nc)) {
        return nc;
      }
    }
    var v = last.value;
    if (Array.isArray(v) && v.length > 4) {
      var nvc = Number(v[4]);
      if (isFinite(nvc)) {
        return nvc;
      }
    }
    if (typeof v === 'number' && isFinite(v)) {
      return v;
    }
  }
  return null;
}

/**
 * Unix **seconds** and price for line-end `createShape`, preferring TradingView main series
 * (`data().last()` / `bars()`) so the icon matches the native last point; falls back to feed tail.
 */
function getLineEndDotTimeAndPriceFromSeries(chart) {
  var fallback = null;
  if (window.ohlcvData && window.ohlcvData.length > 0) {
    var b = window.ohlcvData[window.ohlcvData.length - 1];
    var tr = Number(b.time);
    var cl = Number(b.close);
    if (isFinite(tr) && isFinite(cl)) {
      var trSec = tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr);
      fallback = { timeSec: trSec, price: cl };
    }
  }
  if (!chart) {
    return fallback;
  }
  try {
    var series = chart.getSeries();
    if (!series) {
      return fallback;
    }
    if (typeof series.data === 'function') {
      var ds = series.data();
      if (ds && typeof ds.last === 'function') {
        var last = ds.last();
        if (last) {
          var tvT = parseTimeFromTvDataLast(last);
          var tvC = parseCloseFromTvDataLast(last);
          if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
            var timeSec =
              tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT);
            return { timeSec: timeSec, price: tvC };
          }
        }
      }
    }
    if (typeof series.bars === 'function') {
      var bars = series.bars();
      if (bars && bars.length) {
        var lb = bars[bars.length - 1];
        var tvT2 = parseTimeFromTvDataLast(lb);
        var tvC2 = parseCloseFromTvDataLast(lb);
        if (
          tvT2 !== null &&
          isFinite(tvT2) &&
          tvC2 !== null &&
          isFinite(tvC2)
        ) {
          var timeSec2 =
            tvT2 >= 1e12 ? Math.floor(tvT2 / 1000) : Math.floor(tvT2);
          return { timeSec: timeSec2, price: tvC2 };
        }
      }
    }
  } catch (e) {}
  return fallback;
}

/**
 * Single resolved last point for line-end dot, dashed last-price line, and DOM last-close pill:
 * prefers TradingView main series when readable, else `ohlcvData` tail.
 */
function resolveLineEndOverlayPoint(chart) {
  return getLineEndDotTimeAndPriceFromSeries(chart);
}

/**
 * Normalize TV/chart timestamps to unix **seconds** (library mixes sec/ms in places).
 */
function normalizeChartUnixSec(t) {
  var n = Number(t);
  if (!isFinite(n)) {
    return null;
  }
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

/**
 * Step between last two OHLCV bars in seconds (for visible-range alignment checks).
 */
function getApproxBarDurationSec() {
  var d = window.ohlcvData;
  if (!d || d.length < 2) {
    return 300;
  }
  var ms = Math.abs(d[d.length - 1].time - d[d.length - 2].time);
  return Math.max(60, Math.round(ms / 1000));
}

/** Pixels inset from time-scale right so `coordinateToTime` samples left of the price scale (16px dot + margin). */
var LINE_END_ICON_TIME_INSET_PX = 40;
var LINE_END_ICON_PROBE_STEP_PX = 8;
var LINE_END_ICON_MAX_PROBES = 14;

/**
 * Skip extrapolation during interval switches / odd zoom: too few bars, incoherent visible range vs data.
 */
function shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) {
  var d = window.ohlcvData;
  if (!d || d.length < 2) {
    return true;
  }
  if (!chart || !isFinite(lastBarTimeSec)) {
    return true;
  }
  try {
    var br = chart.getVisibleBarsRange();
    if (!br || br.from === undefined || br.to === undefined) {
      return true;
    }
    var brFromSec = normalizeChartUnixSec(br.from);
    var brToSec = normalizeChartUnixSec(br.to);
    if (brFromSec === null || brToSec === null) {
      return true;
    }
    var barDur = getApproxBarDurationSec();
    var visibleSpan = Math.abs(brToSec - brFromSec);
    var n = d.length;
    if (visibleSpan > barDur * Math.max(n, 1) * 96) {
      return true;
    }
    if (lastBarTimeSec > brToSec + barDur * 4) {
      return true;
    }
    if (lastBarTimeSec + barDur * 4 < brToSec) {
      return true;
    }
  } catch (e) {
    return true;
  }
  return false;
}

function trailingVisibleBarMatchesSeriesLast(chart, lastBarTimeSec) {
  try {
    var br = chart.getVisibleBarsRange();
    if (!br || br.to === undefined || br.to === null) {
      return false;
    }
    var brToSec = normalizeChartUnixSec(br.to);
    if (brToSec === null) {
      return false;
    }
    var barDur = getApproxBarDurationSec();
    return (
      lastBarTimeSec <= brToSec + barDur &&
      lastBarTimeSec >= brToSec - 2 * barDur
    );
  } catch (e) {
    return false;
  }
}

/**
 * Reads TradingView’s current visible bars range and returns normalized **Unix seconds** bounds
 * `{ lo, hi }` (always `lo <= hi`). Used by both “is tail visible?” and “which bars intersect?”.
 *
 * @param {object} chart - `widget.activeChart()`
 * @returns {{ lo: number, hi: number } | null} null if range unavailable or timestamps invalid
 */
function getVisibleTimeRangeSecFromChart(chart) {
  try {
    var br = chart.getVisibleBarsRange();
    if (!br || br.from === undefined || br.to === undefined) {
      return null;
    }
    var fromSec = normalizeChartUnixSec(br.from);
    var toSec = normalizeChartUnixSec(br.to);
    if (fromSec === null || toSec === null) {
      return null;
    }
    return {
      lo: Math.min(fromSec, toSec),
      hi: Math.max(fromSec, toSec),
    };
  } catch (e) {
    return null;
  }
}

/**
 * True if the **dataset’s last bar** (by time) lies inside—or immediately adjacent to—the visible
 * bars range (using `getApproxBarDurationSec` slack). When false, the user has panned/zoomed so the
 * “current” candle/line endpoint is no longer on-screen (typical: panned left, tail off the right).
 *
 * Returns **true** if we cannot read the range (fail-safe: do not show the outline pill).
 *
 * @param {object} chart
 * @param {number} lastBarTimeMs - `ohlcvData` tail `.time` (milliseconds)
 */
function isSeriesTailBarTimeVisibleOnChart(chart, lastBarTimeMs) {
  var range = getVisibleTimeRangeSecFromChart(chart);
  if (!range) {
    return true;
  }
  var lastSec = normalizeChartUnixSec(lastBarTimeMs);
  if (lastSec === null) {
    return true;
  }
  var slack = getApproxBarDurationSec() * 2;
  return lastSec >= range.lo - slack && lastSec <= range.hi + slack;
}

/**
 * Among bars in `data`, returns the one with the **maximum `time`** that still falls inside the
 * visible range (milliseconds, with the same slack as `isSeriesTailBarTimeVisibleOnChart`). This is
 * the **rightmost historical bar still drawn** in the viewport—the “visible edge” for the outline
 * pill’s close price.
 *
 * @param {object} chart
 * @param {Array<{ time: number, close: number }>} data - `window.ohlcvData`
 * @returns {object | null} bar object or null if none intersect
 */
function getRightmostOhlcvBarInVisibleTimeRange(chart, data) {
  var range = getVisibleTimeRangeSecFromChart(chart);
  if (!range || !data || !data.length) {
    return null;
  }
  var slackSec = getApproxBarDurationSec() * 2;
  var loMs = (range.lo - slackSec) * 1000;
  var hiMs = (range.hi + slackSec) * 1000;
  var best = null;
  var i;
  for (i = 0; i < data.length; i++) {
    var b = data[i];
    var t = b.time;
    if (t >= loMs && t <= hiMs) {
      if (!best || t > best.time) {
        best = b;
      }
    }
  }
  return best;
}

/**
 * Horizontal position for line-end icon: probe `timeScale.coordinateToTime(x)` from the right with
 * inset so the marker sits on the plot (avoids clipping on the price scale). Falls back to bar time.
 */
function getLineEndIconTimeSec(chart, lastBarTimeSec) {
  if (!chart || !isFinite(lastBarTimeSec)) {
    return lastBarTimeSec;
  }
  if (
    shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) ||
    !trailingVisibleBarMatchesSeriesLast(chart, lastBarTimeSec)
  ) {
    return lastBarTimeSec;
  }
  try {
    var ts = chart.getTimeScale();
    if (
      !ts ||
      typeof ts.coordinateToTime !== 'function' ||
      typeof ts.width !== 'function'
    ) {
      return lastBarTimeSec;
    }
    var w = ts.width();
    if (!(w > LINE_END_ICON_TIME_INSET_PX + 4)) {
      return lastBarTimeSec;
    }
    var vr = chart.getVisibleRange();
    var capSec =
      vr && vr.to !== undefined && vr.to !== null
        ? normalizeChartUnixSec(vr.to)
        : null;
    var k;
    for (k = 0; k < LINE_END_ICON_MAX_PROBES; k++) {
      var x = Math.max(
        0,
        Math.floor(
          w - LINE_END_ICON_TIME_INSET_PX - k * LINE_END_ICON_PROBE_STEP_PX,
        ),
      );
      var rawT = ts.coordinateToTime(x);
      if (rawT === null || rawT === undefined) {
        continue;
      }
      var numT = Number(rawT);
      if (!isFinite(numT)) {
        continue;
      }
      var tNorm = normalizeChartUnixSec(numT);
      if (tNorm === null) {
        continue;
      }
      if (tNorm < lastBarTimeSec) {
        continue;
      }
      if (capSec !== null && tNorm > capSec) {
        tNorm = capSec;
      }
      return tNorm;
    }
  } catch (e) {
    return lastBarTimeSec;
  }
  return lastBarTimeSec;
}

function removeLineEndDot() {
  if (!window.lineEndDotShapeId || !window.chartWidget) return;
  try {
    window.chartWidget.activeChart().removeEntity(window.lineEndDotShapeId);
  } catch (e) {}
  window.lineEndDotShapeId = null;
}

/**
 * Removes Drawing API `icon` shapes on the active chart. Line mode only uses icons for the end
 * dot; stale async `createShape` calls can leave orphans with no `lineEndDotShapeId` reference.
 */
function sweepOrphanLineChartIconShapes() {
  if (
    window.currentChartType !== 2 ||
    !window.chartWidget ||
    !window.isChartReady
  ) {
    return;
  }
  try {
    var chart = window.chartWidget.activeChart();
    var shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) {
      return;
    }
    for (var i = 0; i < shapes.length; i++) {
      var name = String(shapes[i].name || '');
      if (!/icon/i.test(name)) {
        continue;
      }
      try {
        chart.removeEntity(shapes[i].id);
      } catch (err) {}
    }
  } catch (e) {}
}

/**
 * Line end marker is a Drawing API `icon` shape. Remove by id and sweep getAllShapes — pending
 * createShape promises can leave orphan icons on candle mode after fast toggles.
 */
function ensureNoLineChartEndIcons() {
  if (window.currentChartType === 2) return;
  removeLineEndDot();
  removeAllLastPriceHorizontalOverlays();
  window.lineEndDotShapeId = null;
  if (!window.chartWidget || !window.isChartReady) return;
  try {
    var chart = window.chartWidget.activeChart();
    var shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) return;
    for (var i = 0; i < shapes.length; i++) {
      var name = String(shapes[i].name || '');
      if (/icon/i.test(name)) {
        try {
          chart.removeEntity(shapes[i].id);
        } catch (err) {}
      }
    }
  } catch (e) {}
}

function refreshLineEndDot() {
  window.__lineEndDotPlacementGen = (window.__lineEndDotPlacementGen || 0) + 1;
  var placementGen = window.__lineEndDotPlacementGen;

  removeLineEndDot();
  sweepOrphanLineChartIconShapes();

  if (
    window.currentChartType !== 2 ||
    !window.chartWidget ||
    !window.isChartReady ||
    window.ohlcvData.length === 0
  ) {
    return;
  }

  if (!getLineChrome().useCustomLineEndMarker) {
    return;
  }

  var color = window.CONFIG.theme.successColor;

  function placeLineEndIcon() {
    if (placementGen !== window.__lineEndDotPlacementGen) {
      return;
    }
    if (
      window.currentChartType !== 2 ||
      !window.chartWidget ||
      !window.isChartReady
    ) {
      return;
    }
    var chart = window.chartWidget.activeChart();
    var pt = resolveLineEndOverlayPoint(chart);
    if (!pt || !isFinite(pt.timeSec) || !isFinite(pt.price)) {
      return;
    }
    if (placementGen !== window.__lineEndDotPlacementGen) {
      return;
    }
    var iconTimeSec = getLineEndIconTimeSec(chart, pt.timeSec);

    // Drawings API: icon + size matches design (16px); circle tool has no radius override.
    // https://www.tradingview.com/charting-library-docs/latest/customization/overrides/Drawings-Overrides/
    chart
      .createShape(
        { time: iconTimeSec, price: pt.price },
        {
          shape: 'icon',
          icon: 0xf111,
          lock: true,
          overrides: {
            color: color,
            size: 16,
          },
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
          showInObjectsTree: false,
          zOrder: 'top',
        },
      )
      .then(function (id) {
        if (placementGen !== window.__lineEndDotPlacementGen) {
          if (id) {
            try {
              chart.removeEntity(id);
            } catch (e) {}
          }
          return;
        }
        if (window.currentChartType !== 2) {
          if (id) {
            try {
              chart.removeEntity(id);
            } catch (e2) {}
          }
          return;
        }
        if (id) {
          window.lineEndDotShapeId = id;
        }
      })
      .catch(function () {});
  }

  try {
    var chartForReady = window.chartWidget.activeChart();
    if (chartForReady && typeof chartForReady.dataReady === 'function') {
      chartForReady.dataReady(placeLineEndIcon);
    } else {
      try {
        requestAnimationFrame(placeLineEndIcon);
      } catch (eRaf) {
        setTimeout(placeLineEndIcon, 0);
      }
    }
  } catch (eReady) {
    placeLineEndIcon();
  }
}

// ============================================
// Volume Helpers
// ============================================
window.volumeStudyId = null;
/** null when hidden; tracks overlay vs two-pane for TOGGLE_VOLUME changes while visible */
window.volumeIsOverlay = null;

function createVolumeStudy(useOverlay) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.volumeStudyId) return;

  try {
    var chart = window.chartWidget.activeChart();
    var theme = window.CONFIG.theme;
    var inputs = {
      'volume ma.display': 0,
      'volume.color.0': theme.errorColor,
      'volume.color.1': theme.successColor,
      'volume.transparency': useOverlay ? 70 : 0,
    };
    var promise = useOverlay
      ? chart.createStudy('Volume', true, false, {}, inputs, {
          priceScale: 'no-scale',
        })
      : chart.createStudy('Volume', false, false, {}, inputs);

    promise
      .then(function (studyId) {
        window.volumeStudyId = studyId;
        try {
          var heights = chart.getAllPanesHeight();
          if (heights.length === 2) {
            var total = heights[0] + heights[1];
            var minVolumePx = 56;
            var minMainPx = 72;
            var vol = Math.max(Math.round(total * 0.22), minVolumePx);
            var main = total - vol;
            if (main < minMainPx && total > minMainPx + minVolumePx) {
              main = minMainPx;
              vol = total - main;
            } else if (main < minMainPx) {
              main = Math.max(48, total - minVolumePx);
              vol = total - main;
            }
            chart.setAllPanesHeight([main, vol]);
          }
        } catch (e) {}
        updateCandleVolumeScaleColumnVisibility();
        try {
          requestAnimationFrame(function () {
            requestAnimationFrame(updateCandleVolumeScaleColumnVisibility);
          });
        } catch (e) {}
      })
      .catch(function () {});
  } catch (e) {}
}

function handleToggleVolume(payload) {
  if (!window.chartWidget || !window.isChartReady || !payload) return;

  suppressChartUserInteraction(600);

  var useOverlay = payload.volumeOverlay === true;

  if (!payload.visible) {
    if (window.volumeStudyId) {
      try {
        window.chartWidget.activeChart().removeEntity(window.volumeStudyId);
      } catch (e) {}
      window.volumeStudyId = null;
    }
    window.volumeIsOverlay = null;
    updateCandleVolumeScaleColumnVisibility();
    return;
  }

  if (
    window.volumeStudyId &&
    window.volumeIsOverlay !== null &&
    window.volumeIsOverlay !== useOverlay
  ) {
    try {
      window.chartWidget.activeChart().removeEntity(window.volumeStudyId);
    } catch (e) {}
    window.volumeStudyId = null;
  }

  window.volumeIsOverlay = useOverlay;
  if (!window.volumeStudyId) {
    createVolumeStudy(useOverlay);
  }
}

// ============================================
// Custom Datafeed Implementation
// ============================================

/**
 * TradingView variable_tick_size string.
 *
 * Tells TradingView to dynamically adjust pricescale/minmov based on
 * the current price level. Format: "tickSize threshold tickSize threshold …"
 * where each tickSize applies for prices below the next threshold, and
 * the last tickSize applies to all prices above the last threshold.
 *
 * This replaces a manual pricescale computation and adapts automatically
 * as prices change (e.g. meme token pumps from $0.0001 to $1).
 */
var VARIABLE_TICK_SIZE = [
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

function filterBarsForRange(fromMs, toMs, countBack) {
  var barsInRange = [];
  for (var i = 0; i < window.ohlcvData.length; i++) {
    var b = window.ohlcvData[i];
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
    var allBeforeTo = [];
    for (var j = 0; j < window.ohlcvData.length; j++) {
      if (window.ohlcvData[j].time < toMs) {
        allBeforeTo.push(window.ohlcvData[j]);
      }
    }
    var startIdx = Math.max(0, allBeforeTo.length - countBack);
    barsInRange = [];
    for (var k = startIdx; k < allBeforeTo.length; k++) {
      var bar = allBeforeTo[k];
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

var OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

/**
 * Fetches the next page of OHLCV history directly from the Price API inside the WebView.
 * Called from `getBars` when `window.ohlcvPagination` has a cursor, avoiding the RN round-trip.
 */
function fetchOlderBars(pending) {
  var pag = window.ohlcvPagination;
  if (!pag.nextCursor || !pag.hasMore || !pag.assetId) {
    pending.onResult([], { noData: true });
    if (window.__mmLayoutSettlePending) {
      queueTryCompleteLayoutSettleAfterData();
    }
    return;
  }

  var gen = window.ohlcvGeneration;
  var url =
    OHLCV_BASE_URL +
    '/' +
    encodeURIComponent(pag.assetId) +
    '?nextCursor=' +
    encodeURIComponent(pag.nextCursor);
  if (pag.vsCurrency) {
    url += '&vsCurrency=' + encodeURIComponent(pag.vsCurrency);
  }

  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('OHLCV API error: ' + response.status);
      }
      return response.json();
    })
    .then(function (result) {
      if (gen !== window.ohlcvGeneration) {
        return;
      }

      if (!result || !Array.isArray(result.data)) {
        throw new Error('OHLCV API response: invalid payload');
      }

      var newBars = [];
      for (var i = 0; i < result.data.length; i++) {
        var c = result.data[i];
        newBars.push({
          time: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        });
      }

      window.ohlcvPagination.nextCursor = result.nextCursor || null;
      window.ohlcvPagination.hasMore = !!result.hasNext;

      if (newBars.length > 0) {
        window.ohlcvData = newBars.concat(window.ohlcvData);
      }

      var olderBars = [];
      for (var j = 0; j < newBars.length; j++) {
        if (newBars[j].time < pending.oldestAtDefer) {
          olderBars.push(newBars[j]);
        }
      }

      pending.onResult(olderBars, { noData: olderBars.length === 0 });
      if (window.__mmLayoutSettlePending) {
        queueTryCompleteLayoutSettleAfterData();
      }
    })
    .catch(function (err) {
      if (gen !== window.ohlcvGeneration) {
        return;
      }
      pending.onResult([], { noData: true });
      if (window.__mmLayoutSettlePending) {
        queueTryCompleteLayoutSettleAfterData();
      }
      sendToReactNative('DEBUG', {
        message: 'fetchOlderBars error: ' + (err.message || String(err)),
      });
    });
}

var customDatafeed = {
  onReady: function (callback) {
    setTimeout(function () {
      callback({
        supported_resolutions: [
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
        ],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
      });
    }, 0);
  },

  searchSymbols: function (userInput, exchange, symbolType, onResult) {
    onResult([]);
  },

  resolveSymbol: function (symbolName, onResolve) {
    setTimeout(function () {
      onResolve({
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
        supported_resolutions: [
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
        ],
        volume_precision: 0,
        data_status: 'endofday',
      });
    }, 0);
  },

  getBars: function (symbolInfo, resolution, periodParams, onResult, onError) {
    try {
      var fromMs = periodParams.from * 1000;
      var toMs = periodParams.to * 1000;
      var countBack = periodParams.countBack;
      var firstRequest = periodParams.firstDataRequest;

      /**
       * Invokes TradingView’s callback, then completes deferred layout settle when this response is
       * the main load for the visible range (`firstDataRequest`), matching `resetData` / new OHLCV.
       */
      function deliverBars(bars, meta) {
        onResult(bars, meta);
        if (window.__mmLayoutSettlePending && periodParams.firstDataRequest) {
          queueTryCompleteLayoutSettleAfterData();
        }
      }

      var bars = filterBarsForRange(fromMs, toMs, countBack);

      if (bars.length > 0) {
        deliverBars(bars, { noData: false });
        return;
      }

      if (firstRequest || window.ohlcvData.length === 0) {
        deliverBars([], { noData: true });
        return;
      }

      var oldestTs = window.ohlcvData[0].time;

      fetchOlderBars({
        onResult: onResult,
        oldestAtDefer: oldestTs,
      });
    } catch (error) {
      abortDeferredLayoutSettleAndNotify();
      onError(error && error.message ? error.message : String(error));
    }
  },

  subscribeBars: function (symbolInfo, resolution, onTick, listenerGuid) {
    window.realtimeCallbacks[listenerGuid] = onTick;
  },

  unsubscribeBars: function (listenerGuid) {
    delete window.realtimeCallbacks[listenerGuid];
  },
};

// ============================================
// Library Loading
// ============================================
var libraryLoadAttempts = 0;
var maxLibraryLoadAttempts = 50;

function loadLibrary() {
  var scriptUrl = window.CONFIG.libraryUrl + 'charting_library.js';

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = scriptUrl;
  script.onload = function () {
    window.libraryLoaded = true;
    if (window.ohlcvData.length > 0) {
      initChart();
    }
  };
  script.onerror = function () {
    window.libraryError =
      'Failed to load TradingView library. URL: ' + scriptUrl;
    document.getElementById('loading-overlay').innerHTML =
      '<div style="text-align:center;padding:20px;">' +
      '<p style="color:#FF6B6B;margin-bottom:10px;">Failed to load chart library</p>' +
      '<p style="font-size:12px;color:#888;">URL: ' +
      scriptUrl +
      '</p>' +
      '<p style="font-size:12px;color:#888;">Check S3 access or CORS configuration.</p>' +
      '</div>';
    sendToReactNative('ERROR', { message: window.libraryError });
  };
  document.head.appendChild(script);
}

// ============================================
// Chart Initialization
// ============================================
function initChart() {
  if (window.chartWidget) {
    return;
  }

  if (typeof TradingView === 'undefined') {
    libraryLoadAttempts++;
    if (libraryLoadAttempts >= maxLibraryLoadAttempts) {
      var errorMsg =
        'TradingView library failed to initialize after ' +
        maxLibraryLoadAttempts * 100 +
        'ms';
      document.getElementById('loading-overlay').textContent = errorMsg;
      sendToReactNative('ERROR', { message: errorMsg });
      return;
    }
    setTimeout(initChart, 100);
    return;
  }

  if (window.ohlcvData.length === 0) {
    return;
  }

  try {
    var theme = window.CONFIG.theme;
    var features = window.CONFIG.features || {};
    var lcInit = getLineChrome();
    var initCustomLabels = lcInit.useCustomPriceLabels;
    var initCustomDashed = lcInit.useCustomDashedLastPriceLine;

    // Disabled features are passed from React Native via CONFIG.features.disabledFeatures.
    // Defaults are set in DEFAULT_DISABLED_FEATURES (AdvancedChart.types.ts) and are
    // optimized for the Token Details mobile UX. Consumers needing TradingView's
    // native UI (e.g. Perps) can override via the disabledFeatures prop.
    var disabledFeatures = (features.disabledFeatures || []).slice();

    if (!features.enableDrawingTools) {
      disabledFeatures.push('left_toolbar');
      disabledFeatures.push('context_menus');
    }

    var visibleToSec = Math.ceil(
      (window.visibleToMs != null ? window.visibleToMs : Date.now()) / 1000,
    );
    var tfOption =
      window.visibleFromMs != null
        ? {
            type: 'time-range',
            from: Math.floor(window.visibleFromMs / 1000),
            to: visibleToSec,
          }
        : undefined;

    window.chartWidget = new TradingView.widget({
      symbol: window.currentSymbol,
      interval: window.currentResolution || '5',
      timeframe: tfOption,
      container: 'tv_chart_container',
      datafeed: customDatafeed,
      library_path: window.CONFIG.libraryUrl,
      locale: 'en',
      fullscreen: false,
      autosize: true,
      theme: 'Dark',

      disabled_features: disabledFeatures.concat(
        'use_localstorage_for_settings',
      ),
      // Keep default logo placement on the *bottom* pane so it stays in the same corner when
      // toggling line (single pane) vs candle + volume (logo on volume strip). Forcing
      // move_logo_to_main_pane shifts the mark into the price pane and it jumps above volume.
      enabled_features: ['study_templates', 'iframe_loading_same_origin'],

      custom_themes: {
        dark: {
          color1: generatePaletteShades(theme.successColor),
          color3: generatePaletteShades(theme.errorColor),
        },
      },

      overrides: Object.assign(
        {
          'paneProperties.background': theme.backgroundColor,
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': 'transparent',
          'paneProperties.horzGridProperties.color': 'transparent',
          'scalesProperties.textColor': theme.textColor,
          'scalesProperties.lineColor': theme.backgroundColor || '#131416', // done to hide the axis line
          'timeScale.borderColor': theme.backgroundColor || '#131416', // done to hide the axis line
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
        },
        getSeriesColorOverrides(theme.successColor),
      ),

      loading_screen: {
        backgroundColor: theme.backgroundColor,
        foregroundColor: theme.successColor,
      },
    });

    window.chartWidget.onChartReady(function () {
      suppressChartUserInteraction(1500);
      window.isChartReady = true;
      window.__mmLayoutSettlePending = false;
      clearMmLayoutSettleFallbackTimer();
      document.getElementById('loading-overlay').classList.add('hidden');

      // Apply RN messages (e.g. SET_CHART_TYPE) before drawing last-price shape so
      // currentChartType and TradingView overrides stay in sync.
      window.pendingMessages.forEach(function (msg) {
        handleMessage({ data: msg });
      });
      window.pendingMessages = [];

      applySeriesColors();
      applyChartScaleLayout(window.currentChartType);

      scheduleHidePriceScaleModeButtons();

      // Initialize price indicators based on chart type
      if (window.currentChartType === 2) {
        refreshLineChartOverlays();
      } else {
        ensureNoLineChartEndIcons();
        createLastPriceLine();
      }

      // Prevent series selection (blue dots) by clearing any selection immediately
      try {
        window.chartWidget
          .activeChart()
          .selection()
          .onChanged()
          .subscribe(null, function () {
            window.chartWidget.activeChart().selection().clear();
          });
      } catch (e) {}

      // After zoom/pan, TV may reset time-scale and re-apply overflow on layout shells.
      var chartTimeScaleLayoutDebounce = null;
      try {
        window.chartWidget
          .activeChart()
          .getTimeScale()
          .barSpacingChanged()
          .subscribe(null, function () {
            if (chartTimeScaleLayoutDebounce) {
              clearTimeout(chartTimeScaleLayoutDebounce);
            }
            chartTimeScaleLayoutDebounce = setTimeout(function () {
              chartTimeScaleLayoutDebounce = null;
              if (!window.chartWidget) return;
              try {
                applyChartContainerOverflowUnclip();
                scheduleLastCloseLabelUpdate();
                if (window.currentChartType === 2) {
                  try {
                    requestAnimationFrame(refreshLineChartOverlays);
                  } catch (rafDot) {}
                }
              } catch (err) {}
            }, 80);
          });
      } catch (e) {}

      subscribeLastCloseLabelUpdates();

      sendToReactNative('CHART_READY', {});

      installTradingViewExternalOpenBridge();

      // Chart interaction analytics: zoom vs pan (tooltip handled with crosshair).
      window.__mmChartInteractZoomDebounce = null;
      window.__mmChartInteractPanDebounce = null;
      window.__mmChartInteractZoomLastFired = 0;

      // Count a zoom: user changed bar width (pinch or zoom). We wait 450ms and send one event.
      // We store when that happened so we do not also count a pan for the same finger action.
      function scheduleChartInteractZoom() {
        if (Date.now() < window.__mmSuppressChartInteractUntil) {
          return;
        }
        if (window.__mmChartInteractZoomDebounce) {
          clearTimeout(window.__mmChartInteractZoomDebounce);
        }
        window.__mmChartInteractZoomDebounce = setTimeout(function () {
          window.__mmChartInteractZoomDebounce = null;
          if (Date.now() < window.__mmSuppressChartInteractUntil) {
            return;
          }
          if (!window.chartWidget || !window.isChartReady) {
            return;
          }
          sendToReactNative('CHART_INTERACTED', {
            interaction_type: 'zoom',
          });
          window.__mmChartInteractZoomLastFired = Date.now();
        }, 450);
      }

      // Count a pan: user slid the chart sideways. We wait 450ms and send one event.
      // Right after a zoom we skip for 500ms, because zoom already shifts what you see on screen.
      function scheduleChartInteractPan() {
        if (Date.now() < window.__mmSuppressChartInteractUntil) {
          return;
        }
        if (Date.now() - window.__mmChartInteractZoomLastFired < 500) {
          return;
        }
        if (window.__mmChartInteractPanDebounce) {
          clearTimeout(window.__mmChartInteractPanDebounce);
        }
        window.__mmChartInteractPanDebounce = setTimeout(function () {
          window.__mmChartInteractPanDebounce = null;
          if (Date.now() < window.__mmSuppressChartInteractUntil) {
            return;
          }
          if (Date.now() - window.__mmChartInteractZoomLastFired < 500) {
            return;
          }
          if (!window.chartWidget || !window.isChartReady) {
            return;
          }
          sendToReactNative('CHART_INTERACTED', {
            interaction_type: 'pan',
          });
        }, 450);
      }

      try {
        window.chartWidget
          .activeChart()
          .getTimeScale()
          .barSpacingChanged()
          .subscribe(null, function () {
            scheduleChartInteractZoom();
          });
      } catch (e) {}

      try {
        window.chartWidget
          .activeChart()
          .onVisibleRangeChanged()
          .subscribe(null, function () {
            scheduleChartInteractPan();
          });
      } catch (e) {}

      // Set up crosshair move listener for OHLC overlay
      // TradingView activates crosshair on long-press internally.
      // We forward all crosshair data and dismiss on short tap.
      try {
        window.ohlcvBarVisible = false;
        window.ohlcvBarShownAt = 0;
        window.ohlcvDismissUntil = 0;
        window.__mmTooltipChartInteractSent = false;

        window.chartWidget
          .activeChart()
          .crossHairMoved()
          .subscribe(null, function (params) {
            if (
              !params ||
              params.price === undefined ||
              params.time === undefined
            ) {
              hideCustomCrosshairLabels();
              return;
            }

            if (Date.now() < window.ohlcvDismissUntil) {
              hideCustomCrosshairLabels();
              return;
            }

            updateCustomCrosshairLabels(params);

            if (!window.ohlcvBarVisible) {
              window.ohlcvBarShownAt = Date.now();
            }
            window.ohlcvBarVisible = true;

            var targetTime = params.time * 1000;
            var closestBar = null;
            var minDiff = Infinity;
            for (var i = 0; i < window.ohlcvData.length; i++) {
              var diff = Math.abs(window.ohlcvData[i].time - targetTime);
              if (diff < minDiff) {
                minDiff = diff;
                closestBar = window.ohlcvData[i];
              }
            }
            if (closestBar) {
              if (!window.__mmTooltipChartInteractSent) {
                sendToReactNative('CHART_INTERACTED', {
                  interaction_type: 'tooltip',
                });
                window.__mmTooltipChartInteractSent = true;
              }
              sendToReactNative('CROSSHAIR_MOVE', {
                data: {
                  time: closestBar.time,
                  open: closestBar.open,
                  high: closestBar.high,
                  low: closestBar.low,
                  close: closestBar.close,
                  volume: closestBar.volume,
                },
              });
            }
          });

        var mouseDownTime = 0;

        window.chartWidget.subscribe('mouse_down', function () {
          mouseDownTime = Date.now();
          window.ohlcvDismissUntil = 0;
        });

        window.chartWidget.subscribe('mouse_up', function () {
          if (!window.ohlcvBarVisible) return;
          var pressDuration = Date.now() - mouseDownTime;
          if (pressDuration < 400) {
            // Short tap — only dismiss if bar has been visible long enough
            // to avoid synthetic click events on long-press release
            if (Date.now() - window.ohlcvBarShownAt < 500) return;
            window.ohlcvBarVisible = false;
            window.ohlcvBarShownAt = 0;
            window.ohlcvDismissUntil = Date.now() + 800;
            hideCustomCrosshairLabels();
            setTimeout(function () {
              window.__mmTooltipChartInteractSent = false;
              sendToReactNative('CROSSHAIR_MOVE', { data: null });
            }, 50);
          }
        });
      } catch (e) {
        // Crosshair subscription not critical
      }
    });
  } catch (error) {
    var errMsg = error && error.message ? String(error.message) : String(error);
    sendToReactNative('ERROR', {
      message: 'Failed to initialize chart: ' + errMsg,
    });
  }
}

// ============================================
// Start
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    loadLibrary();
  });
} else {
  loadLibrary();
}
