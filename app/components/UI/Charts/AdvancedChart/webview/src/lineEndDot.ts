/**
 * Line chart end dot (icon shape) — refresh, sweep, and visibility logic.
 */

import { getState } from './state';
import { getLineChrome } from './lineChrome';
import {
  normalizeChartUnixSec,
  getApproxBarDurationSec,
  parseTimeFromTvDataLast,
  parseCloseFromTvDataLast,
} from './timeUtils';

import type { TVActiveChart, TVEntityId } from './types';

export const LINE_END_ICON_TIME_INSET_PX = 40;
export const OUTLINE_EDGE_TIME_INSET_PX = 0;
export const LINE_END_ICON_PROBE_STEP_PX = 8;
export const LINE_END_ICON_MAX_PROBES = 14;

export function getLineEndDotTimeAndPriceFromSeries(
  chart: TVActiveChart | null,
): { timeSec: number; price: number } | null {
  const s = getState();
  let fallback: { timeSec: number; price: number } | null = null;
  if (s.ohlcvData?.length) {
    const b = s.ohlcvData[s.ohlcvData.length - 1];
    const tr = Number(b.time);
    const cl = Number(b.close);
    if (isFinite(tr) && isFinite(cl)) {
      fallback = {
        timeSec: tr >= 1e12 ? Math.floor(tr / 1000) : Math.floor(tr),
        price: cl,
      };
    }
  }
  if (!chart) return fallback;
  try {
    const series = chart.getSeries();
    if (!series) return fallback;
    if (typeof series.data === 'function') {
      const ds = series.data();
      if (ds && typeof ds.last === 'function') {
        const last = ds.last();
        if (last) {
          const tvT = parseTimeFromTvDataLast(last);
          const tvC = parseCloseFromTvDataLast(last);
          if (tvT !== null && isFinite(tvT) && tvC !== null && isFinite(tvC)) {
            return {
              timeSec: tvT >= 1e12 ? Math.floor(tvT / 1000) : Math.floor(tvT),
              price: tvC,
            };
          }
        }
      }
    }
    if (typeof series.bars === 'function') {
      const bars = series.bars();
      if (bars?.length) {
        const lb = bars[bars.length - 1];
        const tvT2 = parseTimeFromTvDataLast(lb);
        const tvC2 = parseCloseFromTvDataLast(lb);
        if (
          tvT2 !== null &&
          isFinite(tvT2) &&
          tvC2 !== null &&
          isFinite(tvC2)
        ) {
          return {
            timeSec: tvT2 >= 1e12 ? Math.floor(tvT2 / 1000) : Math.floor(tvT2),
            price: tvC2,
          };
        }
      }
    }
  } catch {
    // swallow
  }
  return fallback;
}

export function resolveLineEndOverlayPoint(
  chart: TVActiveChart | null,
): { timeSec: number; price: number } | null {
  return getLineEndDotTimeAndPriceFromSeries(chart);
}

function shouldSkipLineEndIconTimeExtrapolation(
  chart: TVActiveChart | null,
  lastBarTimeSec: number,
): boolean {
  const s = getState();
  const d = s.ohlcvData;
  if (!d || d.length < 2) return true;
  if (!chart || !isFinite(lastBarTimeSec)) return true;
  try {
    const br = chart.getVisibleBarsRange();
    if (!br || br.from === undefined || br.to === undefined) return true;
    const brFromSec = normalizeChartUnixSec(br.from);
    const brToSec = normalizeChartUnixSec(br.to);
    if (brFromSec === null || brToSec === null) return true;
    const barDur = getApproxBarDurationSec(d);
    const visibleSpan = Math.abs(brToSec - brFromSec);
    if (visibleSpan > barDur * Math.max(d.length, 1) * 96) return true;
    if (lastBarTimeSec > brToSec + barDur * 4) return true;
    if (lastBarTimeSec + barDur * 4 < brToSec) return true;
  } catch {
    return true;
  }
  return false;
}

function trailingVisibleBarMatchesSeriesLast(
  chart: TVActiveChart,
  lastBarTimeSec: number,
): boolean {
  const s = getState();
  try {
    const br = chart.getVisibleBarsRange();
    if (!br || br.to === undefined) return false;
    const brToSec = normalizeChartUnixSec(br.to);
    if (brToSec === null) return false;
    const barDur = getApproxBarDurationSec(s.ohlcvData);
    return (
      lastBarTimeSec <= brToSec + barDur &&
      lastBarTimeSec >= brToSec - 2 * barDur
    );
  } catch {
    return false;
  }
}

export function getLineEndIconTimeSec(
  chart: TVActiveChart | null,
  lastBarTimeSec: number,
): number {
  if (!chart || !isFinite(lastBarTimeSec)) return lastBarTimeSec;
  if (
    shouldSkipLineEndIconTimeExtrapolation(chart, lastBarTimeSec) ||
    !trailingVisibleBarMatchesSeriesLast(chart, lastBarTimeSec)
  ) {
    return lastBarTimeSec;
  }
  try {
    const ts = chart.getTimeScale();
    if (!ts?.coordinateToTime || !ts?.width) return lastBarTimeSec;
    const w = ts.width();
    if (!(w > LINE_END_ICON_TIME_INSET_PX + 4)) return lastBarTimeSec;
    const vr = chart.getVisibleRange?.();
    const capSec = vr?.to != null ? normalizeChartUnixSec(vr.to) : null;
    for (let k = 0; k < LINE_END_ICON_MAX_PROBES; k++) {
      const x = Math.max(
        0,
        Math.floor(
          w - LINE_END_ICON_TIME_INSET_PX - k * LINE_END_ICON_PROBE_STEP_PX,
        ),
      );
      const rawT = ts.coordinateToTime(x);
      if (rawT == null) continue;
      const numT = Number(rawT);
      if (!isFinite(numT)) continue;
      let tNorm = normalizeChartUnixSec(numT);
      if (tNorm === null || tNorm < lastBarTimeSec) continue;
      if (capSec !== null && tNorm > capSec) tNorm = capSec;
      return tNorm;
    }
  } catch {
    return lastBarTimeSec;
  }
  return lastBarTimeSec;
}

