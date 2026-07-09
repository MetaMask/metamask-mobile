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
  getCurrentResolution,
  getHotReloadSeq,
  getOhlcvData,
  getOhlcvGeneration,
  getSlbMode,
  getVisibleFromMs,
  getWidget,
  isChartReady,
  setCurrentResolution,
  setInHotReloadPreResetPhase,
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
  if (widget && isChartReady()) {
    try {
      const chart = widget.activeChart();
      if (previousResolution === newResolution) {
        setInHotReloadPreResetPhase(false);
        resetDatafeedCacheBeforeHotReload(widget);
        chart.resetData();
        resetMainPriceScaleAutoScale(chart);
        notifyDataLifecycle('ohlcvReset');
        applyVisibleRange(chart);
        emitLayoutSettled();
      } else {
        setInHotReloadPreResetPhase(true);
        const seq = bumpHotReloadSeq();
        chart.setResolution(newResolution, () => {
          if (getHotReloadSeq() !== seq) {
            return;
          }
          setInHotReloadPreResetPhase(false);
          try {
            resetDatafeedCacheBeforeHotReload(widget);
            chart.resetData();
            resetMainPriceScaleAutoScale(chart);
            notifyDataLifecycle('ohlcvReset');
            applyVisibleRange(chart);
            emitLayoutSettled();
          } catch (error) {
            setInHotReloadPreResetPhase(false);
            reportErrorToRN(error);
          }
        });
      }
    } catch (error) {
      setInHotReloadPreResetPhase(false);
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

function applyVisibleRange(chart: TVActiveChart): void {
  // Strategy C (SLB): center the viewport on the trade window using both
  // visibleFromMs and visibleToMs. Handled by the socialLeaderboard overlay
  // which subscribes to onDataLoaded and frames the exact trade window.
  if (getSlbMode()) {
    slbCenterViewport(chart);
    return;
  }

  const fromMs = getVisibleFromMs();
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
    if (capturedGeneration !== getOhlcvGeneration()) {
      return;
    }
    const data = getOhlcvData();
    const lastBar = data.at(-1);
    const toSec = lastBar
      ? Math.ceil(lastBar.time / 1000)
      : Math.ceil(Date.now() / 1000);
    const barPadSec = getApproxBarDurationSec(data) * 2;
    try {
      chart.setVisibleRange(
        { from: Math.floor(fromMs / 1000), to: toSec + barPadSec },
        { percentRightMargin: 0 },
      );
    } catch (error) {
      reportErrorToRN(error);
    }
  };
  subscription.subscribe(null, onLoaded);
}

function emitLayoutSettled(): void {
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
