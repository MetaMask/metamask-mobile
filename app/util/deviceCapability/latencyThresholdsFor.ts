import { LATENCY_THRESHOLDS } from './thresholds';
import type { HardwareTier, LatencyThresholds } from './types';

/**
 * Latency cutoffs for a hardware tier. Unknown hardware uses the `MID` row.
 */
export function latencyThresholdsFor(
  hardwareTier: HardwareTier | null,
): LatencyThresholds {
  return LATENCY_THRESHOLDS[hardwareTier ?? 'MID'];
}
