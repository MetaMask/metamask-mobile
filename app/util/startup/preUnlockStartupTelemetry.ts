import { Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Performance from '../../core/Performance/Performance';
import StorageWrapper from '../../store/storage-wrapper';
import {
  annotateTraceByRequest,
  endTrace,
  getPerformanceTimestamp,
  getTraceContext,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../trace';

export type PreUnlockMilestoneId =
  | 'M0'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M7';

// DEBUG ONLY (throwaway TestFlight branch): collect the summary in release
// builds and show it in an alert. Remove before any PR.
const DEBUG_COLLECT = true;
const DEBUG_RUNS_KEY = 'PRE_UNLOCK_DEBUG_RUNS';
const DEBUG_ALERT_DELAY_MS = 5000;

const PERSIST_GATHER_TRACE_ID = 'default';
const ENGINE_SUBSCRIPTIONS_TRACE_ID = 'default';
const WALLET_INIT_TRACE_ID = 'default';
const CONTROLLERS_GATE_TRACE_ID = 'default';
const LOGIN_VISIBLE_TRACE_ID = 'default';

let processStartEpochMs: number | undefined;
let walletInitSettledAtM6: boolean | undefined;

interface PersistControllerStats {
  bytes: number;
  parseMs: number;
  hadFile: boolean;
}

type DevPersistRow = PersistControllerStats & { controller: string };

const devPersistRows: DevPersistRow[] = [];
let devMilestones: Record<string, { ms: number; heap_bytes?: number }> = {};
let devInitFunctionMs: Record<string, number> = {};

/** UTF-8 byte length without logging payload contents. */
export function utf8ByteLength(value: string): number {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

export function getPreUnlockProcessStartEpochMs(): number {
  if (Performance.appLaunchTime) {
    return Performance.appLaunchTime;
  }

  if (processStartEpochMs === undefined) {
    processStartEpochMs = getPerformanceTimestamp();
  }

  return processStartEpochMs;
}

export function getPreUnlockEngineParentContext() {
  return getTraceContext({ name: TraceName.EngineInitialization });
}

function elapsedSinceProcessStartMs(): number {
  return Math.max(
    0,
    getPerformanceTimestamp() - getPreUnlockProcessStartEpochMs(),
  );
}

function readUsedJsHeapBytes(): number | undefined {
  const memory = (
    globalThis as { performance?: { memory?: { usedJSHeapSize?: number } } }
  ).performance?.memory;
  const used = memory?.usedJSHeapSize;
  return typeof used === 'number' && Number.isFinite(used) ? used : undefined;
}

/** Dev summary only: time and JS heap at a named point of the startup. */
function markDevPoint(name: string): void {
  if (!DEBUG_COLLECT) {
    return;
  }
  devMilestones[name] = {
    ms: Math.round(elapsedSinceProcessStartMs()),
    heap_bytes: readUsedJsHeapBytes(),
  };
}

/**
 * Records a pre-unlock milestone as duration since process/JS start on UIStartup.
 * M0 is implied by UIStartup / native launch; callers mark M1–M7 at boundary events.
 */
export function markPreUnlockMilestone(milestone: PreUnlockMilestoneId): void {
  const elapsedMs = elapsedSinceProcessStartMs();
  annotateTraceByRequest(
    { name: TraceName.UIStartup },
    {
      [`pre_unlock.milestone.${milestone}_ms`]: elapsedMs,
    },
  );

  markDevPoint(milestone);

  if (milestone === 'M0') {
    setTraceMeasurement(
      { name: TraceName.UIStartup },
      'pre_unlock.process_start_ms',
      elapsedMs,
      'millisecond',
    );
  }
}

export function startPreUnlockPersistGather(): void {
  const parent = getPreUnlockEngineParentContext();
  trace({
    name: TraceName.PreUnlockPersistGather,
    id: PERSIST_GATHER_TRACE_ID,
    op: TraceOperation.PreUnlockPersistGather,
    parentContext: parent ?? undefined,
  });
  markPreUnlockMilestone('M3');
}

export function endPreUnlockPersistGather(): void {
  endTrace({
    name: TraceName.PreUnlockPersistGather,
    id: PERSIST_GATHER_TRACE_ID,
  });
  markDevPoint('persist_gather_end');
  logDevPersistByteReport();
}

export function recordPreUnlockPersistControllerLoad(
  controller: string,
  stats: PersistControllerStats,
): void {
  const parent = getPreUnlockEngineParentContext();
  trace({
    name: TraceName.PreUnlockPersistControllerLoad,
    id: controller,
    op: TraceOperation.PreUnlockPersistControllerLoad,
    parentContext: parent ?? undefined,
    tags: {
      controller,
      bytes: stats.bytes,
      parse_ms: stats.parseMs,
      had_file: stats.hadFile,
    },
  });
  endTrace({
    name: TraceName.PreUnlockPersistControllerLoad,
    id: controller,
    data: {
      bytes: stats.bytes,
      parse_ms: stats.parseMs,
      had_file: stats.hadFile,
    },
  });

  if (DEBUG_COLLECT) {
    devPersistRows.push({ controller, ...stats });
  }
}

export function tracePreUnlockInitFunction<R>(
  initKey: string,
  run: () => R,
): R {
  // Dev summary times the init itself, without the span around it.
  const timedRun = DEBUG_COLLECT
    ? () => {
        const startMs = performance.now();
        try {
          return run();
        } finally {
          devInitFunctionMs[initKey] = performance.now() - startMs;
        }
      }
    : run;

  const parent = getPreUnlockEngineParentContext();
  if (!parent) {
    return timedRun();
  }

  return trace(
    {
      name: TraceName.PreUnlockEngineInitFunction,
      id: initKey,
      op: TraceOperation.PreUnlockEngineInitFunction,
      parentContext: parent,
      tags: { init_function: initKey },
    },
    timedRun,
  );
}

export function startPreUnlockWalletInit(): void {
  markDevPoint('wallet_constructed');
  const parent = getPreUnlockEngineParentContext();
  trace({
    name: TraceName.PreUnlockWalletInit,
    id: WALLET_INIT_TRACE_ID,
    op: TraceOperation.PreUnlockWalletInit,
    parentContext: parent ?? undefined,
  });
}

export function completePreUnlockWalletInit(settledCount: number): void {
  endTrace({
    name: TraceName.PreUnlockWalletInit,
    id: WALLET_INIT_TRACE_ID,
    data: { settled: settledCount },
  });
}

export function tracePreUnlockEngineSubscriptions<R>(run: () => R): R {
  const parent = getPreUnlockEngineParentContext();
  if (!parent) {
    return run();
  }

  return trace(
    {
      name: TraceName.PreUnlockEngineSubscriptions,
      id: ENGINE_SUBSCRIPTIONS_TRACE_ID,
      op: TraceOperation.PreUnlockEngineSubscriptions,
      parentContext: parent,
    },
    run,
  );
}

export function markPreUnlockEngineConstructorEnd(): void {
  markPreUnlockMilestone('M4');
}

export function markPreUnlockInitializeControllersEnd(): void {
  markPreUnlockMilestone('M5');
}

export function isPreUnlockWalletInitStillPending(): boolean {
  return (
    getTraceContext({
      name: TraceName.PreUnlockWalletInit,
      id: WALLET_INIT_TRACE_ID,
    }) !== undefined
  );
}

export function recordPreUnlockControllersGateOpen(): void {
  walletInitSettledAtM6 = !isPreUnlockWalletInitStillPending();

  const elapsedMs = elapsedSinceProcessStartMs();
  const heapBytes = readUsedJsHeapBytes();

  trace({
    name: TraceName.PreUnlockControllersGate,
    id: CONTROLLERS_GATE_TRACE_ID,
    op: TraceOperation.PreUnlockControllersGate,
    parentContext: getUIStartupSpanForGate(),
    tags: {
      wallet_init_settled_at_gate: walletInitSettledAtM6,
      ...(heapBytes !== undefined ? { heap_bytes_at_gate: heapBytes } : {}),
    },
  });

  setTraceMeasurement(
    { name: TraceName.PreUnlockControllersGate, id: CONTROLLERS_GATE_TRACE_ID },
    'pre_unlock.controllers_gate_ms',
    elapsedMs,
    'millisecond',
  );

  if (heapBytes !== undefined) {
    setTraceMeasurement(
      {
        name: TraceName.PreUnlockControllersGate,
        id: CONTROLLERS_GATE_TRACE_ID,
      },
      'pre_unlock.heap_bytes_at_gate',
      heapBytes,
      'byte',
    );
  }

  annotateTraceByRequest(
    { name: TraceName.UIStartup },
    {
      'pre_unlock.controllers_gate_ms': elapsedMs,
      ...(heapBytes !== undefined
        ? { 'pre_unlock.heap_bytes_at_gate': heapBytes }
        : {}),
      'pre_unlock.wallet_init_settled_at_gate': walletInitSettledAtM6,
    },
  );

  markPreUnlockMilestone('M6');
  endTrace({
    name: TraceName.PreUnlockControllersGate,
    id: CONTROLLERS_GATE_TRACE_ID,
  });

  if (DEBUG_COLLECT) {
    // After the gate, so the alert itself is outside M0–M7.
    setTimeout(() => {
      showDebugSummary().catch(() => undefined);
    }, DEBUG_ALERT_DELAY_MS);
  }
}

function getUIStartupSpanForGate() {
  return getTraceContext({ name: TraceName.UIStartup });
}

export function recordPreUnlockLoginVisible(): void {
  const elapsedMs = elapsedSinceProcessStartMs();

  trace({
    name: TraceName.PreUnlockLoginVisible,
    id: LOGIN_VISIBLE_TRACE_ID,
    op: TraceOperation.PreUnlockLoginVisible,
    parentContext: getUIStartupSpanForGate() ?? undefined,
  });

  setTraceMeasurement(
    { name: TraceName.PreUnlockLoginVisible, id: LOGIN_VISIBLE_TRACE_ID },
    'pre_unlock.login_visible_ms',
    elapsedMs,
    'millisecond',
  );

  annotateTraceByRequest(
    { name: TraceName.UIStartup },
    { 'pre_unlock.login_visible_ms': elapsedMs },
  );

  markPreUnlockMilestone('M7');
  endTrace({
    name: TraceName.PreUnlockLoginVisible,
    id: LOGIN_VISIBLE_TRACE_ID,
  });
  logDevSummary();
}

function buildSummary() {
  const oneDecimal = (value: number): number => Math.round(value * 10) / 10;
  const initRows = Object.entries(devInitFunctionMs).sort(
    ([, left], [, right]) => right - left,
  );
  const sum = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0);

  return {
    milestones: devMilestones,
    wallet_init_settled_at_gate: walletInitSettledAtM6,
    persist: {
      files: devPersistRows.filter((row) => row.hadFile).length,
      bytes: sum(devPersistRows.map((row) => row.bytes)),
      parse_ms: oneDecimal(sum(devPersistRows.map((row) => row.parseMs))),
      top_bytes: [...devPersistRows]
        .sort((left, right) => right.bytes - left.bytes)
        .slice(0, 10)
        .map((row) => [row.controller, row.bytes, oneDecimal(row.parseMs)]),
    },
    init_functions: {
      count: initRows.length,
      total_ms: oneDecimal(sum(initRows.map(([, ms]) => ms))),
      top: initRows.slice(0, 20).map(([key, ms]) => [key, oneDecimal(ms)]),
    },
  };
}

/** Milestones and init durations only reach Sentry otherwise. */
function logDevSummary(): void {
  if (!__DEV__) {
    return;
  }

  // eslint-disable-next-line no-console
  console.info(
    '[pre-unlock telemetry] summary ' + JSON.stringify(buildSummary()),
  );
}

/** DEBUG ONLY: keeps the last 10 cold starts and offers them for copy. */
async function showDebugSummary(): Promise<void> {
  const summary = buildSummary();
  const stored = await StorageWrapper.getItem(DEBUG_RUNS_KEY);
  const runs = [
    ...(stored ? JSON.parse(stored) : []),
    { at: new Date().toISOString(), ...summary },
  ].slice(-10);
  await StorageWrapper.setItem(DEBUG_RUNS_KEY, JSON.stringify(runs));

  const gate = summary.milestones.M6;
  const heapMb = gate?.heap_bytes
    ? Math.round(gate.heap_bytes / 1e6)
    : undefined;
  Alert.alert(
    `Pre-unlock telemetry (${runs.length} runs stored)`,
    `gate ${gate?.ms} ms, login ${summary.milestones.M7?.ms ?? 'n/a'} ms, heap at gate ${heapMb ?? 'n/a'} MB`,
    [
      {
        text: 'Copy all runs',
        onPress: () => Clipboard.setString(JSON.stringify(runs)),
      },
      {
        text: 'Clear runs',
        style: 'destructive',
        onPress: () => {
          StorageWrapper.removeItem(DEBUG_RUNS_KEY).catch(() => undefined);
        },
      },
      { text: 'Close', style: 'cancel' },
    ],
  );
}

function logDevPersistByteReport(): void {
  if (!__DEV__ || devPersistRows.length === 0) {
    return;
  }

  const topByBytes = [...devPersistRows]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 10);
  const topByParseMs = [...devPersistRows]
    .sort((left, right) => right.parseMs - left.parseMs)
    .slice(0, 10);

  const formatRow = (row: DevPersistRow): string =>
    `${row.controller} bytes=${row.bytes} parse_ms=${row.parseMs.toFixed(1)} had_file=${row.hadFile}`;

  // eslint-disable-next-line no-console
  console.info(
    '[pre-unlock telemetry] top persist by bytes:\n' +
      topByBytes.map(formatRow).join('\n'),
  );
  // eslint-disable-next-line no-console
  console.info(
    '[pre-unlock telemetry] top persist by parse_ms:\n' +
      topByParseMs.map(formatRow).join('\n'),
  );
}

/** Test helper */
export function resetPreUnlockStartupTelemetryForTests(): void {
  processStartEpochMs = undefined;
  walletInitSettledAtM6 = undefined;
  devPersistRows.length = 0;
  devMilestones = {};
  devInitFunctionMs = {};
}

/** @internal for unit tests */
export function getPreUnlockTelemetryTestState(): {
  walletInitSettledAtM6: boolean | undefined;
  devPersistRows: readonly DevPersistRow[];
} {
  return {
    walletInitSettledAtM6,
    devPersistRows: [...devPersistRows],
  };
}
