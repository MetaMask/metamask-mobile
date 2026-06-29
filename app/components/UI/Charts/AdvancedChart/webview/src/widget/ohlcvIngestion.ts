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
import { detectResolution } from '../core/resolution';
import { getApproxBarDurationSec } from '../core/timeUtils';
import {
  appendOrReplaceLastBar,
  bumpOhlcvGeneration,
  clearOhlcvPagination,
  getCurrentResolution,
  getOhlcvData,
  getOhlcvGeneration,
  getVisibleFromMs,
  getWidget,
  isChartReady,
  setCurrentResolution,
  setOhlcvData,
  setOhlcvPagination,
  setVisibleFromMs,
  setVisibleToMs,
} from '../core/state';
import type { TVActiveChart } from '../core/types';
import { forwardRealtimeTick } from './datafeed';
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
  if (!payload || !payload.data || payload.data.length === 0) {
    return;
  }

  setOhlcvData(payload.data);
  bumpOhlcvGeneration();

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
      if (previousResolution !== newResolution) {
        chart.setResolution(newResolution, () => {
          try {
            chart.resetData();
            applyVisibleRange(chart);
            emitLayoutSettled();
          } catch (error) {
            reportErrorToRN(error);
          }
        });
      } else {
        chart.resetData();
        applyVisibleRange(chart);
        emitLayoutSettled();
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
  if (!payload || !payload.bar) return;

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
  const fromMs = getVisibleFromMs();
  if (fromMs == null) {
    try {
      chart.getTimeScale().setRightOffset(2);
    } catch (error) {
      reportErrorToRN(error);
    }
    return;
  }

  const capturedGeneration = getOhlcvGeneration();
  const subscription = chart.onDataLoaded();
  const onLoaded = (): void => {
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

/** Test-only: clear the first-data trigger and the delivery flag. */
export function __resetOhlcvIngestionForTests(): void {
  firstDataCallback = null;
  firstDataDelivered = false;
}
