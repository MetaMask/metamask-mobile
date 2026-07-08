/* istanbul ignore file -- Browser-only TradingView script covered via AdvancedChartTemplate tests. */
/* global globalThis */
/**
 * TradingView Chart WebView Logic
 *
 * Generic charting logic for TradingView Advanced Charts.
 * Embedded into the WebView HTML at runtime via chartLogicString.ts.
 *
 * CONFIG is injected before this script runs and contains:
 * - libraryUrl: string
 * - theme: { backgroundColor, borderColor, textColor, textAlternativeColor, successColor, errorColor, primaryColor }
 * - lineChrome: { hideTimeScale, useCustomLineEndMarker, useCustomDashedLastPriceLine,
 *   useCustomPriceLabels }
 *   Fully resolved on RN via `resolveLineChromeOptions` (inline CONFIG + `SET_LINE_CHROME`).
 *   WebView reads `CONFIG.lineChrome` only; omitted keys coerce to false (built-in-first).
 * - useSubscriptPriceFormat: boolean — TV built-in scale/pill subscript notation (default false)
 * - indicatorColors: { MA, MACD, RSI, BOL } — sourced from indicatorColors.ts
 */

// ============================================
// Global State
// ============================================
window.chartWidget = null;
window.ohlcvData = [];
window.currentSymbol = 'ASSET';
window.activeStudies = new Map();
window.maStudies = new Map();
/** name → studyId, insertion order = legend pill order (Maps preserve add order). */
window.legendStudyOrder = new Map();
window.positionShapeIds = [];
window.tradeMarkerShapeIds = [];
/** Map<tradeId, shapeEntityId> so a specific trade marker can be pulsed on demand. */
window.tradeMarkerShapeIdsById = new Map();
/** Latest full marker set from RN; markers are (re)drawn as their candles load (draw-on-pan). */
window.tradeMarkersData = null;
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
/**
 * RN-backed pagination: when enabled, getBars sends FETCH_OLDER_BARS_REQUEST to RN
 * instead of fetching the Price API directly. Used when the data source is only
 * accessible from RN (e.g. Perps candle channel via PerpsController).
 */
window.rnBackedPagination = { enabled: false };
/** Pending getBars callbacks waiting for a FETCH_OLDER_BARS_RESPONSE from RN. */
window.pendingOlderBarsCallbacks = new Map();
/** Monotonic request id suffix for RN-backed older-bars requests. */
globalThis.olderBarsRequestSeq = 0;
/** Bumped on each `SET_OHLCV_DATA` so in-flight fetches from a previous series are discarded. */
window.ohlcvGeneration = 0;
/** Visible-range start (ms) from RN; used to clip bars on first load so the chart auto-fits correctly. */
window.visibleFromMs = null;
/** Visible-range end (ms) from RN; anchors the timeframe `to` to the last candle instead of Date.now(). */
window.visibleToMs = null;
// ============================================
// SocialLeaderboard (Social Trading) namespace — `slb*` / `__slb*` / `SLB_*`
// ----------------------------------------------------------------------------
// Everything prefixed `slb`/`__slb`/`SLB_` in this file is owned by the
// SocialLeaderboard team (Trader Position chart). The prefix is a temporary
// name-scope so these functions/globals can't collide with other consumers'
// additions (e.g. Perps in PR #31247) until this file is split per-team.
// Other teams: do not call these directly; duplicate under your own prefix if
// you need similar behavior.
// ============================================
/**
 * True while a viewport-centering pagination loop is running. Cold init applies the
 * centered range twice (on `dataReady` and again after a 350ms settle); this guard
 * stops the second pass from starting a concurrent `slbPaginateOlderBarsUntil` against
 * the same cursor (which would double-fetch and duplicate bars). Reset on each new
 * series in `handleSetOHLCVData` so an aborted (superseded-generation) loop never
 * strands the flag.
 */
window.__slbCenteringInFlight = false;
// Default line chart (ChartType.Line === 2); RN SET_CHART_TYPE overrides when chart mounts.
window.currentChartType = 2;
window.lineLastPriceShapeId = null;
window.hasExplicitCurrentPriceLine = false;
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
// Indicator colors from CONFIG (single source of truth in indicatorColors.ts)
// ============================================
const _ic = window.CONFIG?.indicatorColors ?? {};
const _maColors = _ic.MA ?? {};
const _macdColors = _ic.MACD ?? {};
const _rsiColors = _ic.RSI ?? {};
const _bolColors = _ic.BOL ?? {};

function getMAColor(name, fallback) {
  return _maColors[name] || fallback;
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

/**
 * Cold init: deferred settle never starts (no resetData), so RN would only unblock indicators
 * via fallback. Fire CHART_LAYOUT_SETTLED after TV finishes its initial layout pass.
 */
function scheduleInitialColdLayoutSettled() {
  if (window.__mmLayoutSettlePending) {
    return;
  }
  setTimeout(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!window.chartWidget || !window.isChartReady) {
          return;
        }
        if (window.__mmLayoutSettlePending) {
          return;
        }
        scheduleChartLayoutSettledNotify();
      });
    });
  }, 220);
}

/** Re-run widget resize after studies mount so overlay lines align with the price scale. */
function scheduleChartWidgetResize() {
  if (!window.chartWidget) {
    return;
  }
  function run() {
    if (!window.chartWidget) {
      return;
    }
    try {
      window.chartWidget.resize();
    } catch (e) {}
  }
  try {
    requestAnimationFrame(function () {
      requestAnimationFrame(run);
    });
  } catch (e) {
    setTimeout(run, 0);
  }
  setTimeout(run, 120);
}

/** Milliseconds to wait if TradingView never calls `getBars` again after `resetData` (e.g. same-resolution cache). */
const LAYOUT_SETTLE_DATA_FALLBACK_MS = 400;

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
 * - Refreshes the custom study legend when indicators/MAs are active (see inline comment below).
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

  /**
   * Interval / time-range hot reload (`handleSetOHLCVData` → `resetData`) keeps MA and sub-pane
   * studies mounted; TradingView recalculates their series from the new bars, but our legend is a
   * separate DOM overlay (`#study-legend-overlay`) fed by a one-shot `chart.exportData()` snapshot
   * in `refreshStudyLegendFromExport`. Without re-export here, pills like MA(10) would keep showing
   * the pre-switch value even though the plotted line already moved (regression vs WebView remount,
   * which recreated studies and triggered legend refresh via `subscribeStudyDataLoaded`).
   */
  if (
    window.legendStudyOrder.size > 0 ||
    window.activeStudies.size > 0 ||
    window.maStudies.size > 0
  ) {
    refreshStudyLegendFromExport();
  }

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
 * 1. Post-`resetData` `getBars` with `firstDataRequest` and pending → `queueTryCompleteLayoutSettleAfterData`.
 * 2. Post-`resetData`, `queueLayoutSettleAfterChartDataLoaded` waits for TV `onDataLoaded`.
 * 3. `finishDeferredGetBars` (history pagination) calls the pending `onResult` → same queue as (1).
 * 4. `LAYOUT_SETTLE_DATA_FALLBACK_MS` elapses without (1)–(3) → force complete.
 *
 * **Errors:** Use `abortDeferredLayoutSettleAndNotify` so RN never stays stuck with the skeleton on.
 */
/** Pre-`resetData` `getBars` during `setResolution` — deliver empty/noData, not real bars. */
function isHotReloadPreResetGetBars(firstDataRequest) {
  return !!firstDataRequest && globalThis.__mmInHotReloadPreResetPhase;
}

function resetDatafeedCacheBeforeHotReload() {
  if (!globalThis.chartWidget) {
    return;
  }
  try {
    if (typeof globalThis.chartWidget.resetCache === 'function') {
      globalThis.chartWidget.resetCache();
    }
  } catch (e) {}
}

function resetMainPriceScaleAutoScale(chart) {
  try {
    if (!chart || typeof chart.getPanes !== 'function') {
      return;
    }
    const panes = chart.getPanes();
    const mainPane = panes?.[0];
    if (!mainPane || typeof mainPane.getMainSourcePriceScale !== 'function') {
      return;
    }
    const priceScale = mainPane.getMainSourcePriceScale();
    if (typeof priceScale?.setAutoScale === 'function') {
      priceScale.setAutoScale(true);
    }
  } catch (e) {}
}

/**
 * Waits for TradingView `onDataLoaded` after `resetData` before queuing layout settle.
 * Falls back to `LAYOUT_SETTLE_DATA_FALLBACK_MS` if the event never fires.
 */
function queueLayoutSettleAfterChartDataLoaded(chart) {
  if (!window.__mmLayoutSettlePending || !chart) {
    return;
  }
  var capturedGeneration = window.ohlcvGeneration;
  try {
    var sub = chart.onDataLoaded();
    sub.subscribe(null, function onLoaded() {
      sub.unsubscribe(null, onLoaded);
      if (capturedGeneration !== window.ohlcvGeneration) {
        return;
      }
      if (!window.__mmLayoutSettlePending) {
        return;
      }
      queueTryCompleteLayoutSettleAfterData();
    });
  } catch (e) {}
}

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
  window.__mmInHotReloadPreResetPhase = false;
  scheduleChartLayoutSettledNotify();
}

/**
 * How long (ms) to keep re-asserting the centered visible range after applying it.
 * A one-shot `setVisibleRange` issued during the post-load settle is overridden by
 * TradingView's default "scroll to latest" positioning, so we re-apply every frame
 * for this window — this is what the animated `handleFocusTime` (which sticks) does
 * implicitly, and a single auto-center call did not. Sits within the post-load
 * `suppressChartUserInteraction` window so it never fights a real user gesture.
 */
const SLB_CENTER_VISIBLE_RANGE_HOLD_MS = 700;
/** Bumped on each hold so a newer center / new series cancels an in-flight hold. */
window.__slbCenterHoldGen = 0;

/**
 * Re-asserts `setVisibleRange({from, to})` every animation frame for
 * {@link SLB_CENTER_VISIBLE_RANGE_HOLD_MS}, defeating TradingView's post-load
 * scroll-to-latest that clobbers a single call. Generation- and series-guarded so a
 * newer center or a fresh series stops it; no-ops once the widget is torn down.
 */
function slbHoldCenteredVisibleRange(chart, fromSec, toSec) {
  window.__slbCenterHoldGen = (window.__slbCenterHoldGen || 0) + 1;
  const gen = window.__slbCenterHoldGen;
  const dataGen = window.ohlcvGeneration;
  const startTs = Date.now();
  // Re-asserting the range emits visible-range changes; keep them out of the
  // pan/zoom analytics, matching handleFocusTime's programmatic slide.
  suppressChartUserInteraction(SLB_CENTER_VISIBLE_RANGE_HOLD_MS + 200);

  function apply() {
    if (gen !== window.__slbCenterHoldGen) return;
    if (dataGen !== window.ohlcvGeneration) return;
    if (!window.chartWidget || !window.isChartReady) return;
    try {
      // No options object: passing { percentRightMargin: 0 } makes TradingView
      // anchor to the latest candle and ignore an older from/to, so a historical
      // frame (an old position's trades) snaps back to "today". This matches the
      // working handleFocusTime call, which slides to old trades without issue.
      chart.setVisibleRange({ from: fromSec, to: toSec });
    } catch (e) {}
    if (Date.now() - startTs < SLB_CENTER_VISIBLE_RANGE_HOLD_MS) {
      try {
        requestAnimationFrame(apply);
      } catch (e) {
        setTimeout(apply, 16);
      }
    }
  }

  apply();
}

/**
 * Frames a trade-centered visible range, FIRST paginating older candles into
 * `window.ohlcvData` when `fromMs` predates the loaded page.
 *
 * Two failure modes are handled together:
 * 1. `setVisibleRange` cannot frame a range whose candles aren't loaded —
 *    TradingView snaps the viewport back to the latest candle. Paginating the
 *    target candles into `window.ohlcvData` first lets the `setVisibleRange`'s
 *    `getBars` answer from the in-WebView cache. (The markers can still draw via
 *    draw-on-pan as candles trickle in, which is why the circle appeared while the
 *    chart stayed on "today".)
 * 2. A single `setVisibleRange` during the post-load settle is overridden by
 *    TradingView's scroll-to-latest, so we re-assert it for a short window (see
 *    {@link slbHoldCenteredVisibleRange}).
 *
 * Refreshes trade markers once the range is applied so the circles land in view.
 */
function slbApplyCenteredVisibleRange(chart, fromMs, toMs) {
  if (!chart || typeof chart.setVisibleRange !== 'function') return;
  if (fromMs == null) return;

  function apply() {
    window.__slbCenteringInFlight = false;
    let fromSec = Math.floor(fromMs / 1000);
    let toSec = Math.ceil((toMs != null ? toMs : Date.now()) / 1000);
    let barPadSec = getApproxBarDurationSec() * 2;
    let targetToSec = toSec + barPadSec;

    // A frame ending at/after the latest loaded bar is the trailing window (Token
    // Details): TradingView's scroll-to-latest doesn't fight it, so a single
    // setVisibleRange is enough and we keep the original behavior. A frame ending
    // well BEFORE the latest bar is a historical position (an old trade range) that
    // scroll-to-latest WILL clobber, so re-assert it across the settle window.
    let lastBar = window.ohlcvData[window.ohlcvData.length - 1];
    let lastBarSec = lastBar ? Math.floor(lastBar.time / 1000) : null;
    let isHistoricalFrame = lastBarSec != null && toSec < lastBarSec;

    if (isHistoricalFrame) {
      slbHoldCenteredVisibleRange(chart, fromSec, targetToSec);
    } else {
      try {
        chart.setVisibleRange(
          { from: fromSec, to: targetToSec },
          { percentRightMargin: 0 },
        );
      } catch (e) {}
    }
    scheduleTradeMarkerRefresh();
  }

  let oldest = window.ohlcvData[0] ? window.ohlcvData[0].time : null;
  let needsOlderHistory =
    oldest != null &&
    fromMs < oldest &&
    window.ohlcvPagination &&
    window.ohlcvPagination.nextCursor &&
    window.ohlcvPagination.hasMore;

  if (needsOlderHistory) {
    // A loop is already paginating toward this range (cold init's second pass) —
    // let it finish and apply, rather than racing the same cursor.
    if (window.__slbCenteringInFlight) return;
    window.__slbCenteringInFlight = true;
    slbPaginateOlderBarsUntil(fromMs, apply);
  } else {
    apply();
  }
}

function slbApplyVisibleRangeFromWindow(chart) {
  if (!chart || typeof chart.setVisibleRange !== 'function') return;

  if (window.visibleFromMs == null) {
    try {
      chart.getTimeScale().setRightOffset(2);
    } catch (e) {}
    return;
  }

  slbApplyCenteredVisibleRange(chart, window.visibleFromMs, window.visibleToMs);
}

function slbScheduleVisibleRangeFromWindowAfterDataLoad(chart) {
  function run() {
    slbApplyVisibleRangeFromWindow(chart);
    scheduleTradeMarkerRefresh();
  }

  try {
    if (chart && typeof chart.dataReady === 'function') {
      chart.dataReady(run);
    } else {
      setTimeout(run, 0);
    }
  } catch (e) {
    setTimeout(run, 0);
  }

  // Cold init can report chart ready before drawings can anchor to bars. A
  // delayed second pass mirrors the interval-switch reset path and fixes the
  // initial marker/range race without waiting for the user to change periods.
  setTimeout(run, 350);
}

