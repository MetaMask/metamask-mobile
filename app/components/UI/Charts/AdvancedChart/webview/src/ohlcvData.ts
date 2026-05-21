/**
 * SET_OHLCV_DATA and REALTIME_UPDATE handlers.
 */

import {
  getState,
  suppressChartUserInteraction,
  bumpLineChartOhlcvEpoch,
} from './state';
import {
  sendToReactNative,
  beginDeferredLayoutSettleAfterOhlcvReload,
  abortDeferredLayoutSettleAndNotify,
} from './bridge';
import { detectResolution } from './resolution';
import { getLineChrome } from './lineChrome';
import { getApproxBarDurationSec } from './timeUtils';
import {
  refreshLineChartOverlays,
  createLastPriceLine,
  removeAllLastPriceHorizontalOverlays,
} from './lastPrice';
import { ensureNoLineChartEndIcons } from './lineEndDot';
import { scheduleLastCloseLabelUpdate } from './overlays';

import type {
  SetOHLCVDataPayload,
  RealtimeUpdatePayload,
  TVActiveChart,
} from './types';

export function handleSetOHLCVData(
  payload: SetOHLCVDataPayload,
  initChart: () => void,
): void {
  if (!payload?.data?.length) return;
  const s = getState();

  suppressChartUserInteraction(700);

  s.ohlcvData = payload.data;
  bumpLineChartOhlcvEpoch();
  s.ohlcvGeneration++;

  if (payload.pagination) {
    s.ohlcvPagination = {
      nextCursor: payload.pagination.nextCursor || null,
      hasMore: !!payload.pagination.hasMore,
      assetId: payload.pagination.assetId || null,
      vsCurrency: payload.pagination.vsCurrency || null,
    };
  } else {
    s.ohlcvPagination = {
      nextCursor: null,
      hasMore: false,
      assetId: null,
      vsCurrency: null,
    };
  }

  s.visibleFromMs = payload.visibleFromMs ?? null;
  s.visibleToMs = payload.visibleToMs ?? null;

  const newResolution = detectResolution(s.ohlcvData);

  function scheduleVisibleRangeAfterDataLoad(chart: TVActiveChart) {
    if (s.visibleFromMs == null) return;
    const capturedGen = s.ohlcvGeneration;
    const sub = chart.onDataLoaded();
    sub.subscribe(null, function onLoaded() {
      sub.unsubscribe(null, onLoaded);
      if (capturedGen !== s.ohlcvGeneration) return;
      const fromSec = Math.floor((s.visibleFromMs as number) / 1000);
      const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
      const toSec = lastBar
        ? Math.ceil(lastBar.time / 1000)
        : Math.ceil(Date.now() / 1000);
      const barPadSec = getApproxBarDurationSec(s.ohlcvData) * 2;
      try {
        chart.setVisibleRange(
          { from: fromSec, to: toSec + barPadSec },
          { percentRightMargin: 0 },
        );
      } catch {
        // swallow
      }
    });
  }

  if (s.chartWidget && s.isChartReady) {
    const previousResolution = s.currentResolution;
    s.currentResolution = newResolution;
    try {
      const chart = s.chartWidget.activeChart();
      if (previousResolution !== newResolution) {
        chart.setResolution(newResolution, () => {
          try {
            chart.resetData();
            beginDeferredLayoutSettleAfterOhlcvReload();
            scheduleVisibleRangeAfterDataLoad(chart);
          } catch {
            abortDeferredLayoutSettleAndNotify();
          }
        });
      } else {
        try {
          chart.resetData();
          beginDeferredLayoutSettleAfterOhlcvReload();
          scheduleVisibleRangeAfterDataLoad(chart);
        } catch {
          abortDeferredLayoutSettleAndNotify();
        }
      }
    } catch {
      abortDeferredLayoutSettleAndNotify();
      s.chartWidget.remove();
      s.chartWidget = null;
      s.isChartReady = false;
      s.activeStudies = new Map();
      s.volumeStudyId = null;
      s.volumeIsOverlay = null;
      s.lastPriceShapeId = null;
      s.lineEndDotShapeId = null;
      s.lineLastPriceShapeId = null;
      s.positionShapeIds = [];
      s.realtimeCallbacks = {};
      s.currentChartType = 2;
      initChart();
    }
  } else if (s.chartWidget && !s.isChartReady) {
    s.currentResolution = newResolution;
  } else if (!s.chartWidget) {
    s.currentResolution = newResolution;
    initChart();
  }
}

export function handleRealtimeUpdate(payload: RealtimeUpdatePayload): void {
  if (!payload?.bar) return;
  const s = getState();
  const bar = payload.bar;

  if (s.ohlcvData.length > 0) {
    const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
    if (lastBar.time === bar.time) {
      s.ohlcvData[s.ohlcvData.length - 1] = bar;
    } else {
      s.ohlcvData.push(bar);
    }
  } else {
    s.ohlcvData.push(bar);
  }
  bumpLineChartOhlcvEpoch();

  const tick = {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
  for (const guid of Object.keys(s.realtimeCallbacks)) {
    s.realtimeCallbacks[guid](tick);
  }

  if (s.currentChartType === 2) {
    refreshLineChartOverlays();
  } else if (s.currentChartType === 1) {
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
