export type HardwareTier = 'LOW' | 'MID' | 'HIGH';

export type NetworkTier = 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI';

export type LatencyBucket = 'unknown' | 'ok' | 'slow';

export interface LatencySample {
  atMs: number;
  durationMs: number;
}

export interface LatencyThresholds {
  hungMs: number;
  slowMs: number;
}
