/**
 * AUTO-GENERATED - DO NOT EDIT DIRECTLY
 *
 * This file is generated from chartLogic.js by syncChartLogic.js
 * Edit chartLogic.js instead, then run:
 *   node app/components/UI/Charts/AdvancedChart/webview/syncChartLogic.js
 */

// eslint-disable-next-line import/no-default-export
export default `/**
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
// Default line chart (ChartType.Line === 2); RN SET_CHART_TYPE overrides when chart mounts.
window.currentChartType = 2;

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

// Log script initialization - try both console and postMessage
try {
  console.log('[chartLogic.js] Script loaded and initialized');
} catch (e) {
  console.error('[chartLogic.js] Init error:', e);
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
        window.lastPriceShapeId = null;
        window.lineEndDotShapeId = null;
        window.positionShapeIds = [];
        window.realtimeCallbacks = {};
        window.pendingGetBarsCallback = null;
        window.currentChartType = 2;
        initChart();
      }
    } else {
      try {
        window.chartWidget.activeChart().resetData();
        // Re-apply overrides after resetData (resetData can reset to defaults)
        setTimeout(function () {
          if (window.chartWidget && window.isChartReady) {
            applyChartScaleLayout(window.currentChartType);
          }
        }, 0);
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

  // Update price indicators based on current chart type
  if (window.currentChartType === 2) {
    // Line chart: update end dot, ensure no price line
    removeLastPriceLine();
    refreshLineEndDot();
  } else if (window.currentChartType === 1) {
    // Candlestick: update price line, ensure no end dot
    ensureNoLineChartEndIcons();
    createLastPriceLine();
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
 * Line: detach main series from price scale so the plot uses full width; candle: pin to right scale.
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ISeriesApi/
 */
function syncMainSeriesPriceScaleAttachment(isLineChart) {
  if (!window.chartWidget || !window.isChartReady) return;
  try {
    var series = window.chartWidget.activeChart().getSeries();
    if (isLineChart) {
      series.detachNoScale();
    } else {
      series.detachToRight();
    }
  } catch (e) {}
}

/**
 * setChartType() can reset scale attachment after our first layout pass — re-apply line-only
 * scale + markup + time gap shortly after so the series actually expands into the axis gutter.
 */
function scheduleLineChartLayoutReflow() {
  if (window.currentChartType !== 2 || !window.chartWidget) return;
  function run() {
    if (!window.chartWidget || window.currentChartType !== 2) return;
    try {
      syncMainSeriesPriceScaleAttachment(true);
      applyLineChartMarkupAdjustments(true);
      syncTimeScaleRightMargin(true);
    } catch (e) {}
  }
  setTimeout(run, 0);
  setTimeout(run, 50);
  setTimeout(run, 150);
}

function applyChartScaleLayout(type) {
  if (!window.chartWidget) return;

  var theme = window.CONFIG.theme;
  var isLineChart = type === 2;
  var axisLineColor = isLineChart ? theme.backgroundColor : '#444444';

  try {
    window.chartWidget.applyOverrides({
      'scalesProperties.showRightScale': !isLineChart,
      'scalesProperties.showLeftScale': false,
      // Always off: candle last price uses createLastPriceLine only; native last-value pill/dot
      // duplicates that UI and looked like the line-chart end marker bleeding into candles.
      'scalesProperties.showSeriesLastValue': false,
      'scalesProperties.showStudyLastValue': false,
      'scalesProperties.showSymbolLabels': false,
      'scalesProperties.showPriceScaleCrosshairLabel': false,
      'scalesProperties.showTimeScaleCrosshairLabel': !isLineChart,
      'scalesProperties.textColor': isLineChart
        ? theme.backgroundColor
        : theme.textColor,
      // Always off: line has refreshLineEndDot; candle uses createLastPriceLine (no native line/dot).
      'mainSeriesProperties.showPriceLine': false,
      'timeScale.borderColor': axisLineColor,
      'scalesProperties.lineColor': axisLineColor,
      // Separator between main chart and volume panes - cannot be removed, only colored
      // https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartPropertiesOverrides/#panepropertiesseparatorcolor
      'paneProperties.separatorColor': theme.backgroundColor,
      // Center line chart by adding top/bottom margins since axes are hidden
      'paneProperties.topMargin': isLineChart ? 15 : 5,
      'paneProperties.bottomMargin': isLineChart ? 15 : 5,
    });
  } catch (e) {}

  syncMainSeriesPriceScaleAttachment(isLineChart);
  applyLineChartMarkupAdjustments(isLineChart);
  syncTimeScaleRightMargin(isLineChart);
  if (isLineChart) {
    scheduleLineChartLayoutReflow();
  }
}

/**
 * Line chart: small bar gap past the last bar so the 16px end icon is not clipped at the pane
 * edge. Candle: 0 (price scale already consumes right gutter). Slight x-shift vs candle is the
 * trade-off for a full visible dot.
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ITimeScaleApi/
 */
var LINE_END_DOT_PIXEL_BUFFER = 20;
var LINE_CHART_RIGHT_GAP_BARS_MAX = 6;
/** Room before the Y-axis so createLastPriceLine’s label/anchor isn’t clipped on candles. */
var CANDLE_CHART_RIGHT_GAP_BARS = 1;

function lineChartRightGapBars(timeScale) {
  var bs = 4;
  try {
    bs = timeScale.barSpacing();
  } catch (e) {}
  var n = Math.ceil(LINE_END_DOT_PIXEL_BUFFER / Math.max(bs, 0.25));
  return Math.min(LINE_CHART_RIGHT_GAP_BARS_MAX, Math.max(1, n));
}

function syncTimeScaleRightMargin(isLineChart) {
  if (!window.chartWidget) return;
  try {
    var ts = window.chartWidget.activeChart().getTimeScale();
    ts.usePercentageRightOffset().setValue(false);
    if (isLineChart) {
      var gap = lineChartRightGapBars(ts);
      ts.defaultRightOffset().setValue(gap);
      ts.setRightOffset(gap);
    } else {
      ts.defaultRightOffset().setValue(CANDLE_CHART_RIGHT_GAP_BARS);
      ts.setRightOffset(CANDLE_CHART_RIGHT_GAP_BARS);
    }
  } catch (e) {}
}

/**
 * Line-only: collapse the *main pane* price-scale column (first chart row). Avoid targeting every
 * tr > td:last-child so the time-scale row layout stays intact. Candlestick path removes this style.
 */
function applyLineChartMarkupAdjustments(isLineChart) {
  var id = 'tv-line-chart-markup';
  var existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }
  if (!isLineChart) {
    return;
  }
  var bg = window.CONFIG.theme.backgroundColor;
  var style = document.createElement('style');
  style.id = id;
  style.textContent =
    '#tv_chart_container{overflow:visible!important;}' +
    '#tv_chart_container .chart-markup-table{width:100%!important;table-layout:fixed!important;}' +
    '#tv_chart_container .chart-markup-table tr:first-child>td:first-child{' +
    'width:100%!important;overflow:visible!important;box-sizing:border-box!important;}' +
    '#tv_chart_container .chart-markup-table tr:first-child>td:last-child{' +
    'display:none!important;width:0!important;min-width:0!important;max-width:0!important;' +
    'padding:0!important;margin:0!important;overflow:hidden!important;' +
    'border-color:' +
    bg +
    '!important;border-right:none!important;}' +
    '#tv_chart_container .chart-markup-table tr:last-child td{' +
    'border-bottom-color:' +
    bg +
    '!important;}';
  document.head.appendChild(style);
}

function handleSetChartType(payload) {
  if (!window.chartWidget) return;

  var type = payload.type;
  window.currentChartType = type;

  if (!window.isChartReady) return;

  // Immediately remove old indicators when switching types (don't wait for setTimeout)
  if (type === 2) {
    removeLastPriceLine();
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
        refreshLineEndDot();
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
// Single last-close price label via horizontal_line shape
// ============================================
window.lastPriceShapeId = null;

function createLastPriceLine() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.ohlcvData.length === 0) return;

  // Custom shape duplicates the native last-price UI — only for candlesticks (type 1).
  if (window.currentChartType !== 1) {
    removeLastPriceLine();
    return;
  }

  removeLastPriceLine();

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;
  var chartTypeAtCreation = window.currentChartType;

  chart
    .createShape(
      { price: lastBar.close },
      {
        shape: 'horizontal_line',
        lock: true,
        overrides: {
          linecolor: color,
          linestyle: 2,
          linewidth: 1,
          showLabel: false,
          showPrice: true,
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
    })
    .catch(function (e) {
      // Silent catch - shape creation can fail if chart state changes
    });
}

function removeLastPriceLine() {
  if (window.lastPriceShapeId) {
    try {
      window.chartWidget.activeChart().removeEntity(window.lastPriceShapeId);
    } catch (e) {}
    window.lastPriceShapeId = null;
  }
}

// ============================================
// Line chart end dot (~16px design): native line has no marker size API
// ============================================
window.lineEndDotShapeId = null;

function removeLineEndDot() {
  if (!window.lineEndDotShapeId || !window.chartWidget) return;
  try {
    window.chartWidget.activeChart().removeEntity(window.lineEndDotShapeId);
  } catch (e) {}
  window.lineEndDotShapeId = null;
}

/**
 * Line end marker is a Drawing API \`icon\` shape. Remove by id and sweep getAllShapes — pending
 * createShape promises can leave orphan icons on candle mode after fast toggles.
 */
function ensureNoLineChartEndIcons() {
  if (window.currentChartType === 2) return;
  removeLineEndDot();
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
  removeLineEndDot();
  if (
    window.currentChartType !== 2 ||
    !window.chartWidget ||
    !window.isChartReady ||
    window.ohlcvData.length === 0
  ) {
    return;
  }

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;
  var t = Math.floor(lastBar.time / 1000);

  // Drawings API: icon + size matches design (16px); circle tool has no radius override.
  // https://www.tradingview.com/charting-library-docs/latest/customization/overrides/Drawings-Overrides/
  chart
    .createShape(
      { time: t, price: lastBar.close },
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
      if (window.currentChartType !== 2) {
        if (id) {
          try {
            chart.removeEntity(id);
          } catch (e) {}
        }
        return;
      }
      if (id) {
        window.lineEndDotShapeId = id;
      }
    })
    .catch(function () {});
}

// ============================================
// Volume Helpers
// ============================================
window.volumeStudyId = null;

function createVolumeStudy() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.volumeStudyId) return;

  try {
    var chart = window.chartWidget.activeChart();
    var theme = window.CONFIG.theme;
    chart
      .createStudy(
        'Volume',
        false,
        false,
        {},
        {
          'volume ma.display': 0, // Hide moving average line
          'volume.color.0': theme.errorColor, // Down/bearish bars (red)
          'volume.color.1': theme.successColor, // Up/bullish bars (green)
          'volume.transparency': 0, // No transparency - same shade as candles
        },
      )
      .then(function (studyId) {
        window.volumeStudyId = studyId;
        try {
          var heights = chart.getAllPanesHeight();
          if (heights.length === 2) {
            var total = heights[0] + heights[1];
            chart.setAllPanesHeight([
              Math.round(total * 0.78),
              Math.round(total * 0.22),
            ]);
          }
        } catch (e) {}
      })
      .catch(function () {});
  } catch (e) {}
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

      disabled_features: disabledFeatures.concat(
        'use_localstorage_for_settings',
      ),
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
          // Axis border lines: visible by default, hidden dynamically for line chart
          'scalesProperties.lineColor': '#444444',
          'timeScale.borderColor': '#444444',
          'scalesProperties.fontSize': 11,
          'scalesProperties.showStudyLastValue': false, // Hides volume label
          'scalesProperties.showSeriesLastValue': false, // Hides open/close labels
          'scalesProperties.showSymbolLabels': false, // Hides "ASSET" text
          'scalesProperties.showRightScale': true,
          'scalesProperties.showLeftScale': false,
          // Hide crosshair labels (price/time labels that appear on long press)
          'scalesProperties.showPriceScaleCrosshairLabel': false,

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
      window.isChartReady = true;
      document.getElementById('loading-overlay').classList.add('hidden');

      // Apply RN messages (e.g. SET_CHART_TYPE) before drawing last-price shape so
      // currentChartType and TradingView overrides stay in sync.
      window.pendingMessages.forEach(function (msg) {
        handleMessage({ data: msg });
      });
      window.pendingMessages = [];

      applySeriesColors();
      applyChartScaleLayout(window.currentChartType);

      // Initialize price indicators based on chart type
      if (window.currentChartType === 2) {
        // Line chart: show end dot, no price line
        removeLastPriceLine();
        refreshLineEndDot();
      } else {
        // Candlestick: show price line, no end dot
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

      // After zoom, re-apply small line-only right gap + repaint end dot (syncTimeScaleRightMargin).
      var lineChartBarGapDebounce = null;
      try {
        window.chartWidget
          .activeChart()
          .getTimeScale()
          .barSpacingChanged()
          .subscribe(null, function () {
            if (window.currentChartType !== 2) return;
            if (lineChartBarGapDebounce) {
              clearTimeout(lineChartBarGapDebounce);
            }
            lineChartBarGapDebounce = setTimeout(function () {
              lineChartBarGapDebounce = null;
              if (window.currentChartType !== 2 || !window.chartWidget) return;
              try {
                var tsGap = window.chartWidget.activeChart().getTimeScale();
                tsGap.usePercentageRightOffset().setValue(false);
                var g = lineChartRightGapBars(tsGap);
                tsGap.defaultRightOffset().setValue(g);
                tsGap.setRightOffset(g);
                setTimeout(function () {
                  refreshLineEndDot();
                }, 0);
              } catch (err) {}
            }, 80);
          });
      } catch (e) {}

      sendToReactNative('CHART_READY', {});

      // Set up crosshair move listener for OHLC overlay
      // TradingView activates crosshair on long-press internally.
      // We forward all crosshair data and dismiss on short tap.
      try {
        window.ohlcvBarVisible = false;
        window.ohlcvBarShownAt = 0;
        window.ohlcvDismissUntil = 0;

        window.chartWidget
          .activeChart()
          .crossHairMoved()
          .subscribe(null, function (params) {
            if (
              !params ||
              params.price === undefined ||
              params.time === undefined
            ) {
              return;
            }

            if (Date.now() < window.ohlcvDismissUntil) return;

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
            setTimeout(function () {
              sendToReactNative('CROSSHAIR_MOVE', { data: null });
            }, 50);
          }
        });
      } catch (e) {
        // Crosshair subscription not critical
      }
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
`;
