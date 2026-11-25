export type HardwareTier = 'LOW' | 'MID' | 'HIGH';

export type NetworkTier = 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI';

export type LatencyBucket = 'UNKNOWN' | 'OK' | 'SLOW';

export interface LatencyThresholds {
  hungMs: number;
  slowMs: number;
}
