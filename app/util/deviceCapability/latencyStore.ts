import { AppState, type AppStateStatus } from 'react-native';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';
import {
  computeLatencyBucket,
  summarizeLatencySamples,
} from './computeLatencyBucket';
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
let hardwareRow: HardwareTier = 'MID';
let thresholds: LatencyThresholds = latencyThresholdsFor(null);
let isTransportNone = false;
let transportLabel = '-';
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

export interface LatencyDebugSnapshot {
  bucket: LatencyBucket;
  hardwareRow: HardwareTier;
  medianMs: number | null;
  hungCount: number;
  sampleCount: number;
  /** NetInfo type, or the cellular generation (`2g`, `5g`) when that is known. */
  transportLabel: string;
}

/** Debug overlay only. Never read by product code. */
export function getLatencyDebugSnapshot(): LatencyDebugSnapshot {
  const { recent, hungCount, medianMs } = summarizeLatencySamples({
    samples,
    thresholds,
  });
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
 * Selects the thresholds row and starts the reset listeners: AppState
 * `background` to `active`, and NetInfo `type` / `cellularGeneration` /
 * `isInternetReachable` changes. Idempotent.
 */
export function startLatencyMonitoring(
  hardwareTier: HardwareTier | null,
): void {
  hardwareRow = hardwareTier ?? 'MID';
  thresholds = latencyThresholdsFor(hardwareTier);
  if (isMonitoring) {
    return;
  }
  isMonitoring = true;

  let previousNetInfoKey: string | undefined;
  addNetInfoEventListener((state: NetInfoState) => {
    transportLabel =
      state.type === 'cellular'
        ? (readCellularGeneration(state.details) ?? 'cellular')
        : (state.type ?? 'unknown');
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
