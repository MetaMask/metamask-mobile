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

export interface LatencyDebugSnapshot {
  bucket: LatencyBucket;
  hardwareRow: HardwareTier;
  medianMs: number | null;
  hungCount: number;
  sampleCount: number;
  /** NetInfo type, or the cellular generation (`2g`, `5g`) when that is known. */
  transportLabel: string;
}

// Module memory only: samples are never dispatched to Redux or persisted.
let samples: LatencySample[] = [];
let bucket: LatencyBucket = 'unknown';
let hardwareRow: HardwareTier = 'MID';
let thresholds: LatencyThresholds = latencyThresholdsFor(null);
let isTransportNone = false;
let transportLabel = '-';
let isMonitoring = false;
const listeners = new Set<() => void>();

function setBucket(next: LatencyBucket): void {
  if (next === bucket) {
    return;
  }
  bucket = next;
  listeners.forEach((listener) => listener());
}

/** Drops every sample and returns the bucket to `unknown`. */
export function clearLatencySamples(): void {
  samples = [];
  setBucket('unknown');
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
      nowMs: sample.atMs,
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

export function getLatencyDebugSnapshot(
  nowMs: number = Date.now(),
): LatencyDebugSnapshot {
  const { recent, hungCount, medianMs } = summarizeLatencySamples({
    samples,
    nowMs,
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
