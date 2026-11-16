import { AppState } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import Logger from '../Logger';
import { ensureError } from '../errorUtils';
import { computeLatencyBucket } from './computeLatencyBucket';
import {
  computeNetworkTier,
  readCellularGeneration,
} from './computeNetworkTier';
import { LATENCY_SAMPLE_SIZE, LATENCY_THRESHOLDS } from './thresholds';
import type { HardwareTier, LatencyBucket, LatencyThresholds } from './types';

// Module memory only: samples are never dispatched to Redux or persisted.
let samples: number[] = [];
let bucket: LatencyBucket = 'UNKNOWN';
let thresholds: LatencyThresholds = LATENCY_THRESHOLDS.MID;
// TestFlight overlay only. The bucket never reads these.
let hardwareRow: HardwareTier = 'MID';
let transportLabel = '-';
// Starts true: until the first NetInfo event the transport is unknown, so
// cold-start samples (recorded before any NetInfo callback) are dropped.
let isTransportNone = true;
// Android goes active → background with no `inactive`, so background itself
// must refuse samples (OS-throttled polls would otherwise look hung).
let isBackground = AppState.currentState === 'background';
let isMonitoring = false;
// Bumped on every clear. A fetch keeps the value from before its await.
let sampleEpoch = 0;
const listeners = new Set<() => void>();

function setBucket(next: LatencyBucket): void {
  if (next === bucket) {
    return;
  }
  bucket = next;
  listeners.forEach((listener) => {
    // A throwing subscriber must not reject the caller's `fetch`.
    try {
      listener();
    } catch (error) {
      Logger.error(ensureError(error), 'latencyStore: listener threw');
    }
  });
}

/** Drops every sample and returns the bucket to `UNKNOWN`. */
export function clearLatencySamples(): void {
  samples = [];
  sampleEpoch += 1;
  setBucket('UNKNOWN');
}

/** Epoch captured by `global.fetch` before the request is awaited. */
export function getLatencySampleEpoch(): number {
  return sampleEpoch;
}

/**
 * The only write path from the `global.fetch` wrapper.
 * `epochAtStart` must be the epoch from before the await; a clear in between drops the sample.
 */
export function recordFetchSample(
  durationMs: number,
  epochAtStart: number,
): void {
  if (isBackground || isTransportNone || epochAtStart !== sampleEpoch) {
    return;
  }
  samples = [...samples, durationMs].slice(-LATENCY_SAMPLE_SIZE);
  setBucket(
    computeLatencyBucket({
      previous: bucket,
      samples,
      thresholds,
    }),
  );
}

/** Subscribes to bucket changes. Returns the unsubscribe function. */
export function subscribeLatency(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `useSyncExternalStore` snapshot. Changes only when the bucket changes. */
export function getLatencySnapshot(): LatencyBucket {
  return bucket;
}

/** Hardware-row cutoffs selected by `startLatencyMonitoring`. */
export function getLatencyThresholds(): LatencyThresholds {
  return thresholds;
}

export interface LatencyDebugSnapshot {
  bucket: LatencyBucket;
  hardwareRow: HardwareTier;
  medianMs: number | null;
  hungCount: number;
  sampleCount: number;
  /** NetInfo type, or the cellular generation (`2g`, `5g`) when that is known. */
  transportLabel: string;
}

/** TestFlight overlay. Reads the same samples the bucket uses. */
export function getLatencyDebugSnapshot(): LatencyDebugSnapshot {
  const recent = samples.slice(-LATENCY_SAMPLE_SIZE);
  const hungCount = recent.filter(
    (durationMs) => durationMs >= thresholds.hungMs,
  ).length;
  let medianMs: number | null = null;
  if (recent.length > 0) {
    const sorted = [...recent].sort((left, right) => left - right);
    const mid = sorted.length >> 1;
    medianMs =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return {
    bucket,
    hardwareRow,
    medianMs,
    hungCount,
    sampleCount: recent.length,
    transportLabel,
  };
}

/**
 * Selects the thresholds row and starts the reset listeners. `inactive`
 * drops in-flight samples only. `background` clears samples and blocks new
 * ones until `active`. NetInfo transport changes (`type` /
 * `cellularGeneration`) also clear. A reachability-only `null` ↔ `true`
 * flip does not reset, but leaving the `NONE` tier (reconnect) does, so
 * in-flight fetches that span the offline gap are dropped. Idempotent.
 */
export function startLatencyMonitoring(
  hardwareTier: HardwareTier | null,
): void {
  hardwareRow = hardwareTier ?? 'MID';
  const nextThresholds = LATENCY_THRESHOLDS[hardwareTier ?? 'MID'];
  if (nextThresholds !== thresholds) {
    // Samples were bucketed against the old row, and in-flight ones were
    // classified with it, so start over.
    thresholds = nextThresholds;
    clearLatencySamples();
  }
  if (isMonitoring) {
    return;
  }
  isMonitoring = true;

  let previousNetInfoKey: string | undefined;
  addNetInfoEventListener((state: NetInfoState) => {
    const cellularGeneration = readCellularGeneration(state.details);
    transportLabel =
      state.type === 'cellular'
        ? (cellularGeneration ?? 'cellular')
        : (state.type ?? 'unknown');
    const input = {
      type: state.type,
      cellularGeneration,
      isInternetReachable: state.isInternetReachable,
    };
    // The reset key is transport identity only. Raw `isInternetReachable`
    // stays out: a `null` ↔ `true` reachability flip on the same transport
    // must not wipe samples. A flip to `false` still clears via
    // `isTransportNone`, because the tier becomes `NONE`.
    const key = JSON.stringify({
      type: input.type,
      cellularGeneration: input.cellularGeneration,
    });
    const changed =
      previousNetInfoKey !== undefined && key !== previousNetInfoKey;
    previousNetInfoKey = key;
    const wasTransportNone = isTransportNone;
    isTransportNone = computeNetworkTier(input) === 'NONE';
    // `wasTransportNone` covers leaving NONE without a transport key change
    // (reachability false → true on the same transport): in-flight fetches
    // span the offline gap, so their elapsed time is not a latency signal.
    if (changed || isTransportNone || wasTransportNone) {
      clearLatencySamples();
    }
  });

  AppState.addEventListener('change', (next) => {
    if (next === 'inactive') {
      // Drop in-flight samples that will include JS pause time, but keep
      // already-recorded samples so a Control Center visit does not reset the bucket.
      sampleEpoch += 1;
      return;
    }
    if (next === 'background') {
      if (isBackground) {
        return;
      }
      isBackground = true;
      clearLatencySamples();
      return;
    }
    // Android goes background → active with no `inactive`, so drop fetches that started while frozen.
    if (isBackground) {
      sampleEpoch += 1;
    }
    isBackground = false;
  });
}
