/**
 * Last-price horizontal line overlays (candle + line chart modes).
 */

import { getState } from './state';
import { getLineChrome } from './lineChrome';
import {
  refreshLineEndDot,
  getLineEndDotTimeAndPriceFromSeries,
  resolveLineEndOverlayPoint,
} from './lineEndDot';
import {
  hideLastClosePriceLabelDom,
  scheduleLastCloseLabelUpdate,
} from './overlays';

import type { TVEntityId } from './types';

export function sweepNonPositionHorizontalLines(): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  try {
    const chart = s.chartWidget.activeChart();
    const shapes = chart.getAllShapes();
    if (!shapes?.length) return;
    const positionIds = s.positionShapeIds || [];
    for (const shape of shapes) {
      const id = shape.id;
      const name = String(shape.name || '');
      if (!/horizontal|horz/i.test(name)) continue;
      if (positionIds.indexOf(id) !== -1) continue;
      try {
        chart.removeEntity(id);
      } catch {
        /* */
      }
    }
  } catch {
    // swallow
  }
}

export function removeAllLastPriceHorizontalOverlays(options?: {
  hideLastCloseDom?: boolean;
}): void {
  sweepNonPositionHorizontalLines();
  const s = getState();
  s.lastPriceShapeId = null;
  s.lineLastPriceShapeId = null;
  const hideDom = !(options?.hideLastCloseDom === false);
  if (hideDom) hideLastClosePriceLabelDom();
}

export function createLastPriceLine(): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady || !s.ohlcvData.length) return;
  if (s.currentChartType !== 1) {
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
  const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
  const chart = s.chartWidget.activeChart();
  const color = s.CONFIG.theme.successColor;
  const candlePt = getLineEndDotTimeAndPriceFromSeries(chart);
  const candlePrice =
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
    .then((id: TVEntityId) => {
      if (s.currentChartType !== 1) {
        if (id)
          try {
            chart.removeEntity(id);
          } catch {
            /* */
          }
        return;
      }
      s.lastPriceShapeId = id;
      scheduleLastCloseLabelUpdate();
    })
    .catch(() => {
      /* noop */
    });
}

export function createLineLastPriceLine(): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady || !s.ohlcvData.length) return;
  const shouldDraw =
    s.currentChartType === 2 && getLineChrome().useCustomDashedLastPriceLine;
  s.__lineLastPriceLinePlacementGen =
    (s.__lineLastPriceLinePlacementGen || 0) + 1;
  const placementGen = s.__lineLastPriceLinePlacementGen;
  removeAllLastPriceHorizontalOverlays();
  if (!shouldDraw) return;

  const lastBar = s.ohlcvData[s.ohlcvData.length - 1];
  const chart = s.chartWidget.activeChart();
  const color = s.CONFIG.theme.successColor;
  const seriesPt = resolveLineEndOverlayPoint(chart);
  const linePrice =
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
    .then((id: TVEntityId) => {
      if (placementGen !== s.__lineLastPriceLinePlacementGen) {
        if (id)
          try {
            chart.removeEntity(id);
          } catch {
            /* */
          }
        return;
      }
      if (
        s.currentChartType !== 2 ||
        !getLineChrome().useCustomDashedLastPriceLine
      ) {
        if (id)
          try {
            chart.removeEntity(id);
          } catch {
            /* */
          }
        return;
      }
      s.lineLastPriceShapeId = id;
      scheduleLastCloseLabelUpdate();
    })
    .catch(() => {
      /* noop */
    });
}

export function refreshLineChartOverlays(): void {
  refreshLineEndDot();
  const s = getState();
  if (
    s.currentChartType === 2 &&
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
