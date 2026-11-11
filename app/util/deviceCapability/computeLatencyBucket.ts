import {
  LATENCY_GOOD_TO_EXIT,
  LATENCY_HUNG_TO_ENTER,
  LATENCY_MIN_SAMPLES,
  LATENCY_SAMPLE_SIZE,
  LATENCY_WINDOW_MS,
} from './thresholds';
import type { LatencyBucket, LatencySample, LatencyThresholds } from './types';

interface LatencyWindowInput {
  samples: readonly LatencySample[];
  nowMs: number;
  thresholds: LatencyThresholds;
}

export interface LatencySummary {
  recent: LatencySample[];
  hungCount: number;
  medianMs: number | null;
}

/**
 * Newest `LATENCY_SAMPLE_SIZE` samples inside the last `LATENCY_WINDOW_MS`,
 * with their hung count and median. `samples` must be oldest first.
 */
export function summarizeLatencySamples({
  samples,
  nowMs,
  thresholds,
}: LatencyWindowInput): LatencySummary {
  const recent = samples
    .filter(({ atMs }) => nowMs - atMs <= LATENCY_WINDOW_MS)
    .slice(-LATENCY_SAMPLE_SIZE);
  const hungCount = recent.filter(
    ({ durationMs }) => durationMs >= thresholds.hungMs,
  ).length;

  const sorted = recent
    .map(({ durationMs }) => durationMs)
    .sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  let medianMs: number | null = null;
  if (sorted.length > 0) {
    medianMs =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return { recent, hungCount, medianMs };
}

/**
 * Next latency bucket. `slow` is entered on two hung samples or a slow median,
 * and left only when the newest three recent samples are all good. Ageing out
 * never releases `slow`.
 */
export function computeLatencyBucket({
  previous,
  ...latencyWindow
}: LatencyWindowInput & { previous: LatencyBucket }): LatencyBucket {
  const { recent, hungCount, medianMs } =
    summarizeLatencySamples(latencyWindow);
  const { slowMs } = latencyWindow.thresholds;

  if (previous === 'slow') {
    const newest = recent.slice(-LATENCY_GOOD_TO_EXIT);
    const released =
      newest.length === LATENCY_GOOD_TO_EXIT &&
      newest.every(({ durationMs }) => durationMs <= slowMs);
    return released ? 'ok' : 'slow';
  }

  if (hungCount >= LATENCY_HUNG_TO_ENTER) {
    return 'slow';
  }
  if (recent.length < LATENCY_MIN_SAMPLES) {
    return 'unknown';
  }
  return medianMs !== null && medianMs > slowMs ? 'slow' : 'ok';
}