// ============================================
// Message Handler
// ============================================
function handleMessage(event) {
  try {
    let message =
      typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

    // SET_OHLCV_DATA bootstraps the chart, and FETCH_OLDER_BARS_RESPONSE resolves a
    // datafeed getBars() callback — both can legitimately arrive before `onChartReady`
    // (TradingView calls getBars during initial load). Queuing the older-bars response
    // would deadlock: onChartReady drains the queue, but it cannot fire until the pending
    // getBars callback this response carries is resolved.
    if (
      !window.isChartReady &&
      message.type !== 'SET_OHLCV_DATA' &&
      message.type !== 'FETCH_OLDER_BARS_RESPONSE'
    ) {
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
      case 'SET_SUB_PANE_LAYOUT':
        handleSetSubPaneLayout(message.payload);
        break;
      case 'SET_POSITION_LINES':
        handleSetPositionLines(message.payload);
        break;
      case 'SET_TRADE_MARKERS':
        handleSetTradeMarkers(message.payload);
        break;
      case 'FOCUS_TIME':
        handleFocusTime(message.payload);
        break;
      case 'PULSE_TRADE_MARKER':
        handlePulseTradeMarker(message.payload);
        break;
      case 'REALTIME_UPDATE':
        handleRealtimeUpdate(message.payload);
        break;
      case 'TOGGLE_VOLUME':
        handleToggleVolume(message.payload);
        break;
      case 'SET_MA_VISIBILITY':
        handleSetMAVisibility(message.payload);
        break;
      case 'SET_THEME_COLORS':
        handleSetThemeColors(message.payload);
        break;
      case 'FETCH_OLDER_BARS_RESPONSE':
        handleFetchOlderBarsResponse(message.payload);
        break;
    }
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

/**
 * Effective line chrome from `CONFIG.lineChrome` (resolved on RN before inject / SET_LINE_CHROME).
 */
function getLineChrome() {
  const lc = (window.CONFIG && window.CONFIG.lineChrome) || {};
  return {
    hideTimeScale: !!lc.hideTimeScale,
    useCustomLineEndMarker: !!lc.useCustomLineEndMarker,
    useCustomDashedLastPriceLine: !!lc.useCustomDashedLastPriceLine,
    useCustomPriceLabels: !!lc.useCustomPriceLabels,
  };
}

/** Stores RN `SET_LINE_CHROME` payload onto CONFIG (RN sends fully resolved booleans). */
function resolveLineChromeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return {
    hideTimeScale: !!payload.hideTimeScale,
    useCustomLineEndMarker: !!payload.useCustomLineEndMarker,
    useCustomDashedLastPriceLine: !!payload.useCustomDashedLastPriceLine,
    useCustomPriceLabels: !!payload.useCustomPriceLabels,
  };
}

function handleSetLineChrome(payload) {
  let resolved = resolveLineChromeFromPayload(payload);
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

function detectResolution(data) {
  if (data.length < 2) return '5';
  // Use median of first few diffs to avoid gaps skewing the result
  let diffs = [];
  let len = Math.min(data.length - 1, 10);
  for (let i = 0; i < len; i++) {
    diffs.push(data[i + 1].time - data[i].time);
  }
  diffs.sort(function (a, b) {
    return a - b;
  });
  let median = diffs[Math.floor(diffs.length / 2)];

  // Find closest match
  let keys = Object.keys(INTERVAL_MS_TO_TV);
  let best = '5';
  let bestDist = Infinity;
  for (let k = 0; k < keys.length; k++) {
    let d = Math.abs(Number(keys[k]) - median);
    if (d < bestDist) {
      bestDist = d;
      best = INTERVAL_MS_TO_TV[keys[k]];
    }
  }
  return best;
}

function handleSetOHLCVData(payload) {
  if (!payload || !payload.data || payload.data.length === 0) {
    return;
  }

  // SocialLeaderboard scoping flag (see the slb* namespace banner). RN sets this
  // only for the Social Trading position chart; it gates the SLB-only viewport
  // behavior below so other consumers (Token Details, Perps) keep the original
  // code paths. Set first so every downstream branch in this load sees it.
  window.__slbMode = !!payload.slbMode;

  suppressChartUserInteraction(700);

  window.ohlcvData = payload.data;
  bumpLineChartOhlcvEpoch();
  window.ohlcvGeneration++;
  // A new series supersedes any in-flight centering pagination (its generation
  // guard will abort it without running the apply that clears this flag), so reset
  // here to keep the next centering pass unblocked.
  window.__slbCenteringInFlight = false;

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

  window.rnBackedPagination = payload.rnBackedPagination
    ? { enabled: !!payload.rnBackedPagination.enabled }
    : { enabled: false };

  // Resolve pending older-bar callbacks from the previous series before clearing.
  resolveAllPendingOlderBarsNoData();

  let visibleFromMs =
    payload.visibleFromMs != null ? payload.visibleFromMs : null;
  window.visibleFromMs = visibleFromMs;

  let visibleToMs = payload.visibleToMs != null ? payload.visibleToMs : null;
  window.visibleToMs = visibleToMs;

  let newResolution = detectResolution(window.ohlcvData);

  function scheduleVisibleRangeAfterDataLoad(chart) {
    if (visibleFromMs == null) {
      try {
        chart.getTimeScale().setRightOffset(2);
      } catch (e) {}
      return;
    }
    let capturedGeneration = window.ohlcvGeneration;
    let sub = chart.onDataLoaded();
    sub.subscribe(null, function onLoaded() {
      sub.unsubscribe(null, onLoaded);
      if (capturedGeneration !== window.ohlcvGeneration) {
        return;
      }
      if (window.__slbMode) {
        // SocialLeaderboard: paginate the trade-date candles in before framing
        // them — the reset page only holds recent candles, so a direct
        // setVisibleRange to an older range would otherwise snap back to the
        // latest candle (see slbApplyCenteredVisibleRange).
        slbApplyCenteredVisibleRange(chart, visibleFromMs, visibleToMs);
        return;
      }
      // Default (Token Details / others): frame the trailing window to the last bar.
      let fromSec = Math.floor(visibleFromMs / 1000);
      let lastBar = window.ohlcvData[window.ohlcvData.length - 1];
      let toSec = lastBar
        ? Math.ceil(lastBar.time / 1000)
        : Math.ceil(Date.now() / 1000);
      let barPadSec = getApproxBarDurationSec() * 2;
      try {
        chart.setVisibleRange(
          { from: fromSec, to: toSec + barPadSec },
          { percentRightMargin: 0 },
        );
      } catch (e) {
        // setVisibleRange can fail if chart is mid-teardown
      }
    });
  }

  if (window.chartWidget && window.isChartReady) {
    let previousResolution = window.currentResolution;
    window.currentResolution = newResolution;

    try {
      let chart = window.chartWidget.activeChart();
      if (previousResolution !== newResolution) {
        window.__mmInHotReloadPreResetPhase = true;
        var preResetSeq = (window.__mmHotReloadPreResetSeq =
          (window.__mmHotReloadPreResetSeq || 0) + 1);
        chart.setResolution(newResolution, function () {
          if (window.__mmHotReloadPreResetSeq !== preResetSeq) {
            // Stale callback — a newer interval switch has started; don't interfere.
            return;
          }
          // Pre-reset window is over — post-reset getBars must pass through.
          window.__mmInHotReloadPreResetPhase = false;
          try {
            // Flush the noData:true TV cached from the pre-reset getBars so that
            // resetData() below forces a fresh getBars with real bars.
            resetDatafeedCacheBeforeHotReload();
            beginDeferredLayoutSettleAfterOhlcvReload();
            chart.resetData();
            resetMainPriceScaleAutoScale(chart);
            // resetData()/setResolution drop Drawing API shapes; clear our tracking and
            // re-schedule a draw, otherwise placeTradeMarkers skips the redraw
            // (its id set still matches) and the circles stay gone.
            clearTradeMarkers();
            scheduleVisibleRangeAfterDataLoad(chart);
            queueLayoutSettleAfterChartDataLoaded(chart);
            scheduleTradeMarkerRefresh();
          } catch (eR) {
            abortDeferredLayoutSettleAndNotify();
          }
        });
      } else {
        try {
          resetDatafeedCacheBeforeHotReload();
          beginDeferredLayoutSettleAfterOhlcvReload();
          chart.resetData();
          resetMainPriceScaleAutoScale(chart);
          // resetData() drops the trade-marker shapes; clear our tracking and
          // re-schedule a draw, otherwise placeTradeMarkers skips the redraw
          // (its id set still matches) and the circles stay gone.
          clearTradeMarkers();
          scheduleVisibleRangeAfterDataLoad(chart);
          queueLayoutSettleAfterChartDataLoaded(chart);
          scheduleTradeMarkerRefresh();
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
      window.maStudies = new Map();
      window.legendStudyOrder = new Map();
      window.volumeStudyId = null;
      window.volumeIsOverlay = null;
      window.lastPriceShapeId = null;
      window.lineEndDotShapeId = null;
      window.lineLastPriceShapeId = null;
      window.positionShapeIds = [];
      window.tradeMarkerShapeIds = [];
      window.tradeMarkerShapeIdsById = new Map();
      window.tradeMarkersData = null;
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

  let bar = payload.bar;

  // Append or update the last bar in the local data store
  if (window.ohlcvData.length > 0) {
    let lastBar = window.ohlcvData[window.ohlcvData.length - 1];
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
  let tick = {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
  let guids = Object.keys(window.realtimeCallbacks);
  for (let i = 0; i < guids.length; i++) {
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

/**
 * Indicators that render in a dedicated pane below the main series.
 * Keep in sync with SUB_PANE_INDICATORS in TokenDetails constants.
 */
const SUB_PANE_INDICATOR_NAMES = { MACD: true, RSI: true };

function isSubPaneIndicator(name) {
  return isOwnStringKey(name) && SUB_PANE_INDICATOR_NAMES[name] === true;
}

function hasActiveSubPaneIndicators() {
  if (!window.activeStudies) return false;
  let found = false;
  window.activeStudies.forEach(function (_studyId, name) {
    if (isSubPaneIndicator(name)) found = true;
  });
  return found;
}

/** Reads CONFIG.subPaneHeightRatio; null means TradingView default pane sizing. */
function getSubPaneHeightRatio() {
  const ratio = window.CONFIG && window.CONFIG.subPaneHeightRatio;
  if (typeof ratio !== 'number' || !(ratio > 0 && ratio <= 1)) {
    return null;
  }
  return ratio;
}

function applySubPaneHeightRatio(chart) {
  const ratio = getSubPaneHeightRatio();
  if (ratio === null || !chart) return;
  try {
    const heights = chart.getAllPanesHeight();
    if (heights.length < 2) return;
    const total = heights.reduce(function (sum, h) {
      return sum + h;
    }, 0);
    const bottomCount = heights.length - 1;
    const MIN_MAIN_PX = 72;

    let bottomTotal = Math.round(total * ratio * bottomCount);
    let main = total - bottomTotal;
    if (main < MIN_MAIN_PX) {
      main = MIN_MAIN_PX;
      bottomTotal = total - main;
    }

    const newHeights = [main];
    let remaining = bottomTotal;
    for (let i = 0; i < bottomCount; i++) {
      const h =
        i === bottomCount - 1
          ? remaining
          : Math.floor(bottomTotal / bottomCount);
      newHeights.push(h);
      remaining -= h;
    }
    chart.setAllPanesHeight(newHeights);
  } catch (e) {}
}

function handleSetSubPaneLayout(payload) {
  window.CONFIG = window.CONFIG || {};
  const ratio = payload && payload.heightRatio;
  if (ratio === null || ratio === undefined) {
    delete window.CONFIG.subPaneHeightRatio;
    return;
  }
  if (typeof ratio !== 'number' || !(ratio > 0 && ratio <= 1)) {
    return;
  }
  window.CONFIG.subPaneHeightRatio = ratio;
  if (
    window.chartWidget &&
    window.isChartReady &&
    hasActiveSubPaneIndicators()
  ) {
    applySubPaneHeightRatio(window.chartWidget.activeChart());
  }
}

function handleAddIndicator(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || !payload.name) return;

  let indicatorName = payload.name;
  if (!isOwnStringKey(indicatorName)) return;

  if (window.activeStudies.has(indicatorName)) {
    return;
  }

  try {
    let chart = window.chartWidget.activeChart();
    let studyName, inputs, overrides;

    switch (indicatorName) {
      case 'MACD':
        studyName = 'MACD';
        inputs = { in_0: 12, in_1: 26, in_2: 9 };
        overrides = {
          showLegendValues: false,
          'MACD.color': _macdColors.macd || '#5C8FFF',
          'Signal.color': _macdColors.signal || '#FF6D00',
          'Histogram.color.0': _macdColors.histogramPositive || '#26A69A',
          'Histogram.color.1': _macdColors.histogramNegative || '#EF5350',
        };
        break;
      case 'RSI':
        studyName = 'Relative Strength Index';
        inputs = { in_0: 14 };
        overrides = {
          showLegendValues: false,
          'Plot.color': _rsiColors.plot || '#E91E90',
          'hlines background.visible': false,
        };
        break;
      case 'BOL':
        studyName = 'Bollinger Bands';
        inputs = { in_0: 20, in_1: 2 };
        overrides = {
          showLegendValues: false,
          'Upper.color': _bolColors.upper || '#E040FB',
          'Basis.color': _bolColors.basis || '#E040FB',
          'Lower.color': _bolColors.lower || '#E040FB',
        };
        break;
      case 'MA200':
        studyName = 'Moving Average';
        inputs = { length: 200 };
        overrides = { showLegendValues: false };
        break;
      default:
        studyName = indicatorName;
        inputs = payload.inputs || {};
        overrides = { showLegendValues: false };
        break;
    }

    let promise = chart.createStudy(
      studyName,
      false,
      false,
      inputs,
      overrides || {},
    );

    promise
      .then(function (studyId) {
        window.legendStudyOrder.set(indicatorName, studyId);
        window.activeStudies.set(indicatorName, studyId);
        if (isSubPaneIndicator(indicatorName)) {
          applySubPaneHeightRatio(chart);
        }
        subscribeStudyDataLoaded(studyId, function () {
          refreshStudyLegendFromExport();
        });
        notifyIndicatorAdded(indicatorName, studyId);
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

  let indicatorName = payload.name;
  if (!isOwnStringKey(indicatorName)) return;
  if (!window.activeStudies.has(indicatorName)) return;

  let studyId = window.activeStudies.get(indicatorName);
  if (!studyId) return;

  try {
    let chart = window.chartWidget.activeChart();
    chart.removeEntity(studyId);
    window.activeStudies.delete(indicatorName);
    window.legendStudyOrder.delete(indicatorName);
    refreshStudyLegendFromExport();
    sendToReactNative('INDICATOR_REMOVED', { name: indicatorName });
    if (isSubPaneIndicator(indicatorName) && hasActiveSubPaneIndicators()) {
      applySubPaneHeightRatio(chart);
    }
  } catch (error) {
    sendToReactNative('ERROR', { message: error.message });
  }
}

// ============================================
// MA Study Visibility (built-in Moving Average studies)
// ============================================
const MA_LENGTHS = { MA5: 5, MA10: 10, MA20: 20, MA50: 50, MA200: 200 };
const MA_COLORS = {
  MA5: getMAColor('MA5', '#8B8BF5'),
  MA10: getMAColor('MA10', '#FF6B9D'),
  MA20: getMAColor('MA20', '#F5A623'),
  MA50: getMAColor('MA50', '#B8E62E'),
  MA200: getMAColor('MA200', '#5CC9F5'),
};

function handleSetMAVisibility(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload) return;

  const visible = payload.visible || [];
  const chart = window.chartWidget.activeChart();

  const visibleNames = new Set();
  for (const visibleName of visible) {
    if (isOwnStringKey(visibleName) && MA_LENGTHS[visibleName]) {
      visibleNames.add(visibleName);
    }
  }

  window.maStudies.forEach(function (studyId, name) {
    if (!visibleNames.has(name)) {
      try {
        chart.removeEntity(studyId);
        window.maStudies.delete(name);
        window.legendStudyOrder.delete(name);
        sendToReactNative('INDICATOR_REMOVED', { name: name });
      } catch (e) {}
    }
  });

  const promises = [];

  for (const name of visible) {
    if (!isOwnStringKey(name) || !MA_LENGTHS[name]) continue;
    if (window.maStudies.has(name)) continue;
    const p = chart
      .createStudy(
        'Moving Average',
        false,
        false,
        { length: MA_LENGTHS[name] },
        {
          showLegendValues: false,
          'Plot.color': MA_COLORS[name],
        },
      )
      .then(function (studyId) {
        window.legendStudyOrder.set(name, studyId);
        window.maStudies.set(name, studyId);
        subscribeStudyDataLoaded(studyId, refreshStudyLegendFromExport);
        notifyIndicatorAdded(name, studyId);
      })
      .catch(function (err) {
        sendToReactNative('ERROR', {
          message: 'MA creation failed: ' + name + ' - ' + String(err),
        });
      });
    promises.push(p);
  }

  if (promises.length > 0) {
    Promise.all(promises).then(function () {
      refreshStudyLegendFromExport();
      if (window.currentChartType !== 2) {
        scheduleChartWidgetResize();
      }
    });
  } else {
    refreshStudyLegendFromExport();
  }
}

// ============================================
// Series Color Helper
// ============================================
function generatePaletteShades(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  let shades = [];
  for (let i = 0; i < 19; i++) {
    let t = i / 18;
    let sr, sg, sb;
    if (t < 0.5) {
      let f = 1 - t * 2;
      sr = Math.round(r + (255 - r) * f);
      sg = Math.round(g + (255 - g) * f);
      sb = Math.round(b + (255 - b) * f);
    } else {
      let f2 = (t - 0.5) * 2;
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

// ============================================
// Theme color helpers (series line, last-price overlays, end dot)
// ============================================

/**
 * Ambient / series stroke color: line chart, filled last-close pill, line-end dot.
 * Falls back to successColor when lineColorOverride is unset (ambient feature off).
 * @param {object} [theme] — defaults to window.CONFIG.theme
 */
function getThemeLineColor(theme) {
  const t = theme || (window.CONFIG && window.CONFIG.theme) || {};
  return t.lineColor || t.successColor;
}

/**
 * Custom dashed last-price horizontal_line. Honors currentPriceLineColorOverride when set,
 * else matches series line / filled pill via {@link getThemeLineColor}.
 * @param {object} [theme] — defaults to window.CONFIG.theme
 */
function getThemeLastPriceLineColor(theme) {
  const t = theme || (window.CONFIG && window.CONFIG.theme) || {};
  const lineColor = getThemeLineColor(t);
  return t.currentPriceColor || lineColor;
}

function getBuiltInCrosshairLabelOverrides(theme) {
  const bg =
    theme.crosshairBackgroundColor ||
    theme.sectionBackgroundColor ||
    theme.backgroundColor ||
    '#131416';
  return {
    'scalesProperties.crosshairLabelBgColorDark': bg,
    'scalesProperties.crosshairLabelBgColorLight': bg,
  };
}

/**
 * Price/time scale tick labels. Matches main: CONFIG.theme.textColor (DS text.muted by default).
 * TradingView applies one `scalesProperties.textColor` to price scale, time scale, and built-in
 * crosshair label text.
 */
function getAxisScaleTextColor(theme) {
  return theme.textColor;
}

/** TV built-in crosshair bg and last-value pill when custom DOM labels are off. */
function getBuiltInScaleLabelOverrides(theme, useCustomLabels) {
  const overrides = {
    'scalesProperties.textColor': getAxisScaleTextColor(theme),
  };
  if (!useCustomLabels) {
    Object.assign(overrides, getBuiltInCrosshairLabelOverrides(theme));
    overrides['mainSeriesProperties.priceLineColor'] =
      getThemeLastPriceLineColor(theme);
  }
  return overrides;
}

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

// ============================================
// Chart Type Handler
// ============================================

/**
 * Series stroke colors only (no scale chrome). Scale layout is applyChartScaleLayout.
 */
function applySeriesStyleProperties(lineColor) {
  if (!window.chartWidget || !window.isChartReady) {
    return;
  }
  try {
    let series = window.chartWidget.activeChart().getSeries();
    series.setChartStyleProperties(2, {
      color: lineColor,
      colorType: 'solid',
      linewidth: 2,
    });
    series.setChartStyleProperties(10, {
      topLineColor: lineColor,
      bottomLineColor: lineColor,
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  } catch (e) {}
}

function applySeriesColors() {
  if (!window.chartWidget || !window.isChartReady) {
    return;
  }
  const theme = window.CONFIG?.theme || {};
  const lineColor = getThemeLineColor(theme);
  try {
    window.chartWidget.applyOverrides(
      getSeriesColorOverrides(lineColor, getThemeLastPriceLineColor(theme)),
    );
  } catch (e) {}
  applySeriesStyleProperties(lineColor);
}

function getCurrentPriceVisualColor() {
  const theme = globalThis.CONFIG?.theme || {};
  return theme.currentPriceColor || theme.lineColor || theme.successColor;
}

function getVolumeSuccessColor() {
  const theme = globalThis.CONFIG?.theme || {};
  return theme.volumeSuccessColor || theme.successColor;
}

function getVolumeErrorColor() {
  const theme = globalThis.CONFIG?.theme || {};
  return theme.volumeErrorColor || theme.errorColor;
}

/**
 * Hot-swap theme colors (line, success/up, error/down) without rebuilding the
 * WebView. Uses TradingView's documented runtime APIs in one pass:
 * - widget.applyOverrides() for candles, series line, last-value pill, crosshair labels
 * - series.setChartStyleProperties() for line/area styles
 * - study.applyOverrides() for volume colors
 * - shape.setProperties() for custom drawing chrome (end dot, dashed price line)
 *
 * @see https://www.tradingview.com/charting-library-docs/latest/customization/overrides/
 */
function handleSetThemeColors(payload) {
  if (!payload) return;
  let theme = window.CONFIG.theme;
  if (payload.lineColor != null) theme.lineColor = payload.lineColor;
  if (payload.successColor != null) theme.successColor = payload.successColor;
  if (payload.errorColor != null) theme.errorColor = payload.errorColor;
  if (payload.currentPriceColor != null) {
    theme.currentPriceColor = payload.currentPriceColor;
  }
  if (payload.volumeSuccessColor != null) {
    theme.volumeSuccessColor = payload.volumeSuccessColor;
  }
  if (payload.volumeErrorColor != null) {
    theme.volumeErrorColor = payload.volumeErrorColor;
  }

  if (!window.chartWidget || !window.isChartReady) return;

  const lineColor = getThemeLineColor(theme);
  const lastPriceLineColor = getThemeLastPriceLineColor(theme);
  const useCustomLabels = getLineChrome().useCustomPriceLabels;

  try {
    window.chartWidget.applyOverrides(
      Object.assign(
        {
          'mainSeriesProperties.candleStyle.upColor': theme.successColor,
          'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
        },
        getSeriesColorOverrides(lineColor, lastPriceLineColor),
        getBuiltInScaleLabelOverrides(theme, useCustomLabels),
      ),
    );
  } catch (e) {}

  applySeriesStyleProperties(lineColor);

  let chart = window.chartWidget.activeChart();
  if (window.volumeStudyId) {
    try {
      chart.getStudyById(window.volumeStudyId).applyOverrides({
        'volume.color.0': getVolumeErrorColor(),
        'volume.color.1': getVolumeSuccessColor(),
      });
    } catch (e) {}
  }

  // Update custom DOM pill colors
  let elLast = document.getElementById('last-close-price-label');
  if (elLast) {
    elLast.style.background = lastPriceLineColor;
  }

  // Update Drawing API shapes in-place via setProperties (synchronous, no
  // remove/recreate needed — avoids the async gap from createShape promises).
  if (window.lineEndDotShapeId && window.currentChartType === 2) {
    try {
      chart.getShapeById(window.lineEndDotShapeId).setProperties({
        color: lineColor,
      });
    } catch (e) {}
  }

  if (window.lastPriceShapeId) {
    try {
      chart.getShapeById(window.lastPriceShapeId).setProperties({
        linecolor: lastPriceLineColor,
      });
    } catch (e) {}
  }

  if (window.lineLastPriceShapeId) {
    try {
      chart.getShapeById(window.lineLastPriceShapeId).setProperties({
        linecolor: lastPriceLineColor,
      });
    } catch (e) {}
  }

  // Outline pill + visible-edge re-derive color from theme on next frame
  scheduleLastCloseLabelUpdate();
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

  let theme = window.CONFIG.theme;
  let isLineChart = type === 2;
  let lc = getLineChrome();
  let useCustomLabels = lc.useCustomPriceLabels;
  let useCustomDashed = lc.useCustomDashedLastPriceLine;
  /** Match pane background so time/price scale rules disappear; labels use textColor above. */
  let axisLineColor = theme.backgroundColor || '#131416';
  let separatorColor =
    window.CONFIG.features && window.CONFIG.features.hidePaneSeparator
      ? theme.backgroundColor || '#131416'
      : theme.borderColor;
  let gridLineColor = theme.gridLineColor || 'transparent';

  try {
    window.chartWidget.applyOverrides(
      Object.assign(
        {
          'scalesProperties.showRightScale': true,
          'scalesProperties.showLeftScale': false,
          'scalesProperties.showSeriesLastValue': !useCustomLabels,
          'scalesProperties.showStudyLastValue': false,
          'scalesProperties.showSymbolLabels': false,
          'scalesProperties.showPriceScaleCrosshairLabel': !useCustomLabels,
          'scalesProperties.showTimeScaleCrosshairLabel': !useCustomLabels,
          'paneProperties.vertGridProperties.color': gridLineColor,
          'paneProperties.horzGridProperties.color': gridLineColor,
          'mainSeriesProperties.showPriceLine':
            !useCustomDashed && !window.hasExplicitCurrentPriceLine,
          'mainSeriesProperties.priceLineColor':
            getThemeLastPriceLineColor(theme),
          'timeScale.borderColor': axisLineColor,
          'scalesProperties.lineColor': axisLineColor,
          'paneProperties.separatorColor': separatorColor,
          'paneProperties.topMargin': 12,
          'paneProperties.bottomMargin': 8,
        },
        getBuiltInScaleLabelOverrides(theme, useCustomLabels),
      ),
    );
  } catch (e) {}

  removeLineChartMarkupStyle();
  syncMainSeriesToRightScale();
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
const SUBSCRIPT_DIGITS_CROSSHAIR = [
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
    let priceStr = abs.toFixed(20);
    let match = priceStr.match(/^0\.0*([1-9]\d*)/);
    if (match) {
      let leadingZeros = priceStr.indexOf(match[1]) - 2;
      if (leadingZeros >= 4) {
        let sig = match[1];
        let significantDigits =
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
 * Shared price text for custom DOM pills and TV built-in scale labels (via
 * `custom_formatters.priceFormatterFactory` on widget init). Number only — no currency symbol.
 */
function formatCrosshairPrice(price) {
  if (price === undefined || price === null || isNaN(Number(price))) {
    return '';
  }
  let p = Number(price);
  if (p === 0) {
    return '0.00';
  }
  let abs = Math.abs(p);
  let sub = formatSubscriptNotationCrosshair(abs);
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
 * Advanced Charts price scale + last-value pill formatting (Widget `custom_formatters`).
 * Lightweight Charts uses `localization.priceFormatter`; that does not apply here.
 */
function advancedChartPriceFormatterFactory(symbolInfo, minTick) {
  if (symbolInfo === null || symbolInfo.format === 'volume') {
    return null;
  }
  if (!(window.CONFIG && window.CONFIG.useSubscriptPriceFormat)) {
    return null;
  }
  return {
    format: function (price, signPositive) {
      return formatCrosshairPrice(price);
    },
  };
}

function formatCrosshairTime(timeSeconds) {
  if (
    timeSeconds === undefined ||
    timeSeconds === null ||
    isNaN(Number(timeSeconds))
  ) {
    return '';
  }
  let d = new Date(Number(timeSeconds) * 1000);
  let weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let months = [
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
  let w = weekdays[d.getDay()];
  let day = d.getDate();
  let mo = months[d.getMonth()];
  let y = String(d.getFullYear()).slice(-2);
  let h = String(d.getHours());
  let min = String(d.getMinutes());
  if (h.length < 2) {
    h = '0' + h;
  }
  if (min.length < 2) {
    min = '0' + min;
  }
  return w + ' ' + day + ' ' + mo + " '" + y + ' ' + h + ':' + min;
}

function hideCustomCrosshairLabels() {
  let elP = document.getElementById('crosshair-price-label');
  let elT = document.getElementById('crosshair-time-label');
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
function getMainPriceAxisLeftRelativeTo(el) {
  if (!el || !el.getBoundingClientRect) {
    return null;
  }
  let orect = el.getBoundingClientRect();
  let bestLeft = null;
  let bestTop = Infinity;
  eachChartDocument(function (doc) {
    let nodes = doc.querySelectorAll('.price-axis-container');
    let i;
    for (i = 0; i < nodes.length; i++) {
      let r = nodes[i].getBoundingClientRect();
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
  let maxW = el.clientWidth;
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
  let boundaryLeft = getMainPriceAxisLeftRelativeTo(overlay);
  if (boundaryLeft !== null && !isNaN(boundaryLeft) && boundaryLeft >= 0) {
    let w = el.offsetWidth;
    if (!w || w <= 0) {
      w = 0;
    }
    let pillLeft = boundaryLeft + 2; // Adding 2px to the boundary left to ensure the pill is not too close to the boundary.
    let maxW = overlay.clientWidth;
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
  let elP = document.getElementById('crosshair-price-label');
  let elT = document.getElementById('crosshair-time-label');
  let overlay = document.getElementById('custom-crosshair-overlay');
  if (!elP || !elT || !overlay) {
    return;
  }
  if (!getLineChrome().useCustomPriceLabels) {
    hideCustomCrosshairLabels();
    return;
  }
  let ox = params.offsetX;
  let oy = params.offsetY;
  if (ox === undefined || oy === undefined || isNaN(ox) || isNaN(oy)) {
    hideCustomCrosshairLabels();
    return;
  }
  elP.textContent = formatCrosshairPrice(params.price);
  let tSec = params.time;
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
  let ow = overlay.clientWidth;
  function positionTimeLabel() {
    let tw = elT.offsetWidth;
    let halfTw = tw / 2;
    let clampedOx = Math.max(halfTw, Math.min(ox, ow - halfTw));
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
  let el = document.getElementById('last-close-price-label');
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
  let elC = document.getElementById('custom-series-last-value-label');
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
 * Whether to hide the outline price pill: {@link isCustomLineEndMarkerVisibleInPlot} (geometry) plus
 * {@link isSeriesTailOffScreenByData} so panning to old history (newest bar not in visible window) still
 * shows the outline when coordinateToTime alone would wrongly hide it.
 */
function shouldHideVisibleEdgeOutlinePill(chart, tailSec, ohlcvData) {
  if (tailSec === null || !isFinite(Number(tailSec))) {
    return true;
  }
  const geo = isCustomLineEndMarkerVisibleInPlot(chart, Number(tailSec));
  const dataOff = ohlcvData?.length
    ? isSeriesTailOffScreenByData(chart, ohlcvData)
    : null;
  if (geo === false || dataOff === true) {
    return false;
  }
  return true;
}

/**
 * Outline pill: shown when geometry or data says the series tail is off-screen (see
 * {@link shouldHideVisibleEdgeOutlinePill}).
 */
function updateVisibleEdgeOutlinePriceLabel() {
  const elOut = document.getElementById('custom-series-last-value-label');
  if (!elOut) {
    return;
  }
  const w = window;
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
  const ct = w.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  const chart = w.chartWidget.activeChart();
  const tailBar = w.ohlcvData[w.ohlcvData.length - 1];
  const tailSec = normalizeChartUnixSec(tailBar.time);
  if (shouldHideVisibleEdgeOutlinePill(chart, tailSec, w.ohlcvData)) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  const edgeBar = getVisibleEdgeOutlineBar(chart, w.ohlcvData);
  if (!edgeBar) {
    hideCustomSeriesLastValueLabelDom();
    return;
  }
  let price = Number(edgeBar.close);
  if (ct === 2) {
    const tEdgeMs = getVisiblePlotRightEdgeTimeMs(chart);
    if (tEdgeMs !== null) {
      const pLine = interpolateCloseAlongLineAtTimeMs(w.ohlcvData, tEdgeMs);
      if (pLine !== null && isFinite(pLine)) {
        price = pLine;
      }
    }
  }
  const y = getPriceYForLastCloseOverlay(chart, price);
  if (y === null || y === undefined || isNaN(y)) {
    elOut.style.display = 'none';
    elOut.style.borderColor = '';
    elOut.style.color = '';
    return;
  }
  const resolvedLast = resolveLineEndOverlayPoint(chart);
  const lastClosePrice =
    resolvedLast && isFinite(resolvedLast.price)
      ? resolvedLast.price
      : tailBar.close;
  const yLastClose = getPriceYForLastCloseOverlay(chart, lastClosePrice);

  const theme = (w.CONFIG && w.CONFIG.theme) || {};
  const upColor = theme.successColor || '#0C9F76';
  const lineColor = getThemeLineColor(theme) || upColor;
  const currentPriceColor = getThemeLastPriceLineColor(theme) || lineColor;
  const downColor = theme.errorColor || '#E06470';
  let outlineColor = currentPriceColor;
  if (ct === 1) {
    const o = Number(edgeBar.open);
    const c = Number(edgeBar.close);
    if (!theme.currentPriceColor) {
      outlineColor = isFinite(o) && isFinite(c) && c < o ? downColor : upColor;
    }
  }
  elOut.style.borderColor = outlineColor;
  elOut.style.color = outlineColor;
  elOut.textContent = formatCrosshairPrice(price);
  elOut.style.display = 'flex';
  const overlayOut = document.getElementById('custom-crosshair-overlay');

  let yPos = y;
  positionPricePillAtPlotPriceBoundary(elOut, overlayOut, yPos);
  const gapPx = 4;
  const elLast = document.getElementById('last-close-price-label');
  let hO = elOut.offsetHeight;
  if (!hO || hO < 8) {
    hO = 24;
  }
  /* Nudge outline if it overlaps last-close pill: higher price → above, else below (ties = below). */
  if (
    elLast &&
    elLast.style.display !== 'none' &&
    elLast.offsetHeight > 0 &&
    yLastClose !== null &&
    yLastClose !== undefined &&
    !isNaN(yLastClose)
  ) {
    const hF = elLast.offsetHeight;
    const half = (hF + hO) / 2 + gapPx;
    if (Math.abs(y - yLastClose) < half) {
      const minCenter = hO / 2 + 2;
      const maxCenter =
        overlayOut && overlayOut.clientHeight > 0
          ? overlayOut.clientHeight - hO / 2 - 2
          : Infinity;
      const pOut = Number(price);
      const pLast = Number(lastClosePrice);
      const edgeAboveFilled =
        isFinite(pOut) && isFinite(pLast) ? pOut > pLast : y < yLastClose;
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
 * Y pixel for a price (crosshair overlay space). `getVisiblePriceRange` + `getHeight` + `isInverted`;
 * `getMode() === 1` (log) uses log mapping.
 */
function getPriceYForLastCloseOverlay(chart, price) {
  if (!chart || price === undefined || price === null || isNaN(Number(price))) {
    return null;
  }
  const p = Number(price);
  try {
    const panes = chart.getPanes();
    if (!panes || !panes.length) return null;
    const pane = panes[0];
    const scale = pane.getMainSourcePriceScale();
    if (!scale) return null;

    const range = scale.getVisiblePriceRange();
    if (!range || range.from === undefined || range.to === undefined) {
      return null;
    }
    const lo = Math.min(range.from, range.to);
    const hi = Math.max(range.from, range.to);
    const h = pane.getHeight();
    if (!h || h <= 0) return null;
    const pClamped = Math.min(hi, Math.max(lo, p));
    const inverted =
      typeof scale.isInverted === 'function' && scale.isInverted();
    const mode = typeof scale.getMode === 'function' ? scale.getMode() : 0;
    if (mode === 1 && lo > 0 && hi > 0 && pClamped > 0) {
      const logLo = Math.log(lo);
      const logHi = Math.log(hi);
      const logP = Math.log(pClamped);
      if (logHi === logLo) {
        return inverted ? 0 : h / 2;
      }
      const t = (logP - logLo) / (logHi - logLo);
      return inverted ? t * h : (1 - t) * h;
    }
    if (inverted) {
      return ((pClamped - lo) / (hi - lo)) * h;
    }
    return ((hi - pClamped) / (hi - lo)) * h;
  } catch (e) {
    return null;
  }
}

/**
 * Last-close DOM pill when `useCustomPriceLabels` (candle or line).
 * Stays visible alongside the crosshair price pill (crosshair stacks above when Y aligns).
 */
function updateLastClosePriceLabel() {
  let el = document.getElementById('last-close-price-label');
  if (!el) {
    return;
  }
  let w = window;
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
  let ct = w.currentChartType;
  if (ct !== 1 && ct !== 2) {
    hideLastClosePriceLabelDom();
    return;
  }
  let lastBar = w.ohlcvData[w.ohlcvData.length - 1];
  let chart = w.chartWidget.activeChart();
  let resolved = resolveLineEndOverlayPoint(chart);
  let labelPrice =
    resolved && isFinite(resolved.price) ? resolved.price : lastBar.close;
  let y = getPriceYForLastCloseOverlay(chart, labelPrice);
  if (y === null || y === undefined || isNaN(y)) {
    el.style.display = 'none';
    return;
  }
  el.textContent = formatCrosshairPrice(labelPrice);
  el.style.background = getCurrentPriceVisualColor();
  el.style.display = 'flex';
  let overlay = document.getElementById('custom-crosshair-overlay');
  positionPricePillAtPlotPriceBoundary(el, overlay, y);
}

/**
 * Debounced line-end icon refresh when the time scale pans. Uses `lineChartOhlcvEpoch` so a burst
 * of `onVisibleRangeChanged` during interval switches does not run after newer `SET_OHLCV_DATA`.
 */
let lineEndDotVisibleRangeDebounce = null;

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
  let epochAtSchedule = window.lineChartOhlcvEpoch;
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
      let chart = window.chartWidget.activeChart();
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
  let tick = scheduleLastCloseLabelUpdate;
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
    window.chartWidget.subscribe('panes_height_changed', function () {
      tickIfCustomPriceLabels();
      const legend = document.getElementById('study-legend-overlay');
      if (legend) {
        updateLegendOverlayLayout();
      }
    });
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
        // Re-place trade markers so ones that scroll into the loaded range appear.
        scheduleTradeMarkerRefresh();
      });
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
  let list = doc.querySelectorAll('.chart-markup-table');
  let i;
  let el;
  let cn;
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
    let container = document.getElementById('tv_chart_container');
    let iframe = container && container.querySelector('iframe');
    if (iframe && iframe.contentDocument) {
      fn(iframe.contentDocument);
    }
  } catch (e2) {}
}

let TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;

function isTradingViewExternalHostname(hostname) {
  if (!hostname) return false;
  let h = String(hostname).toLowerCase();
  return (
    h === 'tradingview.com' ||
    h === 'www.tradingview.com' ||
    /\.tradingview\.com$/.test(h)
  );
}

function isTradingViewExternalHref(href) {
  if (!href) return false;
  try {
    let base =
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : 'https://localhost/';
    let u = new URL(href, base);
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
    let t = ev.target;
    if (!t || typeof t.closest !== 'function') {
      return;
    }
    let a = t.closest('a');
    if (!a || !a.href || !isTradingViewExternalHref(a.href)) {
      return;
    }
    let now = Date.now();
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
    let origOpen = win.open.bind(win);
    win.open = function (url, name, specs) {
      if (url != null && url !== '' && isTradingViewExternalHref(String(url))) {
        let now2 = Date.now();
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
    let container = document.getElementById('tv_chart_container');
    let iframe = container && container.querySelector('iframe');
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
    let node = d.getElementById(styleId);
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
  let paneBg =
    window.CONFIG && window.CONFIG.theme && window.CONFIG.theme.backgroundColor
      ? String(window.CONFIG.theme.backgroundColor)
      : '#131416';
  eachChartDocument(function (targetDoc) {
    if (!targetDoc || !targetDoc.getElementById) {
      return;
    }
    let id = 'tv-hide-time-axis';
    let existing = targetDoc.getElementById(id);
    if (existing) {
      existing.remove();
    }
    let sel = tvScopedDomSelectors(targetDoc);
    // Collapse time row — TV keeps chart-markup-table / chart-widget at pane+time height (~204px)
    // while the main row + .pane stay at ~176px inline; the empty strip is transparent and shows
    // .chart-container-border .screen-* (rgb(19,20,22)) as a dark band. Fill that strip with the
    // same surface as the chart and stretch the first row to the full widget height.
    let hide =
      'display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;' +
      'max-height:0!important;overflow:hidden!important;pointer-events:none!important;opacity:0!important;' +
      'flex:0 0 0!important;margin:0!important;padding:0!important;border:none!important;';
    let style = targetDoc.createElement('style');
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
  let shouldHide = window.currentChartType === 2 && hide;
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
  let top = targetDoc === document;
  let p = top ? '#tv_chart_container ' : '';
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
  let id = 'tv-chart-container-unclip';
  let css = buildChartDomUnclipCss(targetDoc);
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
  let container = document.getElementById('tv_chart_container');
  if (!container) {
    return null;
  }
  let table = findOuterChartMarkupTable(document);
  let doc = document;
  if (!table || !container.contains(table)) {
    table = null;
  }
  if (!table) {
    try {
      let iframe = container.querySelector('iframe');
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
  let top = targetDoc === document;
  let p = top ? '#tv_chart_container ' : '';
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
  let id = 'tv-hide-price-scale-mode-buttons';
  if (targetDoc.getElementById(id)) {
    return;
  }
  let style = targetDoc.createElement('style');
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

  let ctx = getChartMarkupTableContext();
  if (!ctx) {
    return;
  }

  let targetDoc = ctx.doc;
  let sel = tvScopedDomSelectors(targetDoc);
  let bg = window.CONFIG.theme.backgroundColor;

  let style = targetDoc.createElement('style');
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

  let type = payload.type;
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
    let ac = window.chartWidget.activeChart();
    ac.setChartType(type);

    const color = getThemeLineColor();
    let series = ac.getSeries();
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
    let capturedType = type;
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
    let chart = window.chartWidget.activeChart();
    for (let i = 0; i < window.positionShapeIds.length; i++) {
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
  if (!payload || !payload.position) {
    window.hasExplicitCurrentPriceLine = false;
    try {
      window.chartWidget.applyOverrides({
        'mainSeriesProperties.showPriceLine':
          !getLineChrome().useCustomDashedLastPriceLine,
      });
    } catch (e) {}
    return;
  }

  let position = payload.position;
  window.hasExplicitCurrentPriceLine = !!position.currentPrice;
  let theme = window.CONFIG.theme;
  try {
    window.chartWidget.applyOverrides({
      'mainSeriesProperties.showPriceLine':
        !getLineChrome().useCustomDashedLastPriceLine &&
        !window.hasExplicitCurrentPriceLine,
    });
  } catch (e) {}
  // Position lines are consumer-specific (currently Perps only); the consumer
  // supplies colors via the payload. Fall back to theme-derived defaults.
  let colors = payload.positionLineColors || {};
  let currentPriceColor =
    colors.currentPrice || getThemeLastPriceLineColor(theme);
  let entryColor = colors.entry || '#858585';
  let takeProfitColor = colors.takeProfit || theme.successColor;
  let stopLossColor = colors.stopLoss || '#858585';
  let liquidationColor = colors.liquidation || theme.errorColor;

  try {
    let chart = window.chartWidget.activeChart();
    let lines = [];

    if (position.currentPrice) {
      lines.push({
        price: position.currentPrice,
        color: currentPriceColor,
        lineStyle: 2,
        lineWidth: 1,
        showLabel: false,
        showPrice: false,
        horzLabelsAlign: 'right',
      });
    }
    if (position.entryPrice) {
      lines.push({
        price: position.entryPrice,
        text: 'Entry',
        color: entryColor,
        lineStyle: 2,
        lineWidth: 1,
        showLabel: true,
        showPrice: true,
        horzLabelsAlign: 'left',
      });
    }
    if (position.takeProfitPrice) {
      lines.push({
        price: position.takeProfitPrice,
        text: 'TP',
        color: takeProfitColor,
        lineStyle: 2,
        lineWidth: 1,
        showLabel: true,
        showPrice: true,
        horzLabelsAlign: 'left',
      });
    }
    if (position.stopLossPrice) {
      lines.push({
        price: position.stopLossPrice,
        text: 'SL',
        color: stopLossColor,
        lineStyle: 2,
        lineWidth: 1,
        showLabel: true,
        showPrice: true,
        horzLabelsAlign: 'left',
      });
    }
    if (position.liquidationPrice) {
      lines.push({
        price: position.liquidationPrice,
        text: 'Liq',
        color: liquidationColor,
        lineStyle: 2,
        lineWidth: 1,
        showLabel: true,
        showPrice: true,
        horzLabelsAlign: 'left',
      });
    }

    for (let i = 0; i < lines.length; i++) {
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
                linewidth: line.lineWidth,
                showLabel: line.showLabel,
                textcolor: line.color,
                fontsize: 11,
                horzLabelsAlign: line.horzLabelsAlign,
                showPrice: line.showPrice,
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
// Trade markers (open/close circles via SET_TRADE_MARKERS)
// ============================================

/** Circle glyph (FontAwesome fa-circle), same icon used for the line-end dot. */
const TRADE_MARKER_ICON = 0xf111;
/** Inner colored circle diameter (px). */
const TRADE_MARKER_SIZE = 10;
/**
 * Outer ring diameter (px). The colored circle ({@link TRADE_MARKER_SIZE}) sits
 * on top, leaving a ~2px black rim around it so the markers are easier to spot.
 */
const TRADE_MARKER_RING_SIZE = 14;
/** Ring/outline color drawn behind every colored circle. */
const TRADE_MARKER_RING_COLOR = '#000000';
/** Bumped when the visible marker set changes so stale async createShape resolves are discarded. */
window.__tradeMarkerGen = 0;
/** Debounce handle for re-placing markers after pan / zoom / pagination. */
let tradeMarkerRefreshDebounce = null;

/**
 * Creates one trade-marker icon (a colored fa-circle anchored at time/price).
 * Returns the `createShape` promise (resolves to the entity id).
 */
function createTradeMarkerIcon(chart, timeSec, price, color, size) {
  return chart.createShape(
    { time: timeSec, price: price },
    {
      // Drawings API: icon + fixed size (matches the line-end dot).
      // https://www.tradingview.com/charting-library-docs/latest/customization/overrides/Drawings-Overrides/
      shape: 'icon',
      icon: TRADE_MARKER_ICON,
      lock: true,
      overrides: {
        color: color,
        size: size,
      },
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      showInObjectsTree: false,
      zOrder: 'top',
    },
  );
}

/** Best-effort `removeEntity` (ignores already-removed / invalid ids). */
function removeMarkerEntity(chart, entityId) {
  if (!entityId) return;
  try {
    chart.removeEntity(entityId);
  } catch (e) {}
}

function clearTradeMarkers() {
  if (!window.chartWidget || !window.isChartReady) return;

  try {
    const chart = window.chartWidget.activeChart();
    for (let i = 0; i < window.tradeMarkerShapeIds.length; i++) {
      try {
        chart.removeEntity(window.tradeMarkerShapeIds[i]);
      } catch (e) {
        // Shape may already be removed
      }
    }
    window.tradeMarkerShapeIds = [];
    window.tradeMarkerShapeIdsById = new Map();
  } catch (error) {
    sendToReactNative('ERROR', {
      message: 'Failed to clear trade markers: ' + error.message,
    });
  }
}

function handleSetTradeMarkers(payload) {
  if (!window.chartWidget || !window.isChartReady) return;

  // Store the full marker set (RN sends ALL trades, not just the visible window).
  window.tradeMarkersData =
    payload && payload.markers && payload.markers.length
      ? payload.markers
      : null;

  // "clear only" — no markers to draw.
  if (!window.tradeMarkersData) {
    clearTradeMarkers();
    return;
  }

  placeTradeMarkers();
  scheduleTradeMarkerRefresh();
}

/**
 * Draws the trade markers whose candle is within the currently-loaded data range,
 * snapping each Y onto the rendered close-price line. Markers older than the loaded
 * range are skipped and drawn later, once the user pans/zooms and the WebView
 * paginates their candles in (see {@link scheduleTradeMarkerRefresh}) — this is why
 * a trade from weeks ago appears as you scroll back instead of being dropped.
 *
 * No-ops when the visible marker set is unchanged (avoids redraw flicker on pan).
 * A generation token discards stale async `createShape` resolves when the set
 * changes. Y is taken from the WebView's own candles (which grow via pagination),
 * so older markers RN couldn't snap still land on the line.
 */
function placeTradeMarkers() {
  if (!window.chartWidget || !window.isChartReady) return;
  let chart;
  try {
    chart = window.chartWidget.activeChart();
  } catch (e) {
    return;
  }
  if (!chart) return;

  const markers = window.tradeMarkersData || [];
  const data = window.ohlcvData || [];
  if (!data.length) return; // no candles loaded yet; re-runs after data / pan
  const firstT = data[0].time;
  const lastT = data[data.length - 1].time;

  // Markers whose candle is within the loaded range → drawable right now.
  const desired = [];
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    if (
      m &&
      m.id != null &&
      isFinite(m.time) &&
      m.time >= firstT &&
      m.time <= lastT
    ) {
      desired.push(m);
    }
  }

  // Skip the redraw when the drawn set already matches (prevents pan flicker).
  const desiredKey = desired
    .map(function (mk) {
      return String(mk.id);
    })
    .sort()
    .join('|');
  const drawnIds = [];
  window.tradeMarkerShapeIdsById.forEach(function (_entityId, id) {
    drawnIds.push(id);
  });
  if (desiredKey === drawnIds.sort().join('|')) return;

  window.__tradeMarkerGen = (window.__tradeMarkerGen || 0) + 1;
  const gen = window.__tradeMarkerGen;
  clearTradeMarkers();

  const theme = window.CONFIG.theme;

  function createDesired() {
    if (gen !== window.__tradeMarkerGen) return;
    if (!window.chartWidget || !window.isChartReady) return;
    let activeChart;
    try {
      activeChart = window.chartWidget.activeChart();
    } catch (e) {
      return;
    }
    if (!activeChart) return;

    // Draw oldest → newest, each marker as a black ring then its colored circle,
    // and draw the markers SEQUENTIALLY (one fully placed before the next starts).
    // Because every new shape is created with zOrder 'top', this guarantees the
    // stack order ring1, fill1, ring2, fill2, … — so each circle's black ring
    // lands ON TOP of the previous circle's fill. That keeps a black outline
    // visible BETWEEN adjacent/overlapping circles, not just between a circle and
    // the price line. (Creating them in parallel left every ring under every
    // fill, so touching circles merged into one colored blob.)
    const ordered = desired.slice().sort(function (a, b) {
      return a.time - b.time;
    });

    let chain = Promise.resolve();
    ordered.forEach(function (marker) {
      chain = chain.then(function () {
        if (gen !== window.__tradeMarkerGen) return undefined;
        // Anchor BOTH X and Y to the nearest loaded bar so the circle lands on a
        // line vertex (createShape snaps X to a bar; a raw time + interpolated Y
        // would drift off the line). Uses the WebView's own paginating candles,
        // so older markers RN couldn't snap still land on the line.
        const snapped = snapMarkerToNearestBar(window.ohlcvData, marker.time);
        const timeSec = snapped
          ? snapped.timeSec
          : Math.floor(marker.time / 1000);
        const price = snapped
          ? snapped.close
          : marker.price != null && isFinite(marker.price)
            ? marker.price
            : null;
        // Skip if no price anchor is available (candle outside loaded range and
        // no fallback price supplied). The marker will be drawn on next refresh.
        if (price === null) return undefined;
        const color =
          marker.intent === 'exit' ? theme.errorColor : theme.successColor;

        return createTradeMarkerIcon(
          activeChart,
          timeSec,
          price,
          TRADE_MARKER_RING_COLOR,
          TRADE_MARKER_RING_SIZE,
        ).then(function (ringId) {
          // Discard if a newer placement superseded this one.
          if (gen !== window.__tradeMarkerGen) {
            removeMarkerEntity(activeChart, ringId);
            return undefined;
          }
          return createTradeMarkerIcon(
            activeChart,
            timeSec,
            price,
            color,
            TRADE_MARKER_SIZE,
          ).then(function (fillId) {
            if (gen !== window.__tradeMarkerGen) {
              removeMarkerEntity(activeChart, ringId);
              removeMarkerEntity(activeChart, fillId);
              return;
            }
            if (ringId) {
              window.tradeMarkerShapeIds.push(ringId);
            }
            if (fillId) {
              window.tradeMarkerShapeIds.push(fillId);
            }
            window.tradeMarkerShapeIdsById.set(String(marker.id), {
              fill: fillId || null,
              ring: ringId || null,
            });
          });
        });
      });
    });
    chain.catch(function () {});
  }

  // Defer to dataReady so the series has the bars for correct X anchoring.
  try {
    if (typeof chart.dataReady === 'function') {
      chart.dataReady(createDesired);
    } else {
      createDesired();
    }
  } catch (e) {
    createDesired();
  }
}

/** Debounced re-place after pan / zoom / pagination so off-screen markers appear. */
function scheduleTradeMarkerRefresh() {
  if (!window.tradeMarkersData) return;
  if (tradeMarkerRefreshDebounce) {
    clearTimeout(tradeMarkerRefreshDebounce);
  }
  tradeMarkerRefreshDebounce = setTimeout(function () {
    tradeMarkerRefreshDebounce = null;
    placeTradeMarkers();
  }, 150);
}

/** Bumped on each pulse so a newer pulse (or marker rebuild) cancels the previous loop. */
window.__tradeMarkerPulseGen = 0;
/** Pulse animation duration (ms). */
const TRADE_MARKER_PULSE_MS = 1100;
/** Peak (colored-circle) size at the crest of a pulse (base is TRADE_MARKER_SIZE). */
const TRADE_MARKER_PULSE_PEAK = 22;
/** Number of grow/shrink humps over the animation. */
const TRADE_MARKER_PULSE_CYCLES = 2;

/**
 * Briefly pulses (grows + shrinks, fading out) the trade marker for `payload.id`
 * to draw attention to it — e.g. after the chart slides to a tapped trade.
 * Animates both the colored circle and its ring via `setProperties`, keeping the
 * ring's proportional rim; a generation token cancels an in-flight pulse if a
 * newer one starts or the markers are rebuilt.
 */
function handlePulseTradeMarker(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || payload.id == null) return;

  const markerId = String(payload.id);
  const byId = window.tradeMarkerShapeIdsById;
  if (!byId || typeof byId.get !== 'function') return;
  const record = byId.get(markerId);
  if (!record) return;
  const fillId = record.fill;
  const ringId = record.ring;
  if (fillId == null && ringId == null) return;

  let chart;
  try {
    chart = window.chartWidget.activeChart();
  } catch (e) {
    return;
  }
  if (!chart || typeof chart.getShapeById !== 'function') return;

  function getShape(id) {
    if (id == null) return null;
    try {
      return chart.getShapeById(id);
    } catch (e) {
      return null;
    }
  }
  const fillShape = getShape(fillId);
  const ringShape = getShape(ringId);
  const canPulse =
    (fillShape && typeof fillShape.setProperties === 'function') ||
    (ringShape && typeof ringShape.setProperties === 'function');
  if (!canPulse) return;

  window.__tradeMarkerPulseGen = (window.__tradeMarkerPulseGen || 0) + 1;
  const gen = window.__tradeMarkerPulseGen;
  const startTs = Date.now();
  // Keep the ring proportionally larger than the fill so the rim stays even.
  const ringRatio = TRADE_MARKER_RING_SIZE / TRADE_MARKER_SIZE;

  function setSizes(fillSize) {
    if (fillShape && typeof fillShape.setProperties === 'function') {
      try {
        fillShape.setProperties({ size: Math.round(fillSize) });
      } catch (e) {}
    }
    if (ringShape && typeof ringShape.setProperties === 'function') {
      try {
        ringShape.setProperties({ size: Math.round(fillSize * ringRatio) });
      } catch (e) {}
    }
  }

  function step() {
    if (gen !== window.__tradeMarkerPulseGen) return;
    if (!window.chartWidget || !window.isChartReady) return;
    // Bail if the markers were rebuilt (ids no longer map to this marker).
    const current = window.tradeMarkerShapeIdsById.get(markerId);
    if (!current || current.fill !== fillId || current.ring !== ringId) return;

    const t = (Date.now() - startTs) / TRADE_MARKER_PULSE_MS;
    if (t >= 1) {
      setSizes(TRADE_MARKER_SIZE);
      return;
    }
    // Decaying |sine| envelope: humps that shrink back to the base size.
    const envelope =
      Math.abs(Math.sin(Math.PI * TRADE_MARKER_PULSE_CYCLES * t)) * (1 - t);
    setSizes(
      TRADE_MARKER_SIZE +
        (TRADE_MARKER_PULSE_PEAK - TRADE_MARKER_SIZE) * envelope,
    );
    try {
      requestAnimationFrame(step);
    } catch (e) {
      setTimeout(step, 16);
    }
  }

  try {
    requestAnimationFrame(step);
  } catch (e) {
    setSizes(TRADE_MARKER_SIZE);
  }
}

/**
 * Pixel hit radius for matching a tap to a trade marker (see
 * {@link findTradeMarkerIdNearPoint}).
 */
const TRADE_MARKER_TAP_RADIUS_PX = 26;

/**
 * Finds the id of the trade marker closest to a tap at (`timeSec`, `offsetY`) —
 * `timeSec` is the crosshair time (unix seconds) and `offsetY` the crosshair Y
 * in overlay pixels. Returns the id when within {@link TRADE_MARKER_TAP_RADIUS_PX}
 * (pixel distance, measuring Y against the line-snapped marker price), else null.
 * Powers the reverse interaction: tapping a circle scrolls the trades list.
 */
function findTradeMarkerIdNearPoint(timeSec, offsetY) {
  if (!window.tradeMarkersData || !window.tradeMarkersData.length) return null;
  if (!window.chartWidget || !window.isChartReady) return null;
  if (!isFinite(timeSec)) return null;

  let chart;
  try {
    chart = window.chartWidget.activeChart();
  } catch (e) {
    return null;
  }
  if (!chart) return null;

  const range = getVisibleTimeRangeSecFromChart(chart);
  if (!range || !(range.hi > range.lo)) return null;

  let plotW = 0;
  try {
    const ts = chart.getTimeScale();
    if (ts && typeof ts.width === 'function') plotW = ts.width();
  } catch (e) {}
  if (!(plotW > 0)) return null;
  const pxPerSec = plotW / (range.hi - range.lo);

  const drawn = window.tradeMarkerShapeIdsById;
  if (!drawn || typeof drawn.has !== 'function') return null;

  let bestId = null;
  let bestDist = Infinity;
  for (let i = 0; i < window.tradeMarkersData.length; i++) {
    const m = window.tradeMarkersData[i];
    if (!m || m.id == null || !isFinite(m.time)) continue;
    // Only match markers that actually have a circle on screen. Markers whose
    // candle isn't in the loaded range are tracked in data but not drawn, so a
    // tap near where one *would* be must not fire a press for an invisible circle.
    if (!drawn.has(String(m.id))) continue;
    // Measure against the bar the circle is actually drawn on (see
    // snapMarkerToNearestBar), not the raw trade time, so hit-testing matches
    // the rendered X/Y.
    const snapped = snapMarkerToNearestBar(window.ohlcvData, m.time);
    const mSec = snapped ? snapped.timeSec : m.time / 1000;
    if (mSec < range.lo || mSec > range.hi) continue; // off-screen
    const dxPx = (mSec - timeSec) * pxPerSec;
    let dyPx = 0;
    if (offsetY != null && isFinite(offsetY)) {
      const price = snapped ? snapped.close : m.price;
      const markerY = getPriceYForLastCloseOverlay(chart, price);
      if (markerY != null && isFinite(markerY)) dyPx = markerY - offsetY;
    }
    const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = String(m.id);
    }
  }
  return bestDist <= TRADE_MARKER_TAP_RADIUS_PX ? bestId : null;
}

// ============================================
// Focus / center on a point in time (FOCUS_TIME) — e.g. tapping a trade row
// ============================================

/** Bumped on each FOCUS_TIME so a newer focus cancels the previous animation loop. */
window.__focusTimeAnimGen = 0;
/** Animation duration for the slide-to-center, ms. */
const FOCUS_TIME_ANIM_MS = 600;
/** Fallback visible span (in bar durations) when no current range is readable. */
const FOCUS_TIME_FALLBACK_BARS = 60;
/**
 * Default (non-SLB) "already visible" inset: a target inside the inner
 * `1 - 2*inset` of the visible window is treated as comfortably visible and the
 * chart doesn't move. SocialLeaderboard overrides this with a full-window check
 * (see `window.__slbMode` branch in {@link handleFocusTime}).
 */
const FOCUS_TIME_VISIBLE_INSET = 0.08;

function focusTimeEaseInOutCubic(t) {
  // ease-in-out quart: a gentler, more gradual acceleration/deceleration than
  // cubic. Paired with a longer FOCUS_TIME_ANIM_MS the slide reads as a smooth
  // glide rather than a near-linear jump.
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/**
 * Slides the visible range so `payload.timeMs` is centered. Keeps the current zoom
 * unless `payload.spanMs` is given, and animates (eased) unless `payload.animate === false`.
 * A generation token cancels an in-flight slide when a newer FOCUS_TIME arrives.
 */
function handleFocusTime(payload) {
  if (!window.chartWidget || !window.isChartReady) return;
  if (!payload || !isFinite(payload.timeMs)) return;

  let chart;
  try {
    chart = window.chartWidget.activeChart();
  } catch (e) {
    return;
  }
  if (!chart || typeof chart.setVisibleRange !== 'function') return;

  const centerSec = payload.timeMs / 1000;

  // Current visible range (seconds) — used to detect a trade that is already on
  // screen and to seed the slide animation / preserve the zoom.
  let curFrom = null;
  let curTo = null;
  if (window.__slbMode) {
    // SocialLeaderboard: prefer the robust reader (loaded-bars range with a
    // logical-range fallback). A bare getVisibleRange() can momentarily report a
    // stale/empty range right after a programmatic reframe, which would make an
    // on-screen trade look off-screen and wrongly re-center it.
    const visibleRange = getVisibleTimeRangeSecFromChart(chart);
    if (visibleRange && visibleRange.hi > visibleRange.lo) {
      curFrom = visibleRange.lo;
      curTo = visibleRange.hi;
    }
  } else {
    try {
      const vr = chart.getVisibleRange();
      if (vr) {
        const f = normalizeChartUnixSec(vr.from);
        const t = normalizeChartUnixSec(vr.to);
        if (f !== null && t !== null && t > f) {
          curFrom = f;
          curTo = t;
        }
      }
    } catch (e2) {}
  }

  // Already visible → leave the chart exactly where it is (no scroll, no zoom);
  // the caller pulses the marker separately.
  if (curFrom !== null && curTo !== null) {
    if (window.__slbMode) {
      // SocialLeaderboard: the WHOLE visible window counts as "visible" (plus a
      // one-bar tolerance for a marker on the very edge), so tapping any on-screen
      // trade only pulses instead of re-centering — not just re-taps / mid-window.
      const edgeToleranceSec = getApproxBarDurationSec();
      if (
        centerSec >= curFrom - edgeToleranceSec &&
        centerSec <= curTo + edgeToleranceSec
      ) {
        return;
      }
    } else if (
      // Default: only skip when comfortably inside the inset window (re-taps /
      // nearby trades). Keeps the pre-SLB behavior for other consumers.
      centerSec >= curFrom + (curTo - curFrom) * FOCUS_TIME_VISIBLE_INSET &&
      centerSec <= curTo - (curTo - curFrom) * FOCUS_TIME_VISIBLE_INSET
    ) {
      return;
    }
  }

  let spanSec;
  if (isFinite(payload.spanMs) && payload.spanMs > 0) {
    spanSec = payload.spanMs / 1000;
  } else if (curFrom !== null) {
    spanSec = curTo - curFrom;
  } else {
    spanSec = getApproxBarDurationSec() * FOCUS_TIME_FALLBACK_BARS;
  }

  const targetFrom = centerSec - spanSec / 2;
  const targetTo = centerSec + spanSec / 2;

  function applyRange(from, to) {
    try {
      chart.setVisibleRange({ from: from, to: to });
    } catch (e) {}
  }

  window.__focusTimeAnimGen = (window.__focusTimeAnimGen || 0) + 1;
  const gen = window.__focusTimeAnimGen;

  // Jump when animation is disabled or we have no start range to interpolate from.
  if (payload.animate === false || curFrom === null) {
    suppressChartUserInteraction(500);
    applyRange(targetFrom, targetTo);
    return;
  }

  const startFrom = curFrom;
  const startTo = curTo;
  const startTs = Date.now();
  suppressChartUserInteraction(FOCUS_TIME_ANIM_MS + 300);

  function step() {
    if (gen !== window.__focusTimeAnimGen) return;
    if (!window.chartWidget || !window.isChartReady) return;
    const elapsed = Date.now() - startTs;
    const progress =
      elapsed >= FOCUS_TIME_ANIM_MS ? 1 : elapsed / FOCUS_TIME_ANIM_MS;
    const eased = focusTimeEaseInOutCubic(progress);
    applyRange(
      startFrom + (targetFrom - startFrom) * eased,
      startTo + (targetTo - startTo) * eased,
    );
    if (progress < 1) {
      try {
        requestAnimationFrame(step);
      } catch (e) {
        setTimeout(step, 16);
      }
    }
  }

  try {
    requestAnimationFrame(step);
  } catch (e) {
    applyRange(targetFrom, targetTo);
  }
}

// ============================================
// Last close: dashed horizontal_line (showPrice:false) + DOM pill (#last-close-price-label,
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
    let chart = window.chartWidget.activeChart();
    let shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) return;
    let positionIds = window.positionShapeIds || [];
    for (let i = 0; i < shapes.length; i++) {
      let id = shapes[i].id;
      let name = String(shapes[i].name || '');
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

  let lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  let chart = window.chartWidget.activeChart();
  let color = getThemeLastPriceLineColor();
  let candlePt = getLineEndDotTimeAndPriceFromSeries(chart);
  let candlePrice =
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
  let hideDom = true;
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

  let shouldDrawLineLastPrice =
    window.currentChartType === 2 &&
    getLineChrome().useCustomDashedLastPriceLine;

  window.__lineLastPriceLinePlacementGen =
    (window.__lineLastPriceLinePlacementGen || 0) + 1;
  let placementGen = window.__lineLastPriceLinePlacementGen;

  removeAllLastPriceHorizontalOverlays();

  if (!shouldDrawLineLastPrice) {
    return;
  }

  let lastBar = window.ohlcvData[window.ohlcvData.length - 1];
  let chart = window.chartWidget.activeChart();
  const color = getThemeLastPriceLineColor();
  let seriesPt = resolveLineEndOverlayPoint(chart);
  let linePrice =
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
    let t0 = Number(last[0]);
    return isFinite(t0) ? t0 : null;
  }
  if (typeof last === 'object') {
    if (last.time !== undefined && last.time !== null) {
      let nt = Number(last.time);
      if (isFinite(nt)) {
        return nt;
      }
    }
    let v = last.value;
    if (Array.isArray(v) && v.length > 0) {
      let tv = Number(v[0]);
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
      let c = Number(last[4]);
      if (isFinite(c)) {
        return c;
      }
    }
    return null;
  }
  if (typeof last === 'object') {
    if (last.close !== undefined && last.close !== null) {
      let nc = Number(last.close);
      if (isFinite(nc)) {
        return nc;
      }
    }
    let v = last.value;
    if (Array.isArray(v) && v.length > 4) {
      let nvc = Number(v[4]);
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
  let fallback = null;
  if (window.ohlcvData && window.ohlcvData.length > 0) {
    let b = window.ohlcvData[window.ohlcvData.length - 1];
    let tr = Number(b.time);
    let cl = Number(b.close);
    if (isFinite(tr) && isFinite(cl)) {
      let trSec = tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr);
      fallback = { timeSec: trSec, price: cl };
    }
  }
  if (!chart) {
    return fallback;
  }
  try {
    let series = chart.getSeries();
    if (!series) {
      return fallback;
    }
    if (typeof series.data === 'function') {
      let ds = series.data();
      if (ds && typeof ds.last === 'function') {
        let last = ds.last();
        if (last) {
          let tvT = parseTimeFromTvDataLast(last);
          let tvC = parseCloseFromTvDataLast(last);
          if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
            let timeSec =
              tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT);
            return { timeSec: timeSec, price: tvC };
          }
        }
      }
    }
    if (typeof series.bars === 'function') {
      let bars = series.bars();
      if (bars && bars.length) {
        let lb = bars[bars.length - 1];
        let tvT2 = parseTimeFromTvDataLast(lb);
        let tvC2 = parseCloseFromTvDataLast(lb);
        if (
          tvT2 !== null &&
          isFinite(tvT2) &&
          tvC2 !== null &&
          isFinite(tvC2)
        ) {
          let timeSec2 =
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
  const n = Number(t);
  if (!isFinite(n)) {
    return null;
  }
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

/** Raw TV timestamp → unix ms (keeps sub-second precision vs {@link normalizeChartUnixSec}). */
function chartRawTimeToUnixMs(rawT) {
  const n = Number(rawT);
  if (!isFinite(n)) {
    return null;
  }
  if (n >= 1e12) {
    return n;
  }
  return n * 1000;
}

/**
 * Step between last two OHLCV bars in seconds (for visible-range alignment checks).
 */
function getApproxBarDurationSec() {
  const d = window.ohlcvData;
  if (!d || d.length < 2) {
    return 300;
  }
  const ms = Math.abs(d[d.length - 1].time - d[d.length - 2].time);
  return Math.max(60, Math.round(ms / 1000));
}

/** Time-scale inset from right so line-end icon stays on-screen (not under price scale). */
let LINE_END_ICON_TIME_INSET_PX = 40;
/** Outline edge sample inset (0 = rightmost pixel; not the line-icon inset). */
let OUTLINE_EDGE_TIME_INSET_PX = 0;
let LINE_END_ICON_PROBE_STEP_PX = 8;
let LINE_END_ICON_MAX_PROBES = 14;

/**
 * Skip extrapolation during interval switches / odd zoom: too few bars, incoherent visible range vs data.
 */
function shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) {
  const d = window.ohlcvData;
  if (!d || d.length < 2) {
    return true;
  }
  if (!chart || !isFinite(lastBarTimeSec)) {
    return true;
  }
  try {
    const br = chart.getVisibleBarsRange();
    if (!br || br.from === undefined || br.to === undefined) {
      return true;
    }
    const brFromSec = normalizeChartUnixSec(br.from);
    const brToSec = normalizeChartUnixSec(br.to);
    if (brFromSec === null || brToSec === null) {
      return true;
    }
    const barDur = getApproxBarDurationSec();
    const visibleSpan = Math.abs(brToSec - brFromSec);
    const n = d.length;
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
    const br = chart.getVisibleBarsRange();
    if (!br || br.to === undefined || br.to === null) {
      return false;
    }
    const brToSec = normalizeChartUnixSec(br.to);
    if (brToSec === null) {
      return false;
    }
    const barDur = getApproxBarDurationSec();
    return (
      lastBarTimeSec <= brToSec + barDur &&
      lastBarTimeSec >= brToSec - 2 * barDur
    );
  } catch (e) {
    return false;
  }
}

/** Helpers for {@link isCustomLineEndMarkerVisibleInPlot} (time ↔ x on the time scale). */

/**
 * @param {object} ts - `chart.getTimeScale()`
 * @param {number} x
 * @returns {number | null} unix seconds
 */
function timeScaleCoordinateToTimeSec(ts, x) {
  const raw = ts.coordinateToTime(x);
  if (raw == null || raw === undefined) {
    return null;
  }
  return normalizeChartUnixSec(raw);
}

/**
 * Smallest x in [0, maxX] with coordinate time ≥ tNorm (binary search; assumes time increases with x).
 *
 * @returns {number | null}
 */
function findSmallestXWhereTimeGte(ts, maxX, tNorm) {
  const tLo = timeScaleCoordinateToTimeSec(ts, 0);
  const tHi = timeScaleCoordinateToTimeSec(ts, maxX);
  if (tLo === null || tHi === null) {
    return null;
  }
  if (tHi < tNorm) {
    return null;
  }
  if (tLo >= tNorm) {
    return 0;
  }
  let lo = 0;
  let hi = maxX;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const tm = timeScaleCoordinateToTimeSec(ts, mid);
    if (tm === null) {
      return null;
    }
    if (tm < tNorm) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Single source of truth for “would the custom line-end marker appear in the plot before the chrome
 * inset?” — same horizontal rules as {@link getLineEndIconTimeSec} + {@link LINE_END_ICON_TIME_INSET_PX}
 * (inverse of `coordinateToTime` via {@link findSmallestXWhereTimeGte}).
 *
 * @param {object} chart - `widget.activeChart()`
 * @param {number} lastBarTimeSec - unix seconds, OHLCV tail (same as line overlay)
 * @returns {boolean | null} true = marker visible in plot (hide outline pill), false = not visible (show outline), null = unknown (hide outline)
 */
function isCustomLineEndMarkerVisibleInPlot(chart, lastBarTimeSec) {
  if (!chart || lastBarTimeSec == null || !isFinite(Number(lastBarTimeSec))) {
    return null;
  }
  try {
    const ts = chart.getTimeScale();
    if (
      !ts ||
      typeof ts.coordinateToTime !== 'function' ||
      typeof ts.width !== 'function'
    ) {
      return null;
    }
    const plotW = ts.width();
    if (!(plotW > LINE_END_ICON_TIME_INSET_PX + 4)) {
      return null;
    }
    const markerTimeSec = getLineEndIconTimeSec(chart, Number(lastBarTimeSec));
    const tNorm = normalizeChartUnixSec(markerTimeSec);
    if (tNorm === null) {
      return null;
    }
    const xCut = Math.max(
      0,
      Math.floor(plotW - LINE_END_ICON_TIME_INSET_PX - 1),
    );
    const maxX = Math.max(0, Math.floor(plotW - 1));

    const tMax = timeScaleCoordinateToTimeSec(ts, maxX);
    const tMin = timeScaleCoordinateToTimeSec(ts, 0);
    if (tMin === null || tMax === null) {
      return null;
    }
    /* Marker time past the right edge of the plot → not visible (panned off). */
    if (tNorm > tMax) {
      return false;
    }
    /* Same conservative branch as before: treat as visible for outline (hide pill). */
    if (tNorm < tMin) {
      return true;
    }

    const xFirst = findSmallestXWhereTimeGte(ts, maxX, tNorm);
    if (xFirst === null) {
      return null;
    }
    return xFirst <= xCut;
  } catch (e) {
    return null;
  }
}

/**
 * Reads TradingView’s visible time window as **Unix seconds** `{ lo, hi }` (`lo <= hi`).
 * Prefer `getVisibleBarsRange()`; if it is null mid-scroll, fall back to `getVisibleRange()`.
 *
 * @param {object} chart - `widget.activeChart()`
 * @returns {{ lo: number, hi: number } | null} null if range unavailable or timestamps invalid
 */
function getVisibleTimeRangeSecFromChart(chart) {
  let fromSec;
  let toSec;
  try {
    const br = chart.getVisibleBarsRange();
    if (br?.from !== undefined && br?.to !== undefined) {
      fromSec = normalizeChartUnixSec(br.from);
      toSec = normalizeChartUnixSec(br.to);
      if (fromSec !== null && toSec !== null) {
        return {
          lo: Math.min(fromSec, toSec),
          hi: Math.max(fromSec, toSec),
        };
      }
    }
  } catch (eBr) {
    void eBr;
  }
  try {
    const vr = chart.getVisibleRange?.();
    if (vr?.from !== undefined && vr?.to !== undefined) {
      fromSec = normalizeChartUnixSec(vr.from);
      toSec = normalizeChartUnixSec(vr.to);
      if (fromSec !== null && toSec !== null) {
        return {
          lo: Math.min(fromSec, toSec),
          hi: Math.max(fromSec, toSec),
        };
      }
    }
  } catch (eVr) {
    return null;
  }
  return null;
}

/**
 * Among bars in `data`, returns the one with the **maximum `time`** that still falls inside the
 * visible range (milliseconds, slack from `getApproxBarDurationSec`). This is
 * the **rightmost historical bar still drawn** in the viewport—the “visible edge” for the outline
 * pill’s close price.
 *
 * @param {object} chart
 * @param {Array<{ time: number, close: number }>} data - `window.ohlcvData`
 * @returns {object | null} bar object or null if none intersect
 */
function getRightmostOhlcvBarInVisibleTimeRange(chart, data) {
  const range = getVisibleTimeRangeSecFromChart(chart);
  if (!range || !data || !data.length) {
    return null;
  }
  const slackSec = getApproxBarDurationSec() * 2;
  const loMs = (range.lo - slackSec) * 1000;
  const hiMs = (range.hi + slackSec) * 1000;
  let best = null;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    const t = b.time;
    if (t >= loMs && t <= hiMs) {
      if (!best || t > best.time) {
        best = b;
      }
    }
  }
  return best;
}

/**
 * True when the **newest** OHLCV bar is **not** among the bars intersecting the visible time range:
 * the rightmost visible bar is strictly older than the series tail (user panned the tail off-screen).
 *
 * @param {object} chart - `widget.activeChart()`
 * @param {Array<{ time: number }>} data - `window.ohlcvData`
 * @returns {boolean | null} true = tail off-screen by data, false = tail still in range, null = unknown
 */
function isSeriesTailOffScreenByData(chart, data) {
  if (!chart || !data || !data.length) {
    return null;
  }
  const tail = data[data.length - 1];
  const tailMs = tail.time;
  const rightmost = getRightmostOhlcvBarInVisibleTimeRange(chart, data);
  if (!rightmost) {
    return null;
  }
  if (rightmost === tail || rightmost.time === tailMs) {
    return false;
  }
  const barDurMs = getApproxBarDurationSec() * 1000;
  const halfBarSlackMs = Math.max(1, barDurMs * 0.5);
  if (tailMs - rightmost.time <= halfBarSlackMs) {
    return false;
  }
  return true;
}

/**
 * Bar for the outline pill’s price: same as {@link getRightmostOhlcvBarInVisibleTimeRange}, then
 * if that is null (gaps at scroll limits), retry with looser slack so the pill does not vanish
 * when the tail is still off-screen.
 *
 * @param {object} chart
 * @param {Array<{ time: number, close: number }>} data - `window.ohlcvData`
 * @returns {object | null}
 */
function getVisibleEdgeOutlineBar(chart, data) {
  const primary = getRightmostOhlcvBarInVisibleTimeRange(chart, data);
  if (primary) {
    return primary;
  }
  const range = getVisibleTimeRangeSecFromChart(chart);
  if (!range || !data || !data.length) {
    return null;
  }
  const barDur = getApproxBarDurationSec();
  const looseSlackSec = barDur * 6;
  const loMs = (range.lo - looseSlackSec) * 1000;
  const hiMs = (range.hi + looseSlackSec) * 1000;
  let best = null;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    const t = b.time;
    if (t >= loMs && t <= hiMs) {
      if (!best || t > best.time) {
        best = b;
      }
    }
  }
  return best;
}

/** `coordinateToTime` at plot right edge (see {@link OUTLINE_EDGE_TIME_INSET_PX}); capped to `visibleRange.to`. */
function getVisiblePlotRightEdgeTimeMs(chart) {
  if (!chart) {
    return null;
  }
  try {
    const ts = chart.getTimeScale();
    if (
      !ts ||
      typeof ts.coordinateToTime !== 'function' ||
      typeof ts.width !== 'function'
    ) {
      return null;
    }
    const w = ts.width();
    if (!(w > OUTLINE_EDGE_TIME_INSET_PX + 2)) {
      return null;
    }
    const x = Math.max(0, Math.floor(w - OUTLINE_EDGE_TIME_INSET_PX - 1));
    const rawT = ts.coordinateToTime(x);
    if (rawT === null || rawT === undefined) {
      return null;
    }
    let tMs = chartRawTimeToUnixMs(rawT);
    if (tMs === null) {
      return null;
    }
    const vr = chart.getVisibleRange?.();
    if (vr?.to !== undefined && vr?.to !== null) {
      const capMs = chartRawTimeToUnixMs(vr.to);
      if (capMs !== null && tMs > capMs) {
        tMs = capMs;
      }
    }
    return tMs;
  } catch (e) {
    return null;
  }
}

/**
 * Snaps a trade time to the loaded bar nearest to `tMs` and returns that bar's
 * exact `{ timeSec, close }`.
 *
 * **Why snap to a bar instead of interpolating?** Trade markers are drawn with
 * the Drawing API (`createShape`), which anchors a shape's X to a bar on the
 * time scale — it cannot float a shape between bars. If we pass the trade's raw
 * time with an *interpolated* Y, TradingView snaps the X to a bar while the Y
 * stays interpolated for the un-snapped time, so the circle drifts OFF the line.
 *
 * TradingView draws its line from these same `window.ohlcvData` bars, so a bar's
 * `(time, close)` IS a vertex on the rendered line. Anchoring BOTH the X (the
 * bar's own time, which needs no snapping) and the Y (that bar's close) to the
 * same bar guarantees the circle center lands exactly on that vertex.
 *
 * Uses a binary search (data is sorted ascending by time). Returns null when the
 * data is empty, `tMs` is non-finite, or the nearest close is non-finite.
 */
function snapMarkerToNearestBar(data, tMs) {
  if (!data || !data.length || !isFinite(tMs)) return null;

  // lower_bound: first index whose time >= tMs.
  let lo = 0;
  let hi = data.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (data[mid].time < tMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Compare the lower-bound bar with its predecessor; pick the closer one
  // (ties favor the earlier bar — the candle the trade falls within).
  let best = lo;
  if (lo > 0) {
    const prevDiff = tMs - data[lo - 1].time;
    const curDiff = data[lo].time - tMs;
    if (prevDiff <= curDiff) {
      best = lo - 1;
    }
  }

  const close = Number(data[best].close);
  if (!isFinite(close)) return null;
  return { timeSec: Math.floor(data[best].time / 1000), close };
}

/** Interpolate close between consecutive bars (line chart path). */
function interpolateCloseAlongLineAtTimeMs(data, tMs) {
  if (!data || !data.length || !isFinite(tMs)) {
    return null;
  }
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
      if (!isFinite(a) || !isFinite(b)) {
        return null;
      }
      if (t1 === t0) {
        return a;
      }
      return a + ((b - a) * (tMs - t0)) / (t1 - t0);
    }
  }
  return null;
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
    const ts = chart.getTimeScale();
    if (
      !ts ||
      typeof ts.coordinateToTime !== 'function' ||
      typeof ts.width !== 'function'
    ) {
      return lastBarTimeSec;
    }
    const w = ts.width();
    if (!(w > LINE_END_ICON_TIME_INSET_PX + 4)) {
      return lastBarTimeSec;
    }
    const vr = chart.getVisibleRange?.();
    const capSec =
      vr?.to !== undefined && vr?.to !== null
        ? normalizeChartUnixSec(vr.to)
        : null;
    for (let k = 0; k < LINE_END_ICON_MAX_PROBES; k++) {
      const x = Math.max(
        0,
        Math.floor(
          w - LINE_END_ICON_TIME_INSET_PX - k * LINE_END_ICON_PROBE_STEP_PX,
        ),
      );
      const rawT = ts.coordinateToTime(x);
      if (rawT === null || rawT === undefined) {
        continue;
      }
      const numT = Number(rawT);
      if (!isFinite(numT)) {
        continue;
      }
      let tNorm = normalizeChartUnixSec(numT);
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

/** True when `id` belongs to a trade marker (open/close circle), which must survive icon sweeps. */
function isTradeMarkerShapeId(id) {
  return (
    !!window.tradeMarkerShapeIds &&
    window.tradeMarkerShapeIds.indexOf(id) !== -1
  );
}

/**
 * Removes Drawing API `icon` shapes on the active chart. Line mode only uses icons for the end
 * dot; stale async `createShape` calls can leave orphans with no `lineEndDotShapeId` reference.
 * Trade markers are also `icon` shapes, so they are explicitly preserved by id.
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
    let chart = window.chartWidget.activeChart();
    let shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) {
      return;
    }
    for (let i = 0; i < shapes.length; i++) {
      let name = String(shapes[i].name || '');
      if (!/icon/i.test(name)) {
        continue;
      }
      if (isTradeMarkerShapeId(shapes[i].id)) {
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
    let chart = window.chartWidget.activeChart();
    let shapes = chart.getAllShapes();
    if (!shapes || !shapes.length) return;
    for (let i = 0; i < shapes.length; i++) {
      let name = String(shapes[i].name || '');
      if (/icon/i.test(name) && !isTradeMarkerShapeId(shapes[i].id)) {
        try {
          chart.removeEntity(shapes[i].id);
        } catch (err) {}
      }
    }
  } catch (e) {}
}

function refreshLineEndDot() {
  window.__lineEndDotPlacementGen = (window.__lineEndDotPlacementGen || 0) + 1;
  let placementGen = window.__lineEndDotPlacementGen;

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

  const color = getThemeLineColor();

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
    let chart = window.chartWidget.activeChart();
    let pt = resolveLineEndOverlayPoint(chart);
    if (!pt || !isFinite(pt.timeSec) || !isFinite(pt.price)) {
      return;
    }
    if (placementGen !== window.__lineEndDotPlacementGen) {
      return;
    }
    let iconTimeSec = getLineEndIconTimeSec(chart, pt.timeSec);

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
    let chartForReady = window.chartWidget.activeChart();
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
// Custom Study Legend (DOM overlay)
// ============================================

function isLegendOverlayEnabled() {
  return Boolean(window.CONFIG?.legendOverlay?.enabled);
}

function getLegendConfig() {
  return window.CONFIG?.legendOverlay?.config ?? {};
}

const INDICATOR_LEGEND_CONFIG = {
  MACD: {
    plots: [
      {
        tvTitle: 'MACD',
        label: 'MACD(12,26)',
        color: _macdColors.macd || '#5C8FFF',
      },
      {
        tvTitle: 'Signal',
        label: 'Signal',
        color: _macdColors.signal || '#FF6D00',
      },
      {
        tvTitle: 'Histogram',
        label: 'Hist',
        color: _macdColors.histogramPositive || '#26A69A',
      },
    ],
    useIndex: true,
  },
  RSI: {
    plots: [
      {
        tvTitle: 'Plot',
        label: 'RSI(14)',
        color: _rsiColors.plot || '#E91E90',
      },
    ],
    useIndex: true,
  },
  BOL: {
    combineInOnePill: true,
    title: 'BB(20,2)',
    plots: [
      {
        tvTitle: 'Upper',
        label: 'U:',
        color: _bolColors.upper || '#E040FB',
      },
      { tvTitle: 'Median', label: 'M:', color: _bolColors.basis || '#E040FB' },
      { tvTitle: 'Lower', label: 'L:', color: _bolColors.lower || '#E040FB' },
    ],
    useIndex: true,
  },
  Volume: {
    plots: [{ tvTitle: 'Vol', label: 'Vol', color: null }],
    useIndex: true,
  },
  MA5: {
    isMA: true,
    useIndex: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(5)', color: MA_COLORS.MA5 }],
  },
  MA10: {
    isMA: true,
    useIndex: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(10)', color: MA_COLORS.MA10 }],
  },
  MA20: {
    isMA: true,
    useIndex: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(20)', color: MA_COLORS.MA20 }],
  },
  MA50: {
    isMA: true,
    useIndex: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(50)', color: MA_COLORS.MA50 }],
  },
  MA200: {
    isMA: true,
    useIndex: true,
    plots: [{ tvTitle: 'Plot', label: 'MA(200)', color: MA_COLORS.MA200 }],
  },
};

const LEGEND_OVERLAY_LEFT_PX = 8;

function createStudyLegendOverlay() {
  const existing = document.getElementById('study-legend-overlay');
  if (existing) existing.parentNode.removeChild(existing);

  const container = document.getElementById('tv_chart_container');
  if (!container) {
    return;
  }

  const div = document.createElement('div');
  div.id = 'study-legend-overlay';
  div.style.cssText =
    'position:absolute;top:1px;left:' +
    LEGEND_OVERLAY_LEFT_PX +
    'px;z-index:5;pointer-events:none;' +
    'display:flex;flex-wrap:wrap;align-items:flex-start;column-gap:8px;row-gap:2px;';
  container.style.position = 'relative';
  container.appendChild(div);
}

function buildOrderedStudyDataList(byStudy, entityValues) {
  const list = [];
  window.legendStudyOrder.forEach(function (studyId, name) {
    const sid = String(studyId);
    if (byStudy && byStudy[sid]) {
      list.push({ name: name, values: byStudy[sid] });
    } else if (entityValues) {
      const ev = entityValues[sid];
      if (ev && ev.values) {
        list.push({ name: name, values: ev.values });
      }
    }
  });
  return list;
}

function updateLegendOverlayLayout() {
  const overlay = document.getElementById('study-legend-overlay');
  const container = document.getElementById('tv_chart_container');
  if (!overlay || !container) {
    return;
  }
  const scaleGap = 4;
  const boundaryLeft = getMainPriceAxisLeftRelativeTo(container);
  if (
    boundaryLeft !== null &&
    boundaryLeft > LEGEND_OVERLAY_LEFT_PX + scaleGap
  ) {
    overlay.style.maxWidth =
      boundaryLeft - LEGEND_OVERLAY_LEFT_PX - scaleGap + 'px';
  } else {
    overlay.style.maxWidth = 'calc(100% - 56px)';
  }
}

function getLegendAltColor(theme) {
  return (
    theme.legendTextColor ||
    theme.textAlternativeColor ||
    theme.textColor ||
    '#858898'
  );
}

function getLegendPillStyle(textColor) {
  return textColor ? 'color:' + textColor + ';' : '';
}

function wrapLegendPill(innerHtml, textColor) {
  const style = getLegendPillStyle(textColor);
  const styleAttr = style ? ' style="' + style + '"' : '';
  return '<span class="legend-pill"' + styleAttr + '>' + innerHtml + '</span>';
}

function formatLegendPill(prefixColor, prefix, value, altColor) {
  return wrapLegendPill(
    '<span style="color:' +
      prefixColor +
      '">' +
      prefix +
      '</span><span style="color:' +
      altColor +
      '">' +
      value +
      '</span>',
  );
}

function isEmptyLegendValue(val) {
  return !val || val === '' || val === 'n/a' || val === '∅';
}

function resolveLegendConfig(indicatorName) {
  const dynamicConfig = getLegendConfig();
  return dynamicConfig[indicatorName] || INDICATOR_LEGEND_CONFIG[indicatorName];
}

function plotLegendValue(cfg, plotCfg, plotIndex, values) {
  if (cfg.useIndex && plotIndex < values.length) {
    return values[plotIndex].value;
  }
  for (const value of values) {
    if (value.title === plotCfg.tvTitle) {
      return value.value;
    }
  }
  return '';
}

function renderLegendOverlay(studyDataList) {
  const overlay = document.getElementById('study-legend-overlay');
  if (!overlay) {
    return;
  }
  overlay.innerHTML = buildLegendHTML(studyDataList);
  updateLegendOverlayLayout();
}

function collectStudyIdMap() {
  const map = {};
  window.activeStudies.forEach(function (studyId, name) {
    map[String(studyId)] = name;
  });
  window.maStudies.forEach(function (studyId, name) {
    map[String(studyId)] = name;
  });
  if (window.volumeStudyId) {
    map[String(window.volumeStudyId)] = 'Volume';
  }
  return map;
}

function buildLegendHTML(studyDataList) {
  let pills = [];
  const theme = window.CONFIG?.theme || {};
  const altColor = getLegendAltColor(theme);

  for (const entry of studyDataList) {
    const indicatorName = entry.name;
    const values = entry.values;
    const cfg = resolveLegendConfig(indicatorName);
    if (!cfg) continue;

    if (cfg.isMA) {
      const maPlot = cfg.plots[0];
      const maVal = plotLegendValue(cfg, maPlot, 0, values);
      if (isEmptyLegendValue(maVal)) continue;
      pills.push(wrapLegendPill(maPlot.label + ' ' + maVal, maPlot.color));
      continue;
    }

    if (cfg.combineInOnePill) {
      const labelColor = cfg.plots[0].color || theme.successColor;
      const title = cfg.title || cfg.plots[0].label;
      let inner = '<span style="color:' + labelColor + '">' + title + '</span>';
      let hasValues = false;
      for (const [p, plotCfg] of cfg.plots.entries()) {
        const val = plotLegendValue(cfg, plotCfg, p, values);
        if (isEmptyLegendValue(val)) continue;
        hasValues = true;
        inner +=
          '<span style="color:' +
          labelColor +
          '">&nbsp;' +
          plotCfg.label +
          '</span><span style="color:' +
          altColor +
          '">' +
          val +
          '</span>';
      }
      if (hasValues) {
        pills.push(wrapLegendPill(inner));
      }
      continue;
    }

    for (const [p, plotCfg] of cfg.plots.entries()) {
      const val = plotLegendValue(cfg, plotCfg, p, values);
      if (isEmptyLegendValue(val)) continue;
      const color = plotCfg.color || theme.successColor || '#26A69A';
      pills.push(formatLegendPill(color, plotCfg.label + ' ', val, altColor));
    }
  }

  return pills.join('');
}

function updateStudyLegendFromEntityValues(entityValues) {
  if (!isLegendOverlayEnabled()) return;
  const overlay = document.getElementById('study-legend-overlay');
  if (!overlay) return;
  if (!entityValues) {
    overlay.innerHTML = '';
    return;
  }

  renderLegendOverlay(buildOrderedStudyDataList(null, entityValues));
}

function waitForChartRenderCompletion(callback) {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      callback();
    });
  });
}

function notifyIndicatorAdded(name, studyId) {
  waitForChartRenderCompletion(function () {
    sendToReactNative('INDICATOR_ADDED', {
      name: name,
      id: String(studyId),
    });
  });
}

/**
 * Waits for TradingView study data before legend export (exportData is empty until onDataLoaded).
 */
function subscribeStudyDataLoaded(studyId, onDataLoadedCallback) {
  function runWhenReady() {
    if (onDataLoadedCallback) {
      waitForChartRenderCompletion(onDataLoadedCallback);
    } else {
      waitForChartRenderCompletion(refreshStudyLegendFromExport);
    }
  }

  try {
    const chart = window.chartWidget.activeChart();
    const study = chart.getStudyById(studyId);
    if (study && study.onDataLoaded) {
      study.onDataLoaded().subscribe(null, runWhenReady, true);
    } else {
      runWhenReady();
    }
  } catch (e) {
    runWhenReady();
  }
}

function legendOverlayHasContent() {
  const overlay = document.getElementById('study-legend-overlay');
  return !!(overlay && overlay.innerHTML.trim().length > 0);
}

function notifyLegendRendered() {
  waitForChartRenderCompletion(function () {
    sendToReactNative('LEGEND_RENDERED', {});
  });
}

function formatLegendValue(num) {
  if (num === undefined || num === null || isNaN(num)) return '';
  const abs = Math.abs(num);
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e4) return (num / 1e3).toFixed(1) + 'K';
  if (abs >= 1000) return num.toFixed(2);
  if (abs >= 1) return num.toFixed(2);
  if (abs >= 0.01) return num.toFixed(4);
  return num.toPrecision(4);
}

let _legendExportGeneration = 0;
let _legendRetryCount = 0;
const MAX_LEGEND_RETRIES = 10;
const LEGEND_RETRY_DELAY_MS = 100;
const LEGEND_RENDER_TIMEOUT_MS = 3000;
let _legendTimeoutId = null;

/**
 * Rebuilds `#study-legend-overlay` from TradingView `chart.exportData()` (last bar per study).
 *
 * Called when studies are added/removed, on crosshair dismiss, and after OHLCV hot reload
 * completes in `tryCompleteLayoutSettleAfterDataCore` so MA/indicator pills reflect the new
 * resolution (studies recalculate internally; this overlay does not update automatically).
 */
function refreshStudyLegendFromExport() {
  if (!isLegendOverlayEnabled()) return;
  if (!window.chartWidget || !window.isChartReady) return;
  const overlay = document.getElementById('study-legend-overlay');
  if (!overlay) return;

  const chart = window.chartWidget.activeChart();
  const studyIdMap = collectStudyIdMap();
  for (const sid of Object.keys(studyIdMap)) {
    const name = studyIdMap[sid];
    if (name && !window.legendStudyOrder.has(name)) {
      window.legendStudyOrder.set(name, sid);
    }
  }
  const studyIds = Object.keys(studyIdMap);

  if (studyIds.length === 0) {
    overlay.innerHTML = '';
    _legendRetryCount = 0;
    clearLegendTimeout();
    return;
  }

  const gen = ++_legendExportGeneration;

  // Start timeout on first attempt
  if (_legendRetryCount === 0) {
    startLegendTimeout(gen);
  }

  try {
    chart
      .exportData({
        includeSeries: false,
        includedStudies: studyIds,
      })
      .then(function (data) {
        if (gen !== _legendExportGeneration) return;
        if (!data || !data.schema || !data.data || data.data.length === 0) {
          scheduleRetryIfNeeded(gen);
          return;
        }
        const lastRow = data.data[data.data.length - 1];
        if (!lastRow) {
          scheduleRetryIfNeeded(gen);
          return;
        }

        const byStudy = {};
        for (const [s, field] of data.schema.entries()) {
          if (field.type === 'time' || field.type === 'userTime') continue;
          const sourceId = field.sourceId;
          if (!sourceId) continue;
          const sid = String(sourceId);
          if (!byStudy[sid]) byStudy[sid] = [];
          const rawVal = lastRow[s];
          let displayVal =
            rawVal !== undefined && !isNaN(rawVal)
              ? formatLegendValue(rawVal)
              : '';
          if (data.displayedData && data.displayedData.length > 0) {
            const dispRow = data.displayedData[data.displayedData.length - 1];
            if (dispRow && dispRow[s]) displayVal = dispRow[s];
          }
          byStudy[sid].push({
            title: field.plotTitle || '',
            value: displayVal,
          });
        }

        const studyDataList = buildOrderedStudyDataList(byStudy, null);

        if (
          hasEmptyStudyValues(studyDataList) &&
          _legendRetryCount < MAX_LEGEND_RETRIES
        ) {
          scheduleRetryIfNeeded(gen);
          return;
        }

        _legendRetryCount = 0;
        renderLegendOverlay(studyDataList);

        clearLegendTimeout();
        notifyLegendRendered();
      })
      .catch(function (err) {
        scheduleRetryIfNeeded(gen);
      });
  } catch (e) {
    // Silent catch - retries will handle failures
  }
}

function hasEmptyStudyValues(studyDataList) {
  for (const { name, values } of studyDataList) {
    const cfg = resolveLegendConfig(name);
    if (!cfg) continue;

    for (const { value: val } of values) {
      if (isEmptyLegendValue(val)) {
        return true;
      }
    }
  }
  return false;
}

function startLegendTimeout(gen) {
  clearLegendTimeout();
  _legendTimeoutId = setTimeout(function () {
    if (gen !== _legendExportGeneration) return;
    _legendRetryCount = 0;
    clearLegendTimeout();
    if (window.legendStudyOrder.size > 0 && !legendOverlayHasContent()) {
      refreshStudyLegendFromExport();
    }
    notifyLegendRendered();
  }, LEGEND_RENDER_TIMEOUT_MS);
}

function clearLegendTimeout() {
  if (_legendTimeoutId !== null) {
    clearTimeout(_legendTimeoutId);
    _legendTimeoutId = null;
  }
}

function scheduleRetryIfNeeded(gen) {
  if (_legendRetryCount >= MAX_LEGEND_RETRIES) {
    _legendRetryCount = 0;
    clearLegendTimeout();
    notifyLegendRendered();
    return;
  }
  _legendRetryCount++;
  setTimeout(function () {
    if (gen === _legendExportGeneration) {
      refreshStudyLegendFromExport();
    }
  }, LEGEND_RETRY_DELAY_MS);
}

function injectHideLegendButtonsCSS() {
  const styleId = 'mm-hide-legend-buttons';
  if (document.getElementById(styleId)) return;

  let targetDoc = document;
  try {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      if (iframe.contentDocument) {
        targetDoc = iframe.contentDocument;
        break;
      }
    }
  } catch (e) {}

  const style = targetDoc.createElement('style');
  style.id = styleId;
  style.textContent =
    '.chart-controls-bar .apply-common-tooltip,' +
    '.legendElement .showHide,' +
    '.legendElement button[data-name="legend-show-hide-action"],' +
    '.legendElement button[data-name="legend-settings-action"],' +
    '.legendElement button[data-name="legend-delete-action"],' +
    '.legendElement .buttons-wrapper,' +
    '.legendElement .buttonsWrapper {' +
    '  display: none !important;' +
    '}';
  targetDoc.head.appendChild(style);
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
    const chart = window.chartWidget.activeChart();
    const overrides = {
      showLegendValues: false,
      'volume ma.display': 0,
      'volume.color.0': getVolumeErrorColor(),
      'volume.color.1': getVolumeSuccessColor(),
      'volume.transparency': useOverlay ? 70 : 0,
    };
    const promise = useOverlay
      ? chart.createStudy('Volume', true, false, {}, overrides, {
          priceScale: 'no-scale',
        })
      : chart.createStudy('Volume', false, false, {}, overrides);

    promise
      .then(function (studyId) {
        window.legendStudyOrder.set('Volume', studyId);
        window.volumeStudyId = studyId;
        subscribeStudyDataLoaded(studyId);
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

  let useOverlay = payload.volumeOverlay === true;

  if (!payload.visible) {
    if (window.volumeStudyId) {
      try {
        window.chartWidget.activeChart().removeEntity(window.volumeStudyId);
      } catch (e) {}
      window.volumeStudyId = null;
    }
    window.legendStudyOrder.delete('Volume');
    window.volumeIsOverlay = null;
    updateCandleVolumeScaleColumnVisibility();
    refreshStudyLegendFromExport();
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
let VARIABLE_TICK_SIZE = [
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
  let barsInRange = [];
  for (let i = 0; i < window.ohlcvData.length; i++) {
    let b = window.ohlcvData[i];
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
    let allBeforeTo = [];
    for (let j = 0; j < window.ohlcvData.length; j++) {
      if (window.ohlcvData[j].time < toMs) {
        allBeforeTo.push(window.ohlcvData[j]);
      }
    }
    let startIdx = Math.max(0, allBeforeTo.length - countBack);
    barsInRange = [];
    for (let k = startIdx; k < allBeforeTo.length; k++) {
      let bar = allBeforeTo[k];
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

function resolvePendingOlderBarsNoData(pending) {
  if (!pending || typeof pending.onResult !== 'function') {
    return;
  }
  try {
    pending.onResult([], { noData: true });
  } catch (e) {}
  if (window.__mmLayoutSettlePending) {
    queueTryCompleteLayoutSettleAfterData();
  }
}

function resolveAllPendingOlderBarsNoData() {
  if (
    !window.pendingOlderBarsCallbacks ||
    typeof window.pendingOlderBarsCallbacks.forEach !== 'function'
  ) {
    window.pendingOlderBarsCallbacks = new Map();
    return;
  }
  window.pendingOlderBarsCallbacks.forEach(function (pending) {
    resolvePendingOlderBarsNoData(pending);
  });
  window.pendingOlderBarsCallbacks = new Map();
}

/**
 * Handles FETCH_OLDER_BARS_RESPONSE from RN.
 * Merges returned bars into window.ohlcvData and resolves the pending getBars callback.
 */
function handleFetchOlderBarsResponse(payload) {
  if (!payload || typeof payload.requestId !== 'string') {
    return;
  }
  var pending = window.pendingOlderBarsCallbacks.get(payload.requestId);
  if (!pending) {
    return; // already resolved or timed out
  }
  window.pendingOlderBarsCallbacks.delete(payload.requestId);

  // Discard stale response if series changed since request was sent.
  if (
    payload.seriesGeneration !== pending.gen ||
    payload.seriesGeneration !== window.ohlcvGeneration
  ) {
    resolvePendingOlderBarsNoData(pending);
    return;
  }

  if (
    payload.error ||
    payload.noData ||
    !Array.isArray(payload.bars) ||
    payload.bars.length === 0
  ) {
    pending.onResult([], { noData: true });
    if (window.__mmLayoutSettlePending) {
      queueTryCompleteLayoutSettleAfterData();
    }
    return;
  }

  var existingTimes = new Set();
  for (var j = 0; j < window.ohlcvData.length; j++) {
    existingTimes.add(window.ohlcvData[j].time);
  }

  var olderBars = [];
  for (var i = 0; i < payload.bars.length; i++) {
    var bar = payload.bars[i];
    if (bar.time < pending.oldestAtDefer && !existingTimes.has(bar.time)) {
      existingTimes.add(bar.time);
      olderBars.push(bar);
    }
  }

  if (olderBars.length > 0) {
    window.ohlcvData = olderBars.concat(window.ohlcvData);
  }

  pending.onResult(olderBars, { noData: olderBars.length === 0 });
  if (window.__mmLayoutSettlePending) {
    queueTryCompleteLayoutSettleAfterData();
  }
}

let OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

/**
 * Fetches the next page of OHLCV history directly from the Price API inside the WebView.
 * Called from `getBars` when `window.ohlcvPagination` has a cursor, avoiding the RN round-trip.
 */
function fetchOlderBars(pending) {
  let pag = window.ohlcvPagination;

  if (!pag.nextCursor || !pag.hasMore || !pag.assetId) {
    pending.onResult([], { noData: true });
    if (window.__mmLayoutSettlePending) {
      queueTryCompleteLayoutSettleAfterData();
    }
    return;
  }

  let gen = window.ohlcvGeneration;
  // Build URL using the same approach as RN: construct then add query params
  // AssetId contains "/" which should be preserved in the path
  let url = OHLCV_BASE_URL + '/' + pag.assetId;
  let queryParams = [];
  queryParams.push('nextCursor=' + encodeURIComponent(pag.nextCursor));
  if (pag.vsCurrency) {
    queryParams.push('vsCurrency=' + encodeURIComponent(pag.vsCurrency));
  }
  url = url + '?' + queryParams.join('&');

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

      let newBars = [];
      for (let i = 0; i < result.data.length; i++) {
        let c = result.data[i];
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
        // Older history just paginated in → draw any trade markers now in range.
        scheduleTradeMarkerRefresh();
      }

      let olderBars = [];
      for (let j = 0; j < newBars.length; j++) {
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
    });
}

/**
 * Paginates older OHLCV pages into `window.ohlcvData` until the oldest loaded bar
 * is at or before `targetFromMs`, pagination is exhausted, or the 50-page cap is
 * reached, then invokes `onDone`. Page fetches abort silently (without calling
 * `onDone`) if `window.ohlcvGeneration` advances mid-flight — a newer series has
 * superseded this one.
 *
 * Shared by the datafeed getBars path ({@link slbFetchOlderBarsUntilRange}) and the
 * viewport-centering path ({@link slbApplyCenteredVisibleRange}).
 */
function slbPaginateOlderBarsUntil(targetFromMs, onDone) {
  let gen = window.ohlcvGeneration;
  let remainingPages = 50;

  function finish() {
    if (gen !== window.ohlcvGeneration) {
      return;
    }
    onDone();
  }

  function step() {
    if (gen !== window.ohlcvGeneration) {
      return;
    }

    let oldest = window.ohlcvData[0] ? window.ohlcvData[0].time : null;
    if (targetFromMs == null || (oldest != null && oldest <= targetFromMs)) {
      finish();
      return;
    }

    let pag = window.ohlcvPagination;
    if (
      remainingPages <= 0 ||
      !pag.nextCursor ||
      !pag.hasMore ||
      !pag.assetId
    ) {
      finish();
      return;
    }
    remainingPages -= 1;

    let url = OHLCV_BASE_URL + '/' + pag.assetId;
    let queryParams = [];
    queryParams.push('nextCursor=' + encodeURIComponent(pag.nextCursor));
    if (pag.vsCurrency) {
      queryParams.push('vsCurrency=' + encodeURIComponent(pag.vsCurrency));
    }
    url = url + '?' + queryParams.join('&');

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

        let newBars = [];
        for (let i = 0; i < result.data.length; i++) {
          let c = result.data[i];
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
          step();
          return;
        }

        finish();
      })
      .catch(function () {
        finish();
      });
  }

  step();
}

/**
 * TradingView can ask for an initial visible window older than the first page RN
 * supplied (Social Trading positions centered on an old trade). On first
 * request, paginate backwards until the requested range is covered, then answer
 * from the expanded in-WebView candle cache.
 */
function slbFetchOlderBarsUntilRange(pending) {
  slbPaginateOlderBarsUntil(pending.fromMs, function () {
    let bars = filterBarsForRange(
      pending.fromMs,
      pending.toMs,
      pending.countBack,
    );
    pending.onResult(bars, { noData: bars.length === 0 });
    scheduleTradeMarkerRefresh();
  });
}

let customDatafeed = {
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
      let fromMs = periodParams.from * 1000;
      let toMs = periodParams.to * 1000;
      let countBack = periodParams.countBack;
      let firstRequest = periodParams.firstDataRequest;

      /**
       * Invokes TradingView’s callback, then completes deferred layout settle when this response is
       * the main load for the visible range (`firstDataRequest`), matching `resetData` / new OHLCV.
       */
      function deliverBars(bars, meta) {
        var firstDataRequest = !!periodParams.firstDataRequest;
        if (isHotReloadPreResetGetBars(firstDataRequest)) {
          // Must invoke onResult or setResolution never completes (UI freeze).
          // Empty/noData avoids poisoning the viewport with pre-reset bars.
          onResult([], { noData: true });
          return;
        }

        var pending = !!window.__mmLayoutSettlePending;
        var path1Eligible = pending && firstDataRequest;

        onResult(bars, meta);
        if (path1Eligible) {
          queueTryCompleteLayoutSettleAfterData();
        }
      }

      let bars = filterBarsForRange(fromMs, toMs, countBack);

      if (bars.length > 0) {
        deliverBars(bars, { noData: false });
        return;
      }

      let oldestTs = window.ohlcvData[0]?.time;
      if (
        // SocialLeaderboard only: back-fill older pages so the WebView can frame a
        // requested range that predates the loaded page (centering on an old
        // trade). Mode-gated so it never competes with other consumers' getBars
        // pagination paths.
        window.__slbMode &&
        firstRequest &&
        oldestTs != null &&
        fromMs < oldestTs &&
        window.ohlcvPagination &&
        window.ohlcvPagination.nextCursor &&
        window.ohlcvPagination.hasMore
      ) {
        slbFetchOlderBarsUntilRange({
          fromMs: fromMs,
          toMs: toMs,
          countBack: countBack,
          onResult: deliverBars,
        });
        return;
      }

      if (firstRequest || window.ohlcvData.length === 0) {
        deliverBars([], { noData: true });
        return;
      }

      // `oldestTs` is declared above (before the SLB back-fill block); reuse it
      // here instead of re-declaring so the two pagination paths coexist.
      if (window.ohlcvPagination.assetId) {
        // Token details path: WebView fetches older pages from Price API directly.
        fetchOlderBars({
          onResult: onResult,
          oldestAtDefer: oldestTs,
        });
      } else if (globalThis.rnBackedPagination.enabled) {
        // RN-backed path (Perps): send a request to RN and store the pending callback.
        const gen = globalThis.ohlcvGeneration;
        globalThis.olderBarsRequestSeq += 1;
        const requestId = 'obr-' + gen + '-' + globalThis.olderBarsRequestSeq;
        globalThis.pendingOlderBarsCallbacks.set(requestId, {
          onResult: onResult,
          oldestAtDefer: oldestTs,
          gen: gen,
        });
        sendToReactNative('FETCH_OLDER_BARS_REQUEST', {
          requestId: requestId,
          seriesGeneration: gen,
          symbol: globalThis.currentSymbol || symbolInfo.name,
          resolution: resolution,
          fromSec: periodParams.from,
          toSec: periodParams.to,
          countBack: periodParams.countBack,
          oldestLoadedTimeMs: oldestTs,
        });
      } else {
        onResult([], { noData: true });
        if (window.__mmLayoutSettlePending) {
          queueTryCompleteLayoutSettleAfterData();
        }
      }
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
let libraryLoadAttempts = 0;
let maxLibraryLoadAttempts = 50;

function loadLibrary() {
  let scriptUrl = window.CONFIG.libraryUrl + 'charting_library.js';

  let script = document.createElement('script');
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
      let errorMsg =
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
    let theme = window.CONFIG.theme;
    let features = window.CONFIG.features || {};
    let lcInit = getLineChrome();
    let initCustomLabels = lcInit.useCustomPriceLabels;
    let initCustomDashed = lcInit.useCustomDashedLastPriceLine;

    // Disabled features are passed from React Native via CONFIG.features.disabledFeatures.
    // Defaults are set in DEFAULT_DISABLED_FEATURES (AdvancedChart.types.ts) and are
    // optimized for the Token Details mobile UX. Consumers needing TradingView's
    // native UI (e.g. Perps) can override via the disabledFeatures prop.
    let disabledFeatures = (features.disabledFeatures || []).slice();

    if (!features.enableDrawingTools) {
      disabledFeatures.push('left_toolbar');
      disabledFeatures.push('context_menus');
    }

    let visibleToSec = Math.ceil(
      (window.visibleToMs != null ? window.visibleToMs : Date.now()) / 1000,
    );
    // Pad `to` by 2 bar durations so the end dot clears the price axis.
    // 1 bar was not enough for the 16px dot marker to fully clear the right edge.
    let initBarPadSec = getApproxBarDurationSec() * 2;
    let tfOption =
      window.visibleFromMs != null
        ? {
            type: 'time-range',
            from: Math.floor(window.visibleFromMs / 1000),
            to: visibleToSec + initBarPadSec,
          }
        : undefined;

    // TradingView only supports a fixed set of IANA timezone IDs.
    // If the device returns an unsupported ID we fall back to Etc/UTC.
    // List of supported timezones:  https://www.tradingview.com/charting-library-docs/latest/ui_elements/timezones#supported-time-zones
    let TV_SUPPORTED_TIMEZONES = [
      'Etc/UTC',
      'Africa/Cairo',
      'Africa/Casablanca',
      'Africa/Johannesburg',
      'Africa/Lagos',
      'Africa/Nairobi',
      'Africa/Tunis',
      'America/Anchorage',
      'America/Argentina/Buenos_Aires',
      'America/Bogota',
      'America/Caracas',
      'America/Chicago',
      'America/El_Salvador',
      'America/Halifax',
      'America/Juneau',
      'America/Lima',
      'America/Los_Angeles',
      'America/Mexico_City',
      'America/New_York',
      'America/Phoenix',
      'America/Santiago',
      'America/Sao_Paulo',
      'America/Toronto',
      'America/Vancouver',
      'Asia/Astana',
      'Asia/Ashkhabad',
      'Asia/Bahrain',
      'Asia/Bangkok',
      'Asia/Chongqing',
      'Asia/Colombo',
      'Asia/Dhaka',
      'Asia/Dubai',
      'Asia/Ho_Chi_Minh',
      'Asia/Hong_Kong',
      'Asia/Jakarta',
      'Asia/Jerusalem',
      'Asia/Karachi',
      'Asia/Kabul',
      'Asia/Kathmandu',
      'Asia/Kolkata',
      'Asia/Kuala_Lumpur',
      'Asia/Kuwait',
      'Asia/Manila',
      'Asia/Muscat',
      'Asia/Nicosia',
      'Asia/Qatar',
      'Asia/Riyadh',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Asia/Taipei',
      'Asia/Tehran',
      'Asia/Tokyo',
      'Asia/Yangon',
      'Atlantic/Azores',
      'Atlantic/Reykjavik',
      'Australia/Adelaide',
      'Australia/Brisbane',
      'Australia/Perth',
      'Australia/Sydney',
      'Europe/Amsterdam',
      'Europe/Athens',
      'Europe/Belgrade',
      'Europe/Berlin',
      'Europe/Bratislava',
      'Europe/Brussels',
      'Europe/Bucharest',
      'Europe/Budapest',
      'Europe/Copenhagen',
      'Europe/Dublin',
      'Europe/Helsinki',
      'Europe/Istanbul',
      'Europe/Lisbon',
      'Europe/London',
      'Europe/Luxembourg',
      'Europe/Madrid',
      'Europe/Malta',
      'Europe/Moscow',
      'Europe/Oslo',
      'Europe/Paris',
      'Europe/Prague',
      'Europe/Riga',
      'Europe/Rome',
      'Europe/Stockholm',
      'Europe/Tallinn',
      'Europe/Vienna',
      'Europe/Vilnius',
      'Europe/Warsaw',
      'Europe/Zurich',
      'Pacific/Auckland',
      'Pacific/Chatham',
      'Pacific/Fakaofo',
      'Pacific/Honolulu',
      'Pacific/Norfolk',
      'US/Mountain',
    ];

    // Intl returns canonical IANA names, but TradingView uses some legacy aliases.
    let CANONICAL_TO_TV = {
      'America/Denver': 'US/Mountain',
      'Asia/Ashgabat': 'Asia/Ashkhabad',
      'Asia/Almaty': 'Asia/Astana',
    };

    let userTimezone = (function () {
      try {
        let tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
        let mapped = CANONICAL_TO_TV[tz] || tz;
        return TV_SUPPORTED_TIMEZONES.indexOf(mapped) !== -1
          ? mapped
          : 'Etc/UTC';
      } catch (_e) {
        return 'Etc/UTC';
      }
    })();
    window.chartWidget = new TradingView.widget({
      symbol: window.currentSymbol,
      interval: window.currentResolution || '5',
      timeframe: tfOption,
      container: 'tv_chart_container',
      datafeed: customDatafeed,
      library_path: window.CONFIG.libraryUrl,
      locale: 'en',
      custom_formatters: {
        priceFormatterFactory: advancedChartPriceFormatterFactory,
      },
      timezone: userTimezone,
      fullscreen: false,
      autosize: true,
      theme: 'Dark',

      disabled_features: disabledFeatures.concat(
        'use_localstorage_for_settings',
      ),
      // Keep default logo placement on the *bottom* pane so it stays in the same corner when
      // toggling line (single pane) vs candle + volume (logo on volume strip). Forcing
      // move_logo_to_main_pane shifts the mark into the price pane and it jumps above volume.
      enabled_features: [
        'study_templates',
        'iframe_loading_same_origin',
        'always_show_legend_values_on_mobile',
      ],

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
          'paneProperties.vertGridProperties.color':
            theme.gridLineColor || 'transparent',
          'paneProperties.horzGridProperties.color':
            theme.gridLineColor || 'transparent',
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
          'paneProperties.legendProperties.showSeriesTitle': false,
          'paneProperties.legendProperties.showSeriesOHLC': false,
          'paneProperties.legendProperties.showBarChange': false,
          'paneProperties.legendProperties.showVolume': false,
          'paneProperties.legendProperties.showBackground': false,
          'paneProperties.legendProperties.showStudyTitles': false,
          'paneProperties.legendProperties.showStudyArguments': false,
          'paneProperties.legendProperties.showStudyValues': false,
          'mainSeriesProperties.showPriceLine':
            !initCustomDashed && !window.hasExplicitCurrentPriceLine,
          'mainSeriesProperties.priceLineColor':
            getThemeLastPriceLineColor(theme),

          'mainSeriesProperties.candleStyle.upColor': theme.successColor,
          'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
        },
        getBuiltInScaleLabelOverrides(theme, initCustomLabels),
        getSeriesColorOverrides(
          getThemeLineColor(theme),
          getThemeLastPriceLineColor(theme),
        ),
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

      if (window.visibleFromMs == null) {
        try {
          window.chartWidget.activeChart().getTimeScale().setRightOffset(2);
        } catch (e) {}
      }

      scheduleHidePriceScaleModeButtons();

      // Initialize price indicators based on chart type
      if (window.currentChartType === 2) {
        refreshLineChartOverlays();
      } else {
        ensureNoLineChartEndIcons();
        createLastPriceLine();
      }

      // SocialLeaderboard cold-init centering pass. Mode-gated so other consumers
      // keep the original onChartReady behavior (this call did not exist for them).
      if (window.__slbMode) {
        try {
          slbScheduleVisibleRangeFromWindowAfterDataLoad(
            window.chartWidget.activeChart(),
          );
        } catch (e) {}
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
      let chartTimeScaleLayoutDebounce = null;
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

      if (isLegendOverlayEnabled()) {
        createStudyLegendOverlay();
        injectHideLegendButtonsCSS();
        requestAnimationFrame(updateLegendOverlayLayout);
      }

      sendToReactNative('CHART_READY', {});

      if (window.currentChartType !== 2) {
        scheduleInitialColdLayoutSettled();
      }

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

            // Remember the latest crosshair point so a tap/short-press release
            // (mouse_up) can hit-test it against the trade markers for the
            // reverse interaction (tap a circle → scroll the trades list).
            window.__lastChartTapPoint = {
              timeSec: params.time,
              offsetY: params.offsetY,
              at: Date.now(),
            };

            if (!window.ohlcvBarVisible) {
              window.ohlcvBarShownAt = Date.now();
            }
            window.ohlcvBarVisible = true;

            let targetTime = params.time * 1000;
            let closestBar = null;
            let minDiff = Infinity;
            for (let i = 0; i < window.ohlcvData.length; i++) {
              let diff = Math.abs(window.ohlcvData[i].time - targetTime);
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

            if (params.entityValues) {
              updateStudyLegendFromEntityValues(params.entityValues);
            }
          });

        let mouseDownTime = 0;

        window.chartWidget.subscribe('mouse_down', function () {
          mouseDownTime = Date.now();
          window.ohlcvDismissUntil = 0;
        });

        window.chartWidget.subscribe('mouse_up', function () {
          // Reverse interaction: a press landing on a trade circle tells RN to
          // scroll the trades list to that trade. Uses the crosshair point
          // captured just before release; consume it so it fires only once.
          let tap = window.__lastChartTapPoint;
          window.__lastChartTapPoint = null;
          if (tap && Date.now() - tap.at < 700) {
            let pressedId = findTradeMarkerIdNearPoint(
              tap.timeSec,
              tap.offsetY,
            );
            if (pressedId != null) {
              sendToReactNative('TRADE_MARKER_PRESSED', { id: pressedId });
            }
          }

          if (!window.ohlcvBarVisible) return;
          let pressDuration = Date.now() - mouseDownTime;
          if (pressDuration < 400) {
            // Short tap — only dismiss if bar has been visible long enough
            // to avoid synthetic click events on long-press release
            if (Date.now() - window.ohlcvBarShownAt < 500) return;
            window.ohlcvBarVisible = false;
            window.ohlcvBarShownAt = 0;
            window.ohlcvDismissUntil = Date.now() + 800;
            hideCustomCrosshairLabels();
            refreshStudyLegendFromExport();
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
    let errMsg = error && error.message ? String(error.message) : String(error);
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
