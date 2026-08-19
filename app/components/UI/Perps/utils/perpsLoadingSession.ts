import { v4 as uuidv4 } from 'uuid';
import performance from 'react-native-performance';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  annotateTraceByRequest,
  endTrace,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { TERMINAL_GLOBAL_SNAPSHOT_DATA_SOURCE } from '../constants/terminalApi';

export const PERPS_BOOTSTRAP_STAGE = 'perps_bootstrap_start';
export const PERPS_VALUES_READY_STAGE = 'values_ready';
export const PERPS_LOADING_SESSION_TIMEOUT_MS = 90_000;

export type PerpsLoadingStream =
  | 'markets'
  | 'positions'
  | 'orders'
  | 'account'
  | 'prices';
export type PerpsLoadingSource =
  | 'memory_cache'
  | 'disk_cache'
  | 'provider_snapshot'
  | 'terminal_global_snapshot_v2'
  | 'provider'
  | 'fresh_socket';
export type PerpsSessionMarketSource =
  | 'terminal_v2'
  | 'provider'
  | 'memory_cache'
  | 'disk_cache'
  | 'unknown';
export type PerpsSessionAccountSource =
  | 'provider_snapshot'
  | 'memory_cache'
  | 'disk_cache'
  | 'fresh_socket'
  | 'unknown';
export type PerpsLoadingLifecycle =
  | 'cold_no_cache'
  | 'cold_disk_cache'
  | 'navigate_return'
  | 'background_short'
  | 'background_reconnect'
  | 'account_switch'
  | 'network_switch';
export type PerpsLoadingSurface = 'homepage';
interface StartPerpsLoadingSessionOptions {
  lifecycle?: PerpsLoadingLifecycle;
  surface?: PerpsLoadingSurface;
  restart?: boolean;
}
export interface PerpsLoadingSessionContext {
  id: string;
  marketSource: PerpsSessionMarketSource;
  accountSource: PerpsSessionAccountSource;
  lifecycle: PerpsLoadingLifecycle;
}

export function resolvePerpsLoadingLifecycle(
  context: 'cold_process' | 'warm' | 'background_resume',
): PerpsLoadingLifecycle {
  if (context === 'warm') {
    return 'navigate_return';
  }
  if (context === 'background_resume') {
    return 'background_short';
  }
  return 'cold_no_cache';
}

const CACHE_SOURCES: ReadonlySet<PerpsLoadingSource> = new Set([
  'memory_cache',
  'disk_cache',
  'provider_snapshot',
]);
const MILESTONE_MEASUREMENTS = {
  markets_ready: 'markets_ready_ms',
  account_cache_ready: 'account_cache_ready_ms',
  positions_live: 'positions_live_ms',
  orders_live: 'orders_live_ms',
  account_live: 'account_live_ms',
  prices_live: 'prices_live_ms',
} as const;
const PROCESS_TO_BOOTSTRAP_START_MEASUREMENT =
  'process_to_perps_bootstrap_start_ms';
const PROCESS_TO_CONTROLLER_CONSTRUCTED_MEASUREMENT =
  'process_to_perps_controller_constructed_ms';

type Milestone = keyof typeof MILESTONE_MEASUREMENTS;
type CacheStream = 'positions' | 'orders' | 'account';

let activeSessionId: string | null = null;
let activeLifecycle: PerpsLoadingLifecycle = 'cold_no_cache';
let sessionStartedAtMs: number | null = null;
let controllerConstructedAtMs: number | null = null;
const recordedMilestones = new Set<Milestone>();
const cacheObservedBySource = new Map<PerpsLoadingSource, Set<CacheStream>>();
let marketsReadySource: PerpsLoadingSource | null = null;
let accountCacheSource: PerpsLoadingSource | null = null;
let pendingFinishData: Record<string, string | number | boolean> | null = null;
let sessionTimeout: ReturnType<typeof setTimeout> | null = null;
let preSessionEvents: {
  stream: PerpsLoadingStream;
  source: PerpsLoadingSource;
  itemCount: number;
  detail: Record<string, number>;
  recordedAtMs: number;
}[] = [];
let preSessionFinishData: Record<string, string | number | boolean> | null =
  null;
let preSessionBufferArmed = true;

export function preparePerpsLoadingSession(): void {
  if (activeSessionId) {
    return;
  }
  preSessionEvents = [];
  preSessionFinishData = null;
  preSessionBufferArmed = true;
}

