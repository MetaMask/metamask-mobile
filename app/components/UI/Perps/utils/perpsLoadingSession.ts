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
import {
  PERPS_BOOTSTRAP_STAGE,
  PERPS_LOADING_CACHE_SOURCES,
  PERPS_LOADING_SESSION_TIMEOUT_MS,
  PERPS_VALUES_READY_STAGE,
  type PerpsLoadingLifecycle,
  type PerpsLoadingSessionCancellationReason,
  type PerpsLoadingSessionContext,
  type PerpsLoadingSessionIdentity,
  type PerpsLoadingSessionUpdate,
  type PerpsLoadingSource,
  type PerpsLoadingStream,
  type PerpsLoadingSurface,
  type PerpsSessionAccountSource,
  type PerpsSessionMarketSource,
  type StartPerpsLoadingSessionOptions,
} from './perpsLoadingSessionModel';

export {
  createPerpsLoadingSessionIdentity,
  PERPS_BOOTSTRAP_STAGE,
  PERPS_LOADING_SESSION_TIMEOUT_MS,
  PERPS_VALUES_READY_STAGE,
  resolvePerpsLoadingLifecycle,
} from './perpsLoadingSessionModel';
export type {
  PerpsLoadingLifecycle,
  PerpsLoadingSessionCancellationReason,
  PerpsLoadingSessionContext,
  PerpsLoadingSessionIdentity,
  PerpsLoadingSessionUpdate,
  PerpsLoadingSource,
  PerpsLoadingStream,
  PerpsLoadingSurface,
  PerpsSessionAccountSource,
  PerpsSessionMarketSource,
} from './perpsLoadingSessionModel';

const PRE_SESSION_EVENT_BUFFER_LIMIT = 20;

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
let activeAccountGeneration = 0;
let activeContextGeneration = 0;
let activeConnectionGeneration: number | undefined;
let accountGenerationCounter = 0;
let contextGenerationCounter = 0;
let lastStartedSessionIdentity: PerpsLoadingSessionIdentity | null = null;
let latestSessionContext: PerpsLoadingSessionContext | null = null;
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
  connectionGeneration?: number;
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
  contextGenerationCounter += 1;
  activeContextGeneration = contextGenerationCounter;
  activeConnectionGeneration = undefined;
  if (
    accountGenerationCounter === 0 ||
    (options.identity !== undefined &&
      lastStartedSessionIdentity?.accountKey !== options.identity.accountKey)
  ) {
    accountGenerationCounter += 1;
  }
  activeAccountGeneration = accountGenerationCounter;
  lastStartedSessionIdentity = options.identity ?? null;
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
      perps_session_id: sessionId,
      lifecycle: activeLifecycle,
      account_generation: activeAccountGeneration,
      context_generation: activeContextGeneration,
      monotonic_ms: Number(now.toFixed(3)),
    })}`,
  );
  trace({
    name: TraceName.PerpsLoadingSession,
    id: sessionId,
    op: TraceOperation.PerpsLoading,
    tags: {
      provider: options.provider ?? 'unknown',
      network: options.network ?? 'unknown',
    },
    data: {
      lifecycle: activeLifecycle,
      surface: options.surface ?? 'homepage',
      account_generation: activeAccountGeneration,
      context_generation: activeContextGeneration,
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
  connectionGeneration?: number,
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
      connectionGeneration,
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
    connectionGeneration,
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
  connectionGeneration,
  recordedAtMs,
}: {
  stream: PerpsLoadingStream;
  source: PerpsLoadingSource;
  itemCount: number;
  detail: Record<string, number>;
  identity?: PerpsLoadingSessionIdentity;
  connectionGeneration?: number;
  recordedAtMs: number;
}): void {
  if (
    !activeSessionId ||
    sessionStartedAtMs === null ||
    !matchesActiveSessionIdentity(stream, identity)
  ) {
    return;
  }

  if (
    source === 'fresh_socket' &&
    (typeof connectionGeneration !== 'number' ||
      !Number.isInteger(connectionGeneration) ||
      (stream === 'prices' && activeConnectionGeneration === undefined) ||
      (activeConnectionGeneration !== undefined &&
        activeConnectionGeneration !== connectionGeneration))
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
    PERPS_LOADING_CACHE_SOURCES.has(source) &&
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
  if (
    source === 'fresh_socket' &&
    stream !== 'prices' &&
    activeConnectionGeneration === undefined &&
    typeof connectionGeneration === 'number'
  ) {
    activeConnectionGeneration = connectionGeneration;
    annotateTraceByRequest(
      { name: TraceName.PerpsLoadingSession, id: activeSessionId },
      { connection_generation: connectionGeneration },
    );
  }
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
      perps_session_id: activeSessionId,
      lifecycle: activeLifecycle,
      account_generation: activeAccountGeneration,
      context_generation: activeContextGeneration,
      ...(source === 'fresh_socket'
        ? { connection_generation: activeConnectionGeneration }
        : {}),
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
  _markets: { dataSource?: string }[],
  sessionMarketSource?: PerpsSessionMarketSource | null,
): PerpsSessionMarketSource {
  if (sessionMarketSource && sessionMarketSource !== 'unknown') {
    return sessionMarketSource;
  }
  return 'unknown';
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
  const context = {
    id: activeSessionId,
    marketSource: recordedMarketSource(),
    accountSource: recordedAccountSource(),
    lifecycle: activeLifecycle,
    accountGeneration: activeAccountGeneration,
    contextGeneration: activeContextGeneration,
    ...(activeConnectionGeneration === undefined
      ? {}
      : { connectionGeneration: activeConnectionGeneration }),
  };
  latestSessionContext = context;
  return context;
}

export function getPerpsLoadingSessionContext(
  sessionId: string,
): PerpsLoadingSessionContext | null {
  const activeContext = getActivePerpsLoadingSessionContext();
  if (activeContext?.id === sessionId) {
    return activeContext;
  }
  return latestSessionContext?.id === sessionId ? latestSessionContext : null;
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
  | {
      perps_session_id: string;
      account_generation: number;
      context_generation: number;
      connection_generation?: number;
    }
  | undefined {
  return activeSessionId
    ? {
        perps_session_id: activeSessionId,
        account_generation: activeAccountGeneration,
        context_generation: activeContextGeneration,
        ...(activeConnectionGeneration === undefined
          ? {}
          : { connection_generation: activeConnectionGeneration }),
      }
    : undefined;
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
  activeAccountGeneration = 0;
  activeContextGeneration = 0;
  activeConnectionGeneration = undefined;
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
  activeAccountGeneration = 0;
  activeContextGeneration = 0;
  activeConnectionGeneration = undefined;
  accountGenerationCounter = 0;
  contextGenerationCounter = 0;
  lastStartedSessionIdentity = null;
  latestSessionContext = null;
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
