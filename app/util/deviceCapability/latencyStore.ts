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
let isTransportNone = false;
let isMonitoring = false;
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
  setBucket('UNKNOWN');
}

/** The only write path from the `global.fetch` wrapper. */
export function recordFetchSample(sample: LatencySample): void {
  if (isTransportNone) {
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

export function getLatencyThresholds(): LatencyThresholds {
  return thresholds;
}

export function isLatencyTransportNone(): boolean {
  return isTransportNone;
}

/**
 * Selects the thresholds row and starts the reset listeners: AppState
 * `background` to `active`, and NetInfo `type` / `cellularGeneration` /
 * `isInternetReachable` changes. Idempotent.
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
    const key = JSON.stringify(input);
    const changed =
      previousNetInfoKey !== undefined && key !== previousNetInfoKey;
    previousNetInfoKey = key;
    isTransportNone = computeNetworkTier(input) === 'NONE';
    if (changed || isTransportNone) {
      clearLatencySamples();
    }
  });

  let previousAppState: AppStateStatus = AppState.currentState;
  AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive') {
      return;
    }
    if (previousAppState === 'background' && next === 'active') {
      clearLatencySamples();
    }
    previousAppState = next;
  });
}
