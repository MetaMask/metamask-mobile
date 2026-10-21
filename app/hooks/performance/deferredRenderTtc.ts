import { useLayoutEffect } from 'react';
import { getPerformanceTimestamp } from '../../util/trace';
import {
  DeferredRenderPoint,
  DeferredRenderScreenIds,
  deferredRenderProbeId,
  PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID,
  PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID,
  type DeferredRenderPointId,
  type DeferredRenderScreenId,
  type PerpsChartRenderPath,
} from './deferredRenderPerformanceIds';
import {
  isScreenTtcProbeEnabled,
  recordScreenTtc,
  type ScreenTtcContentState,
} from './screenTtcRegistry';

const origins = new Map<DeferredRenderScreenId, number>();
const recordedPoints = new Set<string>();

function pointKey(
  screenId: DeferredRenderScreenId,
  point: DeferredRenderPointId,
): string {
  return `${screenId}:${point}`;
}

/**
 * Tap or navigation that opens the screen. Duration is 0; later points are
 * milliseconds after this timestamp. Clears points from the previous visit.
 * No-ops unless the screen TTC probe is enabled (e2e or performance builds).
 */
export function markDeferredRenderNavStart(
  screenId: DeferredRenderScreenId,
): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }

  const now = getPerformanceTimestamp();
  origins.set(screenId, now);
  for (const point of Object.values(DeferredRenderPoint)) {
    recordedPoints.delete(pointKey(screenId, point));
  }
  recordedPoints.add(pointKey(screenId, DeferredRenderPoint.NAV_START));
  recordScreenTtc(
    deferredRenderProbeId(screenId, DeferredRenderPoint.NAV_START),
    0,
    'filled',
  );
}

/**
 * Records one point measured from nav start. The first sample wins until the
 * next {@link markDeferredRenderNavStart}. No-ops when the probe is disabled.
 */
export function markDeferredRenderPoint(
  screenId: DeferredRenderScreenId,
  point: DeferredRenderPointId,
  contentState: ScreenTtcContentState = 'filled',
): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }

  const key = pointKey(screenId, point);
  if (recordedPoints.has(key)) {
    return;
  }

  const now = getPerformanceTimestamp();
  let origin = origins.get(screenId);
  if (origin === undefined) {
    origin = now;
    origins.set(screenId, origin);
  }
  recordedPoints.add(key);
  recordScreenTtc(
    deferredRenderProbeId(screenId, point),
    now - origin,
    contentState,
  );
}

/**
 * chart_ready after two animation frames, so the sample is the drawn frame.
 * No-ops when the probe is disabled, and does not delay the caller's other work.
 */
export function markDeferredRenderChartReady(
  screenId: DeferredRenderScreenId,
): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      markDeferredRenderPoint(screenId, DeferredRenderPoint.CHART_READY);
    });
  });
}

/**
 * Last write wins. Records the perps chart implementation that mounted.
 * No-ops when the probe is disabled.
 */
export function markPerpsChartRenderPath(path: PerpsChartRenderPath): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }
  const now = getPerformanceTimestamp();
  let origin = origins.get(DeferredRenderScreenIds.PERPS_MARKET_DETAILS);
  if (origin === undefined) {
    origin = now;
    origins.set(DeferredRenderScreenIds.PERPS_MARKET_DETAILS, origin);
  }
  recordScreenTtc(
    PERPS_MARKET_DETAILS_CHART_PATH_PROBE_ID,
    now - origin,
    'filled',
    path,
  );
}

/** Visible pin failure. No-ops when the probe is disabled. */
export function markPerpsChartPinFailed(): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }
  recordScreenTtc(PERPS_MARKET_DETAILS_CHART_PIN_PROBE_ID, 0, 'error');
}

/** First commit of the screen, before paint. Safe to call in production. */
export function useDeferredRenderFirstRender(
  screenId: DeferredRenderScreenId,
): void {
  useLayoutEffect(() => {
    markDeferredRenderPoint(screenId, DeferredRenderPoint.FIRST_RENDER);
  }, [screenId]);
}

/** Test-only reset. */
export function _resetDeferredRenderTtcForTesting(): void {
  origins.clear();
  recordedPoints.clear();
}
