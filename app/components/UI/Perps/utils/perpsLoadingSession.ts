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
const PRE_SESSION_EVENT_BUFFER_LIMIT = 20;

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
  identity?: PerpsLoadingSessionIdentity;
}
export interface PerpsLoadingSessionIdentity {
  marketKey: string;
  userKey: string;
}
export interface PerpsLoadingSessionContext {
  id: string;
  marketSource: PerpsSessionMarketSource;
  accountSource: PerpsSessionAccountSource;
  lifecycle: PerpsLoadingLifecycle;
}

export type PerpsLoadingSessionCancellationReason =
  | 'app_backgrounded'
  | 'context_changed'
  | 'session_restarted'
  | 'surface_unmounted';

export type PerpsLoadingSessionUpdate =
  | {
      type: 'started' | 'milestone' | 'lifecycle';
      context: PerpsLoadingSessionContext;
    }
  | { type: 'finished'; context: PerpsLoadingSessionContext }
  | {
      type: 'cancelled' | 'timed_out';
      context: PerpsLoadingSessionContext;
    };

export function createPerpsLoadingSessionIdentity({
  address,
  hip3ConfigVersion,
  network,
  provider,
}: {
  address?: string;
  hip3ConfigVersion: number;
  network: 'mainnet' | 'testnet';
  provider?: string;
}): PerpsLoadingSessionIdentity {
  const marketKey = JSON.stringify([
    provider ?? '',
    network,
    hip3ConfigVersion,
  ]);
  return {
    marketKey,
    userKey: JSON.stringify([marketKey, address?.toLowerCase() ?? '']),
  };
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
let activeSessionIdentity: PerpsLoadingSessionIdentity | null = null;
let activeLifecycle: PerpsLoadingLifecycle = 'cold_no_cache';
let sessionStartedAtMs: number | null = null;
let controllerConstructedAtMs: number | null = null;
const recordedMilestones = new Set<Milestone>();
const cacheObservedBySource = new Map<PerpsLoadingSource, Set<CacheStream>>();
const sessionListeners = new Set<(update: PerpsLoadingSessionUpdate) => void>();
let marketsReadySource: PerpsLoadingSource | null = null;
let accountCacheSource: PerpsLoadingSource | null = null;
let pendingFinishData: Record<string, string | number | boolean> | null = null;
let sessionTimeout: ReturnType<typeof setTimeout> | null = null;
let preSessionEvents: {
  stream: PerpsLoadingStream;
  source: PerpsLoadingSource;
  itemCount: number;
  detail: Record<string, number>;
  identity?: PerpsLoadingSessionIdentity;
  recordedAtMs: number;
}[] = [];
let preSessionFinishData: Record<string, string | number | boolean> | null =
  null;
let preSessionBufferArmed = false;

function notifySessionListeners(update: PerpsLoadingSessionUpdate): void {
  sessionListeners.forEach((listener) => listener(update));
}

export function subscribeToPerpsLoadingSession(
  listener: (update: PerpsLoadingSessionUpdate) => void,
): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function preparePerpsLoadingSession(): void {
  if (activeSessionId) {
    return;
  }
  if (!preSessionBufferArmed) {
    preSessionEvents = [];
    preSessionFinishData = null;
  }
  preSessionBufferArmed = true;
}

export function startPerpsLoadingSession(
  options: StartPerpsLoadingSessionOptions = {},
): string {
  if (activeSessionId && !options.restart) {
    return activeSessionId;
  }

  if (activeSessionId) {
    cancelPerpsLoadingSession('session_restarted');
  }

  const sessionId = uuidv4();
  activeSessionId = sessionId;
  activeSessionIdentity = options.identity ?? null;
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

  const startedContext = getActivePerpsLoadingSessionContext();
  if (startedContext) {
    notifySessionListeners({ type: 'started', context: startedContext });
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
  identity?: PerpsLoadingSessionIdentity,
): void {
  if (!activeSessionId || sessionStartedAtMs === null) {
    if (!preSessionBufferArmed) {
      return;
    }
    const recordedAtMs = performance.now();
    preSessionEvents.push({
      stream,
      source,
      itemCount,
      detail,
      identity,
      recordedAtMs,
    });
    preSessionEvents = preSessionEvents.slice(-PRE_SESSION_EVENT_BUFFER_LIMIT);
    return;
  }

  if (
    isRecordedMilestone(stream, source, itemCount) ||
    !matchesActiveSessionIdentity(stream, identity)
  ) {
    return;
  }

  recordValuesReady({
    stream,
    source,
    itemCount,
    detail,
    identity,
    recordedAtMs: performance.now(),
  });
}

function isRecordedMilestone(
  stream: PerpsLoadingStream,
  source: PerpsLoadingSource,
  itemCount: number,
): boolean {
  if (stream === 'markets') {
    return itemCount <= 0 || recordedMilestones.has('markets_ready');
  }
  if (source === 'fresh_socket') {
    if ((stream === 'account' || stream === 'prices') && itemCount <= 0) {
      return true;
    }
    const milestone = `${stream}_live` as Milestone;
    return recordedMilestones.has(milestone);
  }
  if (recordedMilestones.has('account_cache_ready')) {
    return true;
  }
  if (stream === 'account' && itemCount <= 0) {
    return true;
  }
  return cacheObservedBySource.get(source)?.has(stream as CacheStream) ?? false;
}

function matchesActiveSessionIdentity(
  stream: PerpsLoadingStream,
  identity?: PerpsLoadingSessionIdentity,
): boolean {
  if (!activeSessionIdentity) {
    return true;
  }
  if (!identity) {
    return false;
  }
  return stream === 'markets' || stream === 'prices'
    ? identity.marketKey === activeSessionIdentity.marketKey
    : identity.userKey === activeSessionIdentity.userKey;
}

function recordValuesReady({
  stream,
  source,
  itemCount,
  detail,
  identity,
  recordedAtMs,
}: {
  stream: PerpsLoadingStream;
  source: PerpsLoadingSource;
  itemCount: number;
  detail: Record<string, number>;
  identity?: PerpsLoadingSessionIdentity;
  recordedAtMs: number;
}): void {
  if (
    !activeSessionId ||
    sessionStartedAtMs === null ||
    !matchesActiveSessionIdentity(stream, identity)
  ) {
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

  const milestoneContext = getActivePerpsLoadingSessionContext();
  if (milestoneContext) {
    notifySessionListeners({ type: 'milestone', context: milestoneContext });
  }

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
  const lifecycleContext = getActivePerpsLoadingSessionContext();
  if (lifecycleContext) {
    notifySessionListeners({ type: 'lifecycle', context: lifecycleContext });
  }
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
  const endedContext = getActivePerpsLoadingSessionContext();
  const updateType =
    data.failure_stage === 'loading_session_timeout' ? 'timed_out' : 'finished';
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
  resetActiveLoadingSession();
  if (endedContext) {
    notifySessionListeners({ type: updateType, context: endedContext });
  }
}

function resetActiveLoadingSession(): void {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
  activeSessionId = null;
  activeSessionIdentity = null;
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

export function cancelPerpsLoadingSession(
  reason: PerpsLoadingSessionCancellationReason,
): void {
  if (!activeSessionId) {
    preSessionEvents = [];
    preSessionFinishData = null;
    preSessionBufferArmed = false;
    return;
  }
  const cancelledContext = getActivePerpsLoadingSessionContext();
  endTrace({
    name: TraceName.PerpsLoadingSession,
    id: activeSessionId,
    data: {
      cancellation_reason: reason,
      required_live_streams_complete: false,
    },
  });
  resetActiveLoadingSession();
  if (cancelledContext) {
    notifySessionListeners({ type: 'cancelled', context: cancelledContext });
  }
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
  expectedSessionId?: string,
): void {
  if (expectedSessionId && activeSessionId !== expectedSessionId) {
    return;
  }
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
  activeSessionIdentity = null;
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
  preSessionBufferArmed = false;
}
