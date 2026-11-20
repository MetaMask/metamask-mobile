// SET_OHLCV_DATA and REALTIME_UPDATE inbound handlers.
//
// Ported from chartLogic.js: handleSetOHLCVData (~line 507) and
// handleRealtimeUpdate (~line 658).
//
// Phase 2 simplifications vs legacy:
// - No `__mmLayoutSettlePending` / `beginDeferredLayoutSettleAfterOhlcvReload`
//   plumbing — CHART_LAYOUT_SETTLED is emitted on chart ready and on each
//   data load directly.
// - No chrome-related branches (`refreshLineChartOverlays`, line-end-dot,
//   custom dashed price line) — those features are deleted in Phase 4.
// - No trade-marker / indicator-state clear paths — Phase 5 / Phase 3 own
//   those overlays and they hook into their own message types, not into
//   SET_OHLCV_DATA's reset path.

import { postToRN, reportErrorToRN } from '../core/bridge';
import { notifyDataLifecycle } from '../core/dataLifecycle';
import { detectResolution } from '../core/resolution';
import { getApproxBarDurationSec } from '../core/timeUtils';
import {
  appendOrReplaceLastBar,
  bumpHotReloadSeq,
  bumpOhlcvGeneration,
  clearOhlcvPagination,
  doesLegendOwnLayoutSettle,
  getActiveStudies,
  getCurrentResolution,
  getHotReloadSeq,
  getMaStudies,
  getOhlcvData,
  getOhlcvGeneration,
  getSlbMode,
  getVisibleFromMs,
  getWidget,
  isChartReady,
  setCurrentResolution,
  setLegendOwnsLayoutSettle,
  setOhlcvData,
  setOhlcvPagination,
  setRnBackedPagination,
  setSlbCenteringPending,
  setSlbMode,
  setVisibleFromMs,
  setVisibleToMs,
} from '../core/state';
import type { TVActiveChart, TVChartingLibraryWidget } from '../core/types';
import { forwardRealtimeTick } from './datafeed';
import { resolveAllPendingOlderBarsNoData } from '../pagination/rnBacked';
import { slbCenterViewport } from '../overlays/socialLeaderboard';
import type {
  RealtimeUpdateMessage,
  SetOHLCVDataPayload,
} from '../messages/contract';

type FirstDataCallback = () => void;

let firstDataCallback: FirstDataCallback | null = null;
let firstDataDelivered = false;

// [ASSETS-4400] TEMP diagnostics — remove before merge. Routes through the
// benign DEBUG outbound channel (NOT the ERROR channel, which would trigger the
// RN-side Lightweight fallback). AdvancedChart.tsx re-logs every DEBUG message
// so these surface in Android logcat as `ReactNativeJS` under the `[ASSETS-4400]`
// tag. Lets us observe, on a mobile interval switch, whether the deferred
// `chart.onDataLoaded()` callback actually re-fires.
function logA4400(message: string, extra?: Record<string, unknown>): void {
  // The RN-side parseWebViewMessage keeps only DEBUG `message`, so serialize
  // any structured fields into the string itself.
  let suffix = '';
  if (extra) {
    try {
      suffix = ` ${JSON.stringify(extra)}`;
    } catch {
      suffix = '';
    }
  }
  postToRN('DEBUG', { message: `[ASSETS-4400][core] ${message}${suffix}` });
}

/**
 * When active indicators exist, defers the CHART_LAYOUT_SETTLED signal to the
 * legend module so it fires after the first successful legend render — not on
 * the premature 2-rAF timer in emitLayoutSettled.
 */
function claimLegendSettleOwnership(): void {
  if (getActiveStudies().size > 0 || getMaStudies().size > 0) {
    setLegendOwnsLayoutSettle(true);
  }
}

/**
 * Registers the callback invoked the first time SET_OHLCV_DATA arrives.
 * Bootstrap wires this to widget creation (loads the TV library if needed,
 * then calls createChartWidget).
 */
