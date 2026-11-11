import {
  LATENCY_GOOD_TO_EXIT,
  LATENCY_HUNG_TO_ENTER,
  LATENCY_MIN_SAMPLES,
  LATENCY_SAMPLE_SIZE,
} from './thresholds';
import type { LatencyBucket, LatencySample, LatencyThresholds } from './types';

interface LatencySamplesInput {
  samples: readonly LatencySample[];
  thresholds: LatencyThresholds;
}

export interface LatencySummary {
  recent: LatencySample[];
  hungCount: number;
  medianMs: number | null;
}

/**
 * Newest `LATENCY_SAMPLE_SIZE` samples, with their hung count and median.
 * `samples` must be oldest first. Age does not drop a sample.
 */
export function summarizeLatencySamples({
  samples,
  thresholds,
}: LatencySamplesInput): LatencySummary {
  const recent = samples.slice(-LATENCY_SAMPLE_SIZE);
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
 * Next latency bucket. `SLOW` is entered on two hung samples or a slow median,
 * and left only when the newest three recent samples are all good.
 */
export function computeLatencyBucket({
  previous,
  ...latencySamples
}: LatencySamplesInput & { previous: LatencyBucket }): LatencyBucket {
  const { recent, hungCount, medianMs } =
    summarizeLatencySamples(latencySamples);
  const { slowMs } = latencySamples.thresholds;

  if (previous === 'SLOW') {
    const newest = recent.slice(-LATENCY_GOOD_TO_EXIT);
    const released =
      newest.length === LATENCY_GOOD_TO_EXIT &&
      newest.every(({ durationMs }) => durationMs <= slowMs);
    return released ? 'OK' : 'SLOW';
  }

  if (hungCount >= LATENCY_HUNG_TO_ENTER) {
    return 'SLOW';
  }
  if (recent.length < LATENCY_MIN_SAMPLES) {
    return 'UNKNOWN';
  }
  return medianMs !== null && medianMs > slowMs ? 'SLOW' : 'OK';
}
