import {
  DeferredRenderPoint,
  deferredRenderProbeId,
  type DeferredRenderPointId,
  type DeferredRenderScreenId,
} from '../../../../app/hooks/performance/deferredRenderPerformanceIds';
import type { PerformanceTracker } from '../../../reporters/PerformanceTracker';
import type { PlatformThreshold } from '../../../framework/TimerHelper';
import {
  addAppScreenTtcTimer,
  waitForAppScreenTtcRecord,
} from '../../utils/readScreenTtc';

/** Generous until a deferred-render baseline exists. Quality gates must not fail the run. */
export const DEFERRED_RENDER_APP_TTC_THRESHOLD: PlatformThreshold = {
  ios: 60_000,
  android: 60_000,
};

const PROBE_TIMEOUT_MS = 45_000;

/**
 * A non-filled chart dataset is not a render-versus-network sample.
 * Throws before the chart-ready wait so an empty or error rep is excluded.
 */
export async function assertDeferredRenderChartDataFilled(
  screenId: DeferredRenderScreenId,
): Promise<void> {
  const record = await waitForAppScreenTtcRecord(
    deferredRenderProbeId(screenId, DeferredRenderPoint.CHART_DATA_READY),
    { timeoutMs: PROBE_TIMEOUT_MS },
  );
  if (record.contentState !== 'filled') {
    throw new Error(
      `Excluding rep: ${screenId} chart_data_ready outcome is ${record.contentState}`,
    );
  }
}

const DEFERRED_RENDER_POINTS: readonly DeferredRenderPointId[] = [
  DeferredRenderPoint.NAV_START,
  DeferredRenderPoint.FIRST_RENDER,
  DeferredRenderPoint.CHART_DATA_READY,
  DeferredRenderPoint.CHART_READY,
];

/**
 * Reads the four in-app probes for one screen and registers them on the
 * tracker. Excluded from the scenario total so they do not double-count the
 * wall-clock timers.
 */
export async function recordDeferredRenderProbes(options: {
  performanceTracker: PerformanceTracker;
  platform: 'ios' | 'android';
  screenId: DeferredRenderScreenId;
}): Promise<void> {
  for (const point of DEFERRED_RENDER_POINTS) {
    await addAppScreenTtcTimer({
      performanceTracker: options.performanceTracker,
      screenId: deferredRenderProbeId(options.screenId, point),
      platform: options.platform,
      threshold: DEFERRED_RENDER_APP_TTC_THRESHOLD,
      required: true,
      timeoutMs: PROBE_TIMEOUT_MS,
    });
  }
}