export function removeLineEndDot(): void {
  const s = getState();
  if (!s.lineEndDotShapeId || !s.chartWidget) return;
  try {
    s.chartWidget.activeChart().removeEntity(s.lineEndDotShapeId);
  } catch {
    // swallow
  }
  s.lineEndDotShapeId = null;
}

export function sweepOrphanLineChartIconShapes(): void {
  const s = getState();
  if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady) return;
  try {
    const chart = s.chartWidget.activeChart();
    const shapes = chart.getAllShapes();
    if (!shapes?.length) return;
    for (const shape of shapes) {
      if (/icon/i.test(String(shape.name || ''))) {
        try {
          chart.removeEntity(shape.id);
        } catch {
          /* */
        }
      }
    }
  } catch {
    // swallow
  }
}

export function ensureNoLineChartEndIcons(): void {
  const s = getState();
  if (s.currentChartType === 2) return;
  removeLineEndDot();
  s.lineEndDotShapeId = null;
  if (!s.chartWidget || !s.isChartReady) return;
  try {
    const chart = s.chartWidget.activeChart();
    const shapes = chart.getAllShapes();
    if (!shapes?.length) return;
    for (const shape of shapes) {
      if (/icon/i.test(String(shape.name || ''))) {
        try {
          chart.removeEntity(shape.id);
        } catch {
          /* */
        }
      }
    }
  } catch {
    // swallow
  }
}

export function refreshLineEndDot(): void {
  const s = getState();
  s.__lineEndDotPlacementGen = (s.__lineEndDotPlacementGen || 0) + 1;
  const placementGen = s.__lineEndDotPlacementGen;

  removeLineEndDot();
  sweepOrphanLineChartIconShapes();

  if (
    s.currentChartType !== 2 ||
    !s.chartWidget ||
    !s.isChartReady ||
    !s.ohlcvData.length
  )
    return;
  if (!getLineChrome().useCustomLineEndMarker) return;

  const color = s.CONFIG.theme.successColor;

  function placeLineEndIcon() {
    if (placementGen !== s.__lineEndDotPlacementGen) return;
    if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady) return;
    const chart = s.chartWidget.activeChart();
    const pt = resolveLineEndOverlayPoint(chart);
    if (!pt || !isFinite(pt.timeSec) || !isFinite(pt.price)) return;
    if (placementGen !== s.__lineEndDotPlacementGen) return;
    const iconTimeSec = getLineEndIconTimeSec(chart, pt.timeSec);

    chart
      .createShape(
        { time: iconTimeSec, price: pt.price },
        {
          shape: 'icon',
          icon: 0xf111,
          lock: true,
          overrides: { color, size: 16 },
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
          showInObjectsTree: false,
          zOrder: 'top',
        },
      )
      .then((id: TVEntityId) => {
        if (
          placementGen !== s.__lineEndDotPlacementGen ||
          s.currentChartType !== 2
        ) {
          if (id)
            try {
              chart.removeEntity(id);
            } catch {
              /* */
            }
          return;
        }
        if (id) s.lineEndDotShapeId = id;
      })
      .catch(() => {
        /* noop */
      });
  }

  try {
    const chartForReady = s.chartWidget.activeChart();
    if (chartForReady && typeof chartForReady.dataReady === 'function') {
      chartForReady.dataReady(placeLineEndIcon);
    } else {
      try {
        requestAnimationFrame(placeLineEndIcon);
      } catch {
        setTimeout(placeLineEndIcon, 0);
      }
    }
  } catch {
    placeLineEndIcon();
  }
}

let lineEndDotVisibleRangeDebounce: ReturnType<typeof setTimeout> | null = null;

export function clearLineEndDotVisibleRangeDebounce(): void {
  if (lineEndDotVisibleRangeDebounce) {
    clearTimeout(lineEndDotVisibleRangeDebounce);
    lineEndDotVisibleRangeDebounce = null;
  }
}

export function scheduleLineEndDotAfterVisibleRangeChange(): void {
  const s = getState();
  if (s.currentChartType !== 2) return;
  if (!getLineChrome().useCustomLineEndMarker) return;
  if (lineEndDotVisibleRangeDebounce)
    clearTimeout(lineEndDotVisibleRangeDebounce);
  const epochAtSchedule = s.lineChartOhlcvEpoch;
  lineEndDotVisibleRangeDebounce = setTimeout(() => {
    lineEndDotVisibleRangeDebounce = null;
    if (s.lineChartOhlcvEpoch !== epochAtSchedule) return;
    if (s.currentChartType !== 2 || !s.chartWidget || !s.isChartReady) return;
    try {
      const chart = s.chartWidget.activeChart();
      if (chart && typeof chart.dataReady === 'function') {
        chart.dataReady(() => {
          if (s.lineChartOhlcvEpoch !== epochAtSchedule) return;
          refreshLineEndDot();
        });
      } else {
        refreshLineEndDot();
      }
    } catch {
      // swallow
    }
  }, 150);
}
