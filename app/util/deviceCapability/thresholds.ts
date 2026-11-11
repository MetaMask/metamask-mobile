import type { HardwareTier, LatencyThresholds } from './types';

export const BYTES_PER_GIB = 1024 ** 3;

// iOS and iPadOS. Comparisons are `<=` because reported RAM is close to nominal.
export const IOS_HARDWARE_THRESHOLDS = {
  LOW_MAX_BYTES: 2 * BYTES_PER_GIB, // ≤ 2 GiB = LOW
  MID_MAX_BYTES: 4 * BYTES_PER_GIB, // ≤ 4 GiB = MID
  // > 4 GiB = HIGH
} as const;

// Android. Comparisons are strict `<` because reported RAM is below nominal.
export const ANDROID_HARDWARE_THRESHOLDS = {
  LOW_BELOW_BYTES: 3 * BYTES_PER_GIB, // < 3 GiB = LOW
  MID_BELOW_BYTES: 5 * BYTES_PER_GIB, // < 5 GiB = MID
  // ≥ 5 GiB = HIGH
} as const;

// JS-measured fetch duration includes JS-thread wait, so each hardware tier
// gets its own cutoffs: `hungMs` near the well-connected p99, `slowMs` near p90
// (production `http.client` spans, 90 days to 2026-11-10).
// 2500 ms is the HIGH median only. MID is 5500 ms. LOW is 12500 ms.
// There is no single ~3 s cutoff.
export const LATENCY_THRESHOLDS: Record<HardwareTier, LatencyThresholds> = {
  HIGH: { hungMs: 8000, slowMs: 2500 },
  MID: { hungMs: 15000, slowMs: 5500 },
  LOW: { hungMs: 30000, slowMs: 12500 },
};

export const LATENCY_SAMPLE_SIZE = 5;
export const LATENCY_MIN_SAMPLES = 3;
export const LATENCY_HUNG_TO_ENTER = 2;
export const LATENCY_GOOD_TO_EXIT = 3;
// An `AbortError` shorter than this is a caller cancel, not a hung link.
export const LATENCY_ABORT_MIN_MS = 8000;
