/**
 * AUTO-GENERATED - DO NOT EDIT DIRECTLY
 *
 * This file is generated from chartLogic.js by syncChartLogic.js
 * Edit chartLogic.js instead, then run:
 *   node app/components/UI/Charts/AdvancedChart/webview/syncChartLogic.js
 */

// eslint-disable-next-line import-x/no-default-export
export default `/**
 * TradingView Chart WebView Logic
 *
 * Generic charting logic for TradingView Advanced Charts.
 * Embedded into the WebView HTML at runtime via chartLogicString.ts.
 *
 * CONFIG is injected before this script runs and contains:
 * - libraryUrl: string
 * - theme: { backgroundColor, borderColor, textColor, successColor, errorColor, primaryColor }
 * - lineChrome: { hideTimeScale, showLastPriceLine } (line chart only; optional for older templates)
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
window.lineChromeOverrides = {};
window.lineLastPriceShapeId = null;

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

function getLineChrome() {
  var base = (window.CONFIG && window.CONFIG.lineChrome) || {};
  var ovr = window.lineChromeOverrides || {};
  return {
    hideTimeScale:
      ovr.hideTimeScale !== undefined
        ? !!ovr.hideTimeScale
        : !!base.hideTimeScale,
    showLastPriceLine:
      ovr.showLastPriceLine !== undefined
        ? !!ovr.showLastPriceLine
        : !!base.showLastPriceLine,
  };
}

function handleSetLineChrome(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.hideTimeScale !== undefined) {
    window.lineChromeOverrides.hideTimeScale = !!payload.hideTimeScale;
  }
  if (payload.showLastPriceLine !== undefined) {
    window.lineChromeOverrides.showLastPriceLine = !!payload.showLastPriceLine;
  }
  if (!window.isChartReady || !window.chartWidget) return;
  applyChartScaleLayout(window.currentChartType);
  if (window.currentChartType === 2) {
    refreshLineChartOverlays();
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
        window.lineLastPriceShapeId = null;
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
        try {
          requestAnimationFrame(function () {
            if (window.chartWidget && window.isChartReady) {
              applyChartScaleLayout(window.currentChartType);
              if (window.currentChartType === 2) {
                refreshLineChartOverlays();
              }
            }
          });
        } catch (e) {
          setTimeout(function () {
            if (window.chartWidget && window.isChartReady) {
              applyChartScaleLayout(window.currentChartType);
              if (window.currentChartType === 2) {
                refreshLineChartOverlays();
              }
            }
          }, 0);
        }
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
    removeAllLastPriceHorizontalOverlays();
    refreshLineChartOverlays();
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
  /** Match pane background so time/price scale rules disappear; labels use textColor above. */
  var axisLineColor = theme.backgroundColor || '#131416';

  try {
    window.chartWidget.applyOverrides({
      'scalesProperties.showRightScale': true,
      'scalesProperties.showLeftScale': false,
      'scalesProperties.showSeriesLastValue': false,
      'scalesProperties.showStudyLastValue': false,
      'scalesProperties.showSymbolLabels': false,
      'scalesProperties.showPriceScaleCrosshairLabel': true,
      'scalesProperties.showTimeScaleCrosshairLabel': true,
      'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
      'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',
      'scalesProperties.textColor': theme.textColor,
      'mainSeriesProperties.showPriceLine': false,
      'timeScale.borderColor': axisLineColor,
      'scalesProperties.lineColor': axisLineColor,
      'paneProperties.separatorColor': theme.backgroundColor,
      'paneProperties.topMargin': 5,
      // Same margin in both modes so scale padding (and logo anchor) does not shift on toggle.
      'paneProperties.bottomMargin': 5,
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
    window.currentChartType === 2 ? getLineChrome().hideTimeScale : false,
  );
}

/**
 * Line chart: small right gap so the end dot isn’t flush/clipped against the pane edge.
 * Candle: small offset so createLastPriceLine isn’t clipped at the Y-axis.
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ITimeScaleApi/
 */
var LINE_CHART_RIGHT_OFFSET_BARS = 1;
var CANDLE_CHART_RIGHT_GAP_BARS = 1;

function syncTimeScaleRightMargin(isLineChart) {
  if (!window.chartWidget) return;
  try {
    var ts = window.chartWidget.activeChart().getTimeScale();
    ts.usePercentageRightOffset().setValue(false);
    var gap = isLineChart
      ? LINE_CHART_RIGHT_OFFSET_BARS
      : CANDLE_CHART_RIGHT_GAP_BARS;
    ts.defaultRightOffset().setValue(gap);
    ts.setRightOffset(gap);
  } catch (e) {}
}

/**
 * TradingView adds \`chart-markup-table\` to the root and to inner cells; \`querySelector('.chart-markup-table')\`
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
 * (same pattern as tv-pane-separator-hide). No effect on candle mode when hide is false.
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

/** CSS selector prefix: top window uses \`#tv_chart_container \`; chart iframe document uses none. */
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
 * Mobile Advanced Charts show Auto / Log toggles (DOM: class substring \`priceScaleModeButtons\`).
 * No documented \`disabled_features\` entry matches this; hide the control group in the chart document.
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
 * Remove injected CSS that hides the pane separator between main series and Volume.
 */
function removeCandleVolumeScaleMarkup() {
  removeInjectedStyleByIdFromChartDocs('tv-pane-separator-hide');
}

/**
 * Candle + Volume: blend the pane splitter, hide the empty error-card layer, paint TV’s #131416
 * shell (\`screen-*\`, widget) to the pane color, and fix the time-scale row flex/width.
 *
 * Selectors must target only the outer \`chart-widget > .chart-markup-table\` — inner nodes also
 * use \`chart-markup-table\` (e.g. \`.pane\`), so \`.chart-markup-table > div:last-child\` was matching
 * the wrong subtree and breaking the time-axis row (black gutter under volume, misaligned border).
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
  style.id = 'tv-pane-separator-hide';
  // Hide pane separator entirely so it cannot sit under price-scale / floating labels.
  // If chart layout between main + volume panes regresses, revert to blending (1px + pane bg).
  // display:none removes the node from layout and hides it; extra visibility/size rules are redundant.
  var sepHide = 'display:none!important;';
  var errHide =
    'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;' +
    'width:0!important;height:0!important;overflow:hidden!important;';
  // Last direct row under the outer table = time-scale flex row (not a descendant \`.pane\` table).
  var timeRowFix =
    'display:flex!important;width:100%!important;align-items:stretch!important;' +
    'background:' +
    bg +
    '!important;';
  var timeAxisFix =
    'flex:1 1 auto!important;min-width:0!important;width:auto!important;max-width:none!important;' +
    'background:' +
    bg +
    '!important;';
  var timeCanvasFix =
    'width:100%!important;max-width:100%!important;box-sizing:border-box!important;';
  var axisCellBg = 'background:' + bg + '!important;';

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
    '!important;}' +
    sel.chartRootSel +
    ' > div:first-child .pane .chart-gui-wrapper{' +
    'overflow:visible!important;' +
    '}' +
    sel.chartRootSel +
    ' [class*="paneSeparator"]{' +
    sepHide +
    '}' +
    sel.chartRootSel +
    ' [class*="errorCardRendererContainer"]{' +
    errHide +
    '}' +
    sel.chartRootSel +
    '>div:last-child{' +
    timeRowFix +
    '}' +
    sel.chartRootSel +
    '>div:last-child .time-axis{' +
    timeAxisFix +
    '}' +
    sel.chartRootSel +
    '>div:last-child .time-axis canvas{' +
    timeCanvasFix +
    '}' +
    sel.chartRootSel +
    '>div:last-child [class*="price-axis-container"]{' +
    axisCellBg +
    '}';
  (targetDoc.head || targetDoc.documentElement).appendChild(style);
}

function handleSetChartType(payload) {
  if (!window.chartWidget) return;

  var type = payload.type;
  window.currentChartType = type;

  if (!window.isChartReady) return;

  // Immediately remove old indicators when switching types (don't wait for setTimeout)
  if (type === 2) {
    removeAllLastPriceHorizontalOverlays();
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
// Single last-close price label via horizontal_line shape
// ============================================
window.lastPriceShapeId = null;

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

  removeAllLastPriceHorizontalOverlays();

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;

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

/**
 * Clears last-close horizontal_line overlays for both chart modes. Candle mode
 * tracks lastPriceShapeId; line mode tracks lineLastPriceShapeId — same sweep,
 * both refs must be nulled when removing drawings.
 */
function removeAllLastPriceHorizontalOverlays() {
  sweepNonPositionHorizontalLines();
  window.lastPriceShapeId = null;
  window.lineLastPriceShapeId = null;
}

function createLineLastPriceLine() {
  if (!window.chartWidget || !window.isChartReady) return;
  if (window.ohlcvData.length === 0) return;

  var shouldDrawLineLastPrice =
    window.currentChartType === 2 && getLineChrome().showLastPriceLine;

  removeAllLastPriceHorizontalOverlays();

  if (!shouldDrawLineLastPrice) {
    return;
  }

  var lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  var chart = window.chartWidget.activeChart();
  var color = window.CONFIG.theme.successColor;

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
      if (window.currentChartType !== 2 || !getLineChrome().showLastPriceLine) {
        if (id) {
          try {
            chart.removeEntity(id);
          } catch (e) {}
        }
        return;
      }
      window.lineLastPriceShapeId = id;
    })
    .catch(function () {});
}

function refreshLineChartOverlays() {
  refreshLineEndDot();
  if (window.currentChartType === 2 && getLineChrome().showLastPriceLine) {
    createLineLastPriceLine();
  } else {
    removeAllLastPriceHorizontalOverlays();
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
            // Default ~22% volume is often too short — TV draws the watermark on the bottom pane
            // and the ring is canvas-clipped. Min height keeps the logo visible *and* matches the
            // same bottom-corner placement as line mode (single full-height pane).
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
    updateCandleVolumeScaleColumnVisibility();
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
          'scalesProperties.showSeriesLastValue': false,
          'scalesProperties.showSymbolLabels': false,
          'scalesProperties.showRightScale': true,
          'scalesProperties.showLeftScale': false,
          'scalesProperties.showPriceScaleCrosshairLabel': true,
          'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
          'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',

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

      scheduleHidePriceScaleModeButtons();

      // Initialize price indicators based on chart type
      if (window.currentChartType === 2) {
        removeAllLastPriceHorizontalOverlays();
        refreshLineChartOverlays();
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
                if (window.currentChartType === 2) {
                  syncTimeScaleRightMargin(true);
                  try {
                    requestAnimationFrame(refreshLineChartOverlays);
                  } catch (rafDot) {}
                }
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