export function onFirstOhlcvData(cb: FirstDataCallback): void {
  firstDataCallback = cb;
}

export function handleSetOHLCVData(payload: SetOHLCVDataPayload): void {
  if (!payload?.data || payload.data.length === 0) {
    return;
  }

  resolveAllPendingOlderBarsNoData();

  setOhlcvData(payload.data);
  bumpOhlcvGeneration();

  if (payload.rnBackedPagination) {
    setRnBackedPagination(payload.rnBackedPagination);
  }

  const slb = !!payload.slbMode;
  setSlbMode(slb);
  if (slb) {
    setSlbCenteringPending(true);
  }

  if (payload.pagination) {
    setOhlcvPagination({
      nextCursor: payload.pagination.nextCursor ?? null,
      hasMore: !!payload.pagination.hasMore,
      assetId: payload.pagination.assetId ?? null,
      vsCurrency: payload.pagination.vsCurrency ?? null,
    });
  } else {
    clearOhlcvPagination();
  }

  setVisibleFromMs(payload.visibleFromMs ?? null);
  setVisibleToMs(payload.visibleToMs ?? null);

  const newResolution = detectResolution(payload.data);
  const previousResolution = getCurrentResolution();
  setCurrentResolution(newResolution);

  const widget = getWidget();
  const chartReady = isChartReady();
  const sameResolution = previousResolution === newResolution;
  // [ASSETS-4400] TEMP — which branch handleSetOHLCVData takes on this
  // SET_OHLCV_DATA. On an interval switch we expect `branch: 'setResolution'`.
  logA4400('handleSetOHLCVData', {
    previousResolution,
    newResolution,
    hasWidget: Boolean(widget),
    isChartReady: chartReady,
    branch:
      widget && chartReady
        ? sameResolution
          ? 'resetData(sameResolution)'
          : 'setResolution(differentResolution)'
        : 'deferredFirstData',
  });
  if (widget && chartReady) {
    try {
      const chart = widget.activeChart();
      if (previousResolution === newResolution) {
        // Same resolution — TV won't re-fetch via getBars, so we must
        // resetData to force it to pick up the new bars from the datafeed.
        resetDatafeedCacheBeforeHotReload(widget);
        chart.resetData();
        resetMainPriceScaleAutoScale(chart);
        notifyDataLifecycle('ohlcvReset');
        applyVisibleRange(chart);
        emitLayoutSettled();
      } else {
        // Different resolution — let setResolution handle the transition
        // naturally. TV calls getBars internally, the datafeed returns the
        // new bars (already stored via setOhlcvData above), and TV renders
        // them smoothly without a blank frame. No resetData needed.
        claimLegendSettleOwnership();
        const seq = bumpHotReloadSeq();
        chart.setResolution(newResolution, () => {
          if (getHotReloadSeq() !== seq) {
            return;
          }
          resetMainPriceScaleAutoScale(chart);
          applyVisibleRange(chart, { dataAlreadyLoaded: true });
          emitLayoutSettled();
        });
      }
    } catch (error) {
      reportErrorToRN(error);
    }
    return;
  }

  if (!widget && firstDataCallback && !firstDataDelivered) {
    firstDataDelivered = true;
    try {
      firstDataCallback();
    } catch (error) {
      firstDataDelivered = false;
      reportErrorToRN(error);
    }
  }
}

