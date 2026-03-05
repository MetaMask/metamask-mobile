/**
 * TradingView Chart WebView Logic
 *
 * Generic charting logic for TradingView Advanced Charts.
 * Embedded into the WebView HTML at runtime via chartLogicString.ts.
 *
 * CONFIG is injected before this script runs and contains:
 * - libraryUrl: string
 * - theme: { backgroundColor, borderColor, textColor, successColor, errorColor, primaryColor }
 */

// ============================================
// Global State
// ============================================
window.chartWidget = null;
window.ohlcvData = [];
window.currentSymbol = 'ASSET';
window.activeStudies = {};
window.positionShapeIds = [];
window.isChartReady = false;
window.pendingMessages = [];
window.libraryLoaded = false;
window.libraryError = null;
window.realtimeCallbacks = {};
window.pendingGetBarsCallback = null;

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

  window.ohlcvData = payload.data;

  var newResolution = detectResolution(window.ohlcvData);
  var hasPending = !!window.pendingGetBarsCallback;

  // TODO: Early return bypasses resolution-change handling at lines 146–170.
  // If SET_OHLCV_DATA arrives at a different resolution while a history
  // request is pending (if a user switches interval during a pending chart candle history navigation request),
  // the widget stays at the old resolution while window.currentResolution
  // reflects the new one. Fix when wiring up history pagination for Perps.
  if (hasPending) {
    var pending = window.pendingGetBarsCallback;
    window.pendingGetBarsCallback = null;
    window.currentResolution = newResolution;
    resolvePendingGetBars(pending);
    return;
  }

  if (window.chartWidget && window.isChartReady) {
    if (window.currentResolution !== newResolution) {
      window.currentResolution = newResolution;
      try {
        window.chartWidget
          .activeChart()
          .setResolution(newResolution, function () {});
      } catch (e) {
        window.chartWidget.remove();
        window.chartWidget = null;
        window.isChartReady = false;
        window.activeStudies = {};
        window.volumeStudyId = null;
        window.positionShapeIds = [];
        window.realtimeCallbacks = {};
        window.pendingGetBarsCallback = null;
        initChart();
      }
    } else {
      try {
        window.chartWidget.activeChart().resetData();
      } catch (e) {
        // resetData can fail if chart is in a transitional state
      }
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
}

// ============================================
// Indicator Handlers
//
// Curated subset for Token Details mobile UX. Consumers needing the full
// TradingView study picker can re-enable header_widget via disabledFeatures
// prop, which exposes TradingView's native indicator UI.
// ============================================
function handleAddIndicator(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || !payload.name) return;

  var indicatorName = payload.name;

  if (window.activeStudies[indicatorName]) {
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
        window.activeStudies[indicatorName] = studyId;
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
  var studyId = window.activeStudies[indicatorName];

  if (!studyId) return;

  try {
    var chart = window.chartWidget.activeChart();
    chart.removeEntity(studyId);
    delete window.activeStudies[indicatorName];
    sendToReactNative('INDICATOR_REMOVED', { name: indicatorName });
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

// ============================================
// Chart Type Handler
// ============================================
function handleSetChartType(payload) {
  if (!window.chartWidget || !window.isChartReady) return;

  try {
    var chart = window.chartWidget.activeChart();
    chart.setChartType(payload.type);
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
// Volume Helpers
// ============================================
window.volumeStudyId = null;

function createVolumeStudy() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.volumeStudyId) return;

  try {
    window.chartWidget
      .activeChart()
      .createStudy('Volume', false, false, {}, { 'volume ma.visible': false })
      .then(function (studyId) {
        window.volumeStudyId = studyId;
      })
      .catch(function () {
        // Volume study creation failed
      });
  } catch (e) {
    // Not critical
  }
}

function handleToggleVolume(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload) return;

  if (payload.visible && !window.volumeStudyId) {
    createVolumeStudy();
  } else if (!payload.visible && window.volumeStudyId) {
    try {
      window.chartWidget.activeChart().removeEntity(window.volumeStudyId);
    } catch (e) {
      // Already removed
    }
    window.volumeStudyId = null;
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

function resolvePendingGetBars(pending) {
  var currentOldest =
    window.ohlcvData.length > 0 ? window.ohlcvData[0].time : 0;

  if (currentOldest >= pending.oldestAtDefer) {
    pending.onResult([], { noData: true });
    return;
  }

  // Return only the newly fetched bars (older than what we had before deferring).
  // TradingView already has bars from oldestAtDefer onward.
  var bars = [];
  for (var i = 0; i < window.ohlcvData.length; i++) {
    var b = window.ohlcvData[i];
    if (b.time < pending.oldestAtDefer) {
      bars.push({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      });
    }
  }

  pending.onResult(bars, { noData: false });
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
        data_status: 'streaming',
      });
    }, 0);
  },

  getBars: function (symbolInfo, resolution, periodParams, onResult, onError) {
    try {
      var fromMs = periodParams.from * 1000;
      var toMs = periodParams.to * 1000;
      var countBack = periodParams.countBack;
      var firstRequest = periodParams.firstDataRequest;

      var bars = filterBarsForRange(fromMs, toMs, countBack);

      if (bars.length > 0) {
        onResult(bars, { noData: false });
        return;
      }

      if (firstRequest || window.ohlcvData.length === 0) {
        onResult([], { noData: true });
        return;
      }

      var oldestTs = window.ohlcvData[0].time;

      window.pendingGetBarsCallback = {
        onResult: onResult,
        oldestAtDefer: oldestTs,
      };

      sendToReactNative('NEED_MORE_HISTORY', { oldestTimestamp: oldestTs });
    } catch (error) {
      onError(error.message);
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
  if (window.chartWidget) return;

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

    // Disabled features are passed from React Native via CONFIG.features.disabledFeatures.
    // Defaults are set in DEFAULT_DISABLED_FEATURES (AdvancedChart.types.ts) and are
    // optimized for the Token Details mobile UX. Consumers needing TradingView's
    // native UI (e.g. Perps) can override via the disabledFeatures prop.
    var disabledFeatures = (features.disabledFeatures || []).slice();

    if (!features.enableDrawingTools) {
      disabledFeatures.push('left_toolbar');
      disabledFeatures.push('context_menus');
    }

    window.chartWidget = new TradingView.widget({
      symbol: window.currentSymbol,
      interval: window.currentResolution || '5',
      container: 'tv_chart_container',
      datafeed: customDatafeed,
      library_path: window.CONFIG.libraryUrl,
      locale: 'en',
      fullscreen: false,
      autosize: true,
      theme: 'Dark',

      disabled_features: disabledFeatures,
      enabled_features: ['study_templates', 'iframe_loading_same_origin'],

      overrides: {
        'paneProperties.background': theme.backgroundColor,
        'paneProperties.backgroundType': 'solid',
        'paneProperties.vertGridProperties.color': theme.borderColor,
        'paneProperties.horzGridProperties.color': theme.borderColor,
        'scalesProperties.textColor': theme.textColor,
        'scalesProperties.lineColor': theme.borderColor,
        'scalesProperties.fontSize': 11,
        'scalesProperties.showStudyLastValue': true,
        'scalesProperties.showSeriesLastValue': true,
        'scalesProperties.showSymbolLabels': true,
        'scalesProperties.showRightScale': true,
        'scalesProperties.showLeftScale': false,
        'paneProperties.bottomMargin': 5,
        'mainSeriesProperties.candleStyle.upColor': theme.successColor,
        'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
        'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
        'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
        'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
        'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
      },

      loading_screen: {
        backgroundColor: theme.backgroundColor,
        foregroundColor: theme.primaryColor,
      },
    });

    window.chartWidget.onChartReady(function () {
      window.isChartReady = true;
      document.getElementById('loading-overlay').classList.add('hidden');

      try {
        var timeScale = window.chartWidget.activeChart().getTimeScale();
        timeScale.defaultRightOffset().setValue(0);
        timeScale.setRightOffset(0);
      } catch (e) {}

      sendToReactNative('CHART_READY', {});

      // Set up crosshair move listener for OHLC overlay
      try {
        window.chartWidget
          .activeChart()
          .crossHairMoved()
          .subscribe(null, function (params) {
            if (
              params &&
              params.price !== undefined &&
              params.time !== undefined
            ) {
              // Find the bar closest to the crosshair time
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
            } else {
              sendToReactNative('CROSSHAIR_MOVE', { data: null });
            }
          });
      } catch (e) {
        // Crosshair subscription not critical
      }

      // Auto-add volume study if showVolume is true (no SMA overlay)
      if (features.showVolume) {
        createVolumeStudy();
      }

      // Process pending messages
      window.pendingMessages.forEach(function (msg) {
        handleMessage({ data: msg });
      });
      window.pendingMessages = [];
    });
  } catch (error) {
    sendToReactNative('ERROR', {
      message: 'Failed to initialize chart: ' + error.message,
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