export function startPerpsLoadingSession(
  options: StartPerpsLoadingSessionOptions = {},
): string {
  if (activeSessionId && !options.restart) {
    return activeSessionId;
  }

  if (activeSessionId) {
    endActiveLoadingSession({
      success: false,
      content_state: 'error',
      failure_stage: 'session_restarted',
      required_live_streams_complete: false,
    });
  }

  const sessionId = uuidv4();
  activeSessionId = sessionId;
  activeLifecycle = options.lifecycle ?? 'cold_no_cache';
  const now = performance.now();
  sessionStartedAtMs = now;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  pendingFinishData = null;
  DevLogger.log(
    `[PerpsLoadProof] ${JSON.stringify({
      stage: PERPS_BOOTSTRAP_STAGE,
      session_id: sessionId,
      monotonic_ms: Number(now.toFixed(3)),
    })}`,
  );
  trace({
    name: TraceName.PerpsLoadingSession,
    id: sessionId,
    op: TraceOperation.PerpsLoading,
    data: {
      lifecycle: activeLifecycle,
      surface: options.surface ?? 'homepage',
    },
  });
  setTraceMeasurement(
    { name: TraceName.PerpsLoadingSession, id: sessionId },
    PROCESS_TO_BOOTSTRAP_START_MEASUREMENT,
    now,
    'millisecond',
  );
  if (controllerConstructedAtMs !== null) {
    setTraceMeasurement(
      { name: TraceName.PerpsLoadingSession, id: sessionId },
      PROCESS_TO_CONTROLLER_CONSTRUCTED_MEASUREMENT,
      controllerConstructedAtMs,
      'millisecond',
    );
  }

  sessionTimeout = setTimeout(() => {
    const deadlineMs =
      (sessionStartedAtMs ?? performance.now()) +
      PERPS_LOADING_SESSION_TIMEOUT_MS;
    const lateByMs = Math.max(0, performance.now() - deadlineMs);
    endActiveLoadingSession(
      {
        success: false,
        content_state: 'error',
        failure_stage: 'loading_session_timeout',
        required_live_streams_complete: false,
      },
      Date.now() - lateByMs,
    );
  }, PERPS_LOADING_SESSION_TIMEOUT_MS);

  const bufferedEvents = preSessionEvents;
  preSessionEvents = [];
  preSessionBufferArmed = false;
  bufferedEvents.forEach((event) => {
    recordValuesReady(event);
  });
  if (preSessionFinishData) {
    const finishData = preSessionFinishData;
    preSessionFinishData = null;
    finishPerpsLoadingSession(finishData);
  }
  return sessionId;
}

export function recordPerpsControllerConstructedAt(monotonicMs: number): void {
  if (!Number.isFinite(monotonicMs) || monotonicMs < 0) {
    return;
  }
  controllerConstructedAtMs = monotonicMs;
  if (!activeSessionId) {
    return;
  }
  setTraceMeasurement(
    { name: TraceName.PerpsLoadingSession, id: activeSessionId },
    PROCESS_TO_CONTROLLER_CONSTRUCTED_MEASUREMENT,
    monotonicMs,
    'millisecond',
  );
}

export function recordPerpsLoadingSessionValuesReady(
  stream: PerpsLoadingStream,
  source: PerpsLoadingSource,
  itemCount: number,
  detail: Record<string, number> = {},
): void {
  const recordedAtMs = performance.now();
  if (!activeSessionId || sessionStartedAtMs === null) {
    if (!preSessionBufferArmed) {
      return;
    }
    preSessionEvents.push({
      stream,
      source,
      itemCount,
      detail,
      recordedAtMs,
    });
    preSessionEvents = preSessionEvents.slice(-20);
    return;
  }

  recordValuesReady({ stream, source, itemCount, detail, recordedAtMs });
}

function recordValuesReady({
  stream,
  source,
  itemCount,
  detail,
  recordedAtMs,
}: {
  stream: PerpsLoadingStream;
  source: PerpsLoadingSource;
  itemCount: number;
  detail: Record<string, number>;
  recordedAtMs: number;
}): void {
  if (!activeSessionId || sessionStartedAtMs === null) {
    return;
  }

  let milestone: Milestone | null = null;
  if (stream === 'markets') {
    milestone = itemCount > 0 ? 'markets_ready' : null;
  } else if (source === 'fresh_socket') {
    if (stream === 'positions' || stream === 'orders') {
      milestone = `${stream}_live`;
    } else if ((stream === 'account' || stream === 'prices') && itemCount > 0) {
      milestone = `${stream}_live`;
    }
  } else if (
    CACHE_SOURCES.has(source) &&
    (stream === 'positions' || stream === 'orders' || stream === 'account') &&
    (stream !== 'account' || itemCount > 0)
  ) {
    const observed =
      cacheObservedBySource.get(source) ?? new Set<CacheStream>();
    observed.add(stream);
    cacheObservedBySource.set(source, observed);
    milestone = observed.size === 3 ? 'account_cache_ready' : null;
  }
  if (!milestone || recordedMilestones.has(milestone)) {
    return;
  }
  recordedMilestones.add(milestone);
  if (milestone === 'markets_ready') {
    marketsReadySource = source;
  }
  if (milestone === 'account_cache_ready') {
    accountCacheSource = source;
  }

  const elapsedMs = Math.max(0, recordedAtMs - sessionStartedAtMs);
  setTraceMeasurement(
    { name: TraceName.PerpsLoadingSession, id: activeSessionId },
    MILESTONE_MEASUREMENTS[milestone],
    elapsedMs,
    'millisecond',
  );
  DevLogger.log(
    `[PerpsLoadProof] ${JSON.stringify({
      stage: PERPS_VALUES_READY_STAGE,
      stream,
      source,
      item_count: itemCount,
      elapsed_ms: Number(elapsedMs.toFixed(3)),
      monotonic_ms: Number(recordedAtMs.toFixed(3)),
      ...detail,
    })}`,
  );

  tryFinishPendingSession();
}