export function handleRealtimeUpdate(
  payload: RealtimeUpdateMessage['payload'],
): void {
  if (!payload?.bar) return;

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

function applyVisibleRange(
  chart: TVActiveChart,
  options?: { dataAlreadyLoaded?: boolean },
): void {
  // Strategy C (SLB): center the viewport on the trade window using both
  // visibleFromMs and visibleToMs. Handled by the socialLeaderboard overlay
  // which subscribes to onDataLoaded and frames the exact trade window.
  if (getSlbMode()) {
    slbCenterViewport(chart, { immediate: options?.dataAlreadyLoaded });
    return;
  }

  const fromMs = getVisibleFromMs();
  // [ASSETS-4400] TEMP — applyVisibleRange entry. `willSubscribeOnDataLoaded`
  // true means we take the deferred `chart.onDataLoaded()` path (the crux we
  // want to observe); `willSetRightOffset` true means fromMs was null and we
  // bail with a right-offset instead.
  logA4400('applyVisibleRange entry', {
    visibleFromMs: fromMs,
    dataAlreadyLoaded: Boolean(options?.dataAlreadyLoaded),
    willSetRightOffset: fromMs == null,
    willSubscribeOnDataLoaded: fromMs != null,
  });
  if (fromMs == null) {
    try {
      chart.getTimeScale().setRightOffset(2);
    } catch (error) {
      reportErrorToRN(error);
    }
    return;
  }

  // Strategy A / B: anchor the visible range from `visibleFromMs` to the
  // last bar + 2-bar padding. This one-sided framing works because Token
  // Details and Perps always want the right edge near the latest candle.
  const capturedGeneration = getOhlcvGeneration();
  const subscription = chart.onDataLoaded();
  const onLoaded = (): void => {
    subscription.unsubscribe(null, onLoaded);
    // [ASSETS-4400] TEMP — THE CRUX. If this line appears after an interval
    // switch, the deferred `chart.onDataLoaded()` callback DID re-fire on
    // mobile. If it never appears (while `applyVisibleRange entry` logged
    // `willSubscribeOnDataLoaded: true`), the deferred path silently never ran.
    logA4400('onDataLoaded fired');
    if (capturedGeneration !== getOhlcvGeneration()) {
      logA4400('onDataLoaded stale generation — skipping setVisibleRange', {
        capturedGeneration,
        currentGeneration: getOhlcvGeneration(),
      });
      return;
    }
    const data = getOhlcvData();
    const lastBar = data.at(-1);
    const toSec = lastBar
      ? Math.ceil(lastBar.time / 1000)
      : Math.ceil(Date.now() / 1000);
    const barPadSec = getApproxBarDurationSec(data) * 2;
    const from = Math.floor(fromMs / 1000);
    const to = toSec + barPadSec;
    // [ASSETS-4400] TEMP — immediately before the deferred setVisibleRange runs.
    logA4400('setVisibleRange (deferred)', { from, to });
    try {
      chart.setVisibleRange({ from, to }, { percentRightMargin: 0 });
    } catch (error) {
      reportErrorToRN(error);
    }
  };
  subscription.subscribe(null, onLoaded);
}

function emitLayoutSettled(): void {
  if (doesLegendOwnLayoutSettle()) {
    return;
  }
  const send = (): void => {
    if (getWidget() && isChartReady()) {
      postToRN('CHART_LAYOUT_SETTLED', {});
    }
  };
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(send);
    });
  } catch {
    setTimeout(send, 48);
  }
}

function resetMainPriceScaleAutoScale(chart: TVActiveChart): void {
  try {
    if (typeof chart.getPanes !== 'function') return;
    const panes = chart.getPanes?.();
    const mainPane = panes?.[0];
    if (!mainPane || typeof mainPane.getMainSourcePriceScale !== 'function') {
      return;
    }
    const priceScale = mainPane.getMainSourcePriceScale();
    if (typeof priceScale?.setAutoScale === 'function') {
      priceScale.setAutoScale(true);
    }
  } catch {
    // Best-effort; failures are non-critical
  }
}

function resetDatafeedCacheBeforeHotReload(
  widget: TVChartingLibraryWidget,
): void {
  try {
    if (typeof widget.resetCache === 'function') {
      widget.resetCache();
    }
  } catch {
    // Best-effort; failures are non-critical
  }
}

/** Test-only: clear the first-data trigger and the delivery flag. */
export function __resetOhlcvIngestionForTests(): void {
  firstDataCallback = null;
  firstDataDelivered = false;
}
