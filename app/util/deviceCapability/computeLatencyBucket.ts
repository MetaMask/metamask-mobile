import {
  LATENCY_GOOD_TO_EXIT,
  LATENCY_HUNG_TO_ENTER,
  LATENCY_MIN_SAMPLES,
  LATENCY_SAMPLE_SIZE,
} from './thresholds';
import type { LatencyBucket, LatencyThresholds } from './types';

interface ComputeLatencyBucketInput {
  previous: LatencyBucket;
  /** Oldest first. Only the newest `LATENCY_SAMPLE_SIZE` are used. */
  samples: readonly number[];
  thresholds: LatencyThresholds;
}

/**
 * Next latency bucket. `SLOW` is entered on two hung samples or a slow median,
 * and left only when the newest three recent samples are all good.
 */
export function computeLatencyBucket({
  previous,
  samples,
  thresholds: { hungMs, slowMs },
}: ComputeLatencyBucketInput): LatencyBucket {
  const recent = samples.slice(-LATENCY_SAMPLE_SIZE);

  if (previous === 'SLOW') {
    const newest = recent.slice(-LATENCY_GOOD_TO_EXIT);
    const released =
      newest.length === LATENCY_GOOD_TO_EXIT &&
      newest.every((durationMs) => durationMs <= slowMs);
    return released ? 'OK' : 'SLOW';
  }

  if (
    recent.filter((durationMs) => durationMs >= hungMs).length >=
    LATENCY_HUNG_TO_ENTER
  ) {
    return 'SLOW';
  }
  if (recent.length < LATENCY_MIN_SAMPLES) {
    return 'UNKNOWN';
  }

  const sorted = [...recent].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const medianMs =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return medianMs > slowMs ? 'SLOW' : 'OK';
}