export function resolvePerpsMarketSource(
  markets: { dataSource?: string }[],
  sessionMarketSource?: PerpsSessionMarketSource | null,
): PerpsSessionMarketSource {
  if (
    markets.length > 0 &&
    markets.every(
      (market) => market.dataSource === TERMINAL_GLOBAL_SNAPSHOT_DATA_SOURCE,
    )
  ) {
    return 'terminal_v2';
  }
  return sessionMarketSource ?? 'unknown';
}

function recordedMarketSource(): PerpsSessionMarketSource {
  if (marketsReadySource === 'terminal_global_snapshot_v2') {
    return 'terminal_v2';
  }
  if (
    marketsReadySource === 'provider' ||
    marketsReadySource === 'memory_cache' ||
    marketsReadySource === 'disk_cache'
  ) {
    return marketsReadySource;
  }
  return 'unknown';
}

function recordedAccountSource(): PerpsSessionAccountSource {
  if (
    accountCacheSource === 'memory_cache' ||
    accountCacheSource === 'disk_cache' ||
    accountCacheSource === 'provider_snapshot'
  ) {
    return accountCacheSource;
  }
  if (recordedMilestones.has('account_live')) {
    return 'fresh_socket';
  }
  return 'unknown';
}

export function getActivePerpsLoadingSessionContext(): PerpsLoadingSessionContext | null {
  if (!activeSessionId) {
    return null;
  }
  return {
    id: activeSessionId,
    marketSource: recordedMarketSource(),
    accountSource: recordedAccountSource(),
    lifecycle: activeLifecycle,
  };
}

export function setPerpsLoadingSessionLifecycle(
  lifecycle: PerpsLoadingLifecycle,
): void {
  if (!activeSessionId || activeLifecycle === lifecycle) {
    return;
  }
  activeLifecycle = lifecycle;
  annotateTraceByRequest(
    { name: TraceName.PerpsLoadingSession, id: activeSessionId },
    { lifecycle },
  );
}

export function getActivePerpsLoadingSessionTraceData():
  | { perps_session_id: string }
  | undefined {
  return activeSessionId ? { perps_session_id: activeSessionId } : undefined;
}

function endActiveLoadingSession(
  data: Record<string, string | number | boolean>,
  timestamp?: number,
): void {
  if (!activeSessionId) {
    return;
  }
  endTrace({
    name: TraceName.PerpsLoadingSession,
    id: activeSessionId,
    timestamp,
    data: {
      success: data.success ?? true,
      content_state: data.content_state ?? 'filled',
      ...data,
    },
  });
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  activeSessionId = null;
  activeLifecycle = 'cold_no_cache';
  sessionStartedAtMs = null;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  pendingFinishData = null;
  preSessionEvents = [];
  preSessionFinishData = null;
  preSessionBufferArmed = false;
}

function requiresLiveAccount(
  data: Record<string, string | number | boolean>,
): boolean {
  return (
    data.success !== false &&
    (data.content_variant === 'positions' ||
      data.content_variant === 'orders' ||
      data.content_variant === 'positions_and_orders')
  );
}

function hasRequiredLiveStreams(
  data: Record<string, string | number | boolean>,
): boolean {
  return (
    !requiresLiveAccount(data) ||
    (recordedMilestones.has('positions_live') &&
      recordedMilestones.has('orders_live') &&
      recordedMilestones.has('account_live'))
  );
}

function tryFinishPendingSession(): void {
  if (!pendingFinishData || !hasRequiredLiveStreams(pendingFinishData)) {
    return;
  }
  endActiveLoadingSession({
    ...pendingFinishData,
    required_live_streams_complete: true,
  });
}

export function finishPerpsLoadingSession(
  data: Record<string, string | number | boolean> = {},
): void {
  if (!activeSessionId) {
    if (preSessionBufferArmed) {
      preSessionFinishData = data;
    }
    return;
  }
  if (pendingFinishData?.success === false && data.success !== false) {
    return;
  }
  pendingFinishData = data;
  tryFinishPendingSession();
}

export function resetPerpsLoadingSessionForTesting(): void {
  activeSessionId = null;
  activeLifecycle = 'cold_no_cache';
  sessionStartedAtMs = null;
  controllerConstructedAtMs = null;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  pendingFinishData = null;
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  preSessionEvents = [];
  preSessionFinishData = null;
  preSessionBufferArmed = true;
}
