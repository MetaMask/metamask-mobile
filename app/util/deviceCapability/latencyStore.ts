import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import { computeLatencyBucket } from './computeLatencyBucket';
import {
  computeNetworkTier,
  readCellularGeneration,
} from './computeNetworkTier';
import { latencyThresholdsFor } from './latencyThresholdsFor';
import { LATENCY_SAMPLE_SIZE } from './thresholds';
import type {
  HardwareTier,
  LatencyBucket,
  LatencySample,
  LatencyThresholds,
} from './types';

// Module memory only: samples are never dispatched to Redux or persisted.
let samples: LatencySample[] = [];
let bucket: LatencyBucket = 'UNKNOWN';
let thresholds: LatencyThresholds = latencyThresholdsFor(null);
// Starts true: until the first NetInfo event the transport is unknown, so
// cold-start samples (recorded before any NetInfo callback) are dropped.
let isTransportNone = true;
let isMonitoring = false;
// Bumped on every clear. A fetch keeps the value from before its await.
let sampleEpoch = 0;
const listeners = new Set<() => void>();

function setBucket(next: LatencyBucket): void {
  if (next === bucket) {
    return;
  }
  bucket = next;
  listeners.forEach((listener) => listener());
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
  sample: LatencySample,
  epochAtStart: number,
): void {
  if (isTransportNone || epochAtStart !== sampleEpoch) {
    return;
  }
  samples = [...samples, sample].slice(-LATENCY_SAMPLE_SIZE);
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

/** True while the NetInfo transport tier is `NONE`. */
export function isLatencyTransportNone(): boolean {
  return isTransportNone;
}

/**
 * Selects the thresholds row and starts the reset listeners: AppState
 * `background` to `active` (in-flight samples are also dropped on
 * `inactive`), and NetInfo transport changes (`type` /
 * `cellularGeneration`). A reachability-only `null` ↔ `true` flip does not
 * reset, but leaving the `NONE` tier (reconnect) does, so in-flight
 * fetches that span the offline gap are dropped. Idempotent.
 */
export function startLatencyMonitoring(
  hardwareTier: HardwareTier | null,
): void {
  thresholds = latencyThresholdsFor(hardwareTier);
  if (isMonitoring) {
    return;
  }
  isMonitoring = true;

  let previousNetInfoKey: string | undefined;
  addNetInfoEventListener((state: NetInfoState) => {
    const input = {
      type: state.type,
      cellularGeneration: readCellularGeneration(state.details),
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

  let previousAppState: AppStateStatus = AppState.currentState;
  AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive') {
      // Drop in-flight samples that will include JS pause time, but keep
      // already-recorded samples so a Control Center visit does not reset the bucket.
      sampleEpoch += 1;
      return;
    }
    if (previousAppState === 'background' && next === 'active') {
      clearLatencySamples();
    }
    previousAppState = next;
  });
}
