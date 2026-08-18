import { v4 as uuidv4 } from 'uuid';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  annotateTrace,
  endTrace,
  getTraceContextById,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

export const PERPS_BOOTSTRAP_STAGE = 'perps_bootstrap_start';
export const PERPS_VALUES_READY_STAGE = 'values_ready';
export const HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS =
  'homepage_ready_distance_from_perps_bootstrap_start_ms';
export const BOOTSTRAP_BEFORE_HOMEPAGE_READY =
  'bootstrap_before_homepage_ready';

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
export interface PerpsLoadingSessionContext {
  id: string;
  marketSource: PerpsSessionMarketSource;
  accountSource: PerpsSessionAccountSource;
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

type Milestone = keyof typeof MILESTONE_MEASUREMENTS;
type CacheStream = 'positions' | 'orders' | 'account';

let activeSessionId: string | null = null;
let sessionStartedAtMs: number | null = null;
const recordedMilestones = new Set<Milestone>();
const cacheObservedBySource = new Map<PerpsLoadingSource, Set<CacheStream>>();
let marketsReadySource: PerpsLoadingSource | null = null;
let accountCacheSource: PerpsLoadingSource | null = null;
let homepageReadyAtMs: number | null = null;
let homepageDistanceRecorded = false;
let pendingFinishData: Record<string, string | number | boolean> | null = null;

export function startPerpsLoadingSession(): string {
  if (activeSessionId) {
    return activeSessionId;
  }

  const sessionId = uuidv4();
  activeSessionId = sessionId;
  const now = performance.now();
  sessionStartedAtMs = now;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  homepageDistanceRecorded = false;
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
  });

  attachHomepageReadyDistance();
  return sessionId;
}

export function recordPerpsLoadingSessionValuesReady(
  stream: PerpsLoadingStream,
  source: PerpsLoadingSource,
  itemCount: number,
  detail: Record<string, number> = {},
): void {
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

  const now = performance.now();
  const elapsedMs = now - sessionStartedAtMs;
  const span = getTraceContextById(activeSessionId);
  if (span) {
    setMeasurement(
      MILESTONE_MEASUREMENTS[milestone],
      elapsedMs,
      'millisecond',
      span,
    );
  }
  DevLogger.log(
    `[PerpsLoadProof] ${JSON.stringify({
      stage: PERPS_VALUES_READY_STAGE,
      stream,
      source,
      item_count: itemCount,
      elapsed_ms: Number(elapsedMs.toFixed(3)),
      monotonic_ms: Number(now.toFixed(3)),
      ...detail,
    })}`,
  );
}

export function resolvePerpsMarketSource(
  markets: { dataSource?: string }[],
  sessionMarketSource?: PerpsSessionMarketSource | null,
): PerpsSessionMarketSource {
  if (
    markets.length > 0 &&
    markets.every(
      (market) => market.dataSource === 'terminal-global-snapshot-mark',
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
  };
}

function attachHomepageReadyDistance(): void {
  if (
    homepageDistanceRecorded ||
    !activeSessionId ||
    sessionStartedAtMs === null ||
    homepageReadyAtMs === null
  ) {
    return;
  }
  const span = getTraceContextById(activeSessionId);
  if (!span) {
    return;
  }
  setMeasurement(
    HOMEPAGE_READY_DISTANCE_FROM_PERPS_BOOTSTRAP_START_MS,
    Math.abs(homepageReadyAtMs - sessionStartedAtMs),
    'millisecond',
    span,
  );
  annotateTrace(span, {
    [BOOTSTRAP_BEFORE_HOMEPAGE_READY]: sessionStartedAtMs <= homepageReadyAtMs,
  });
  homepageDistanceRecorded = true;
}

function endActiveLoadingSession(
  data: Record<string, string | number | boolean>,
): void {
  if (!activeSessionId) {
    return;
  }
  attachHomepageReadyDistance();
  endTrace({
    name: TraceName.PerpsLoadingSession,
    id: activeSessionId,
    data: {
      success: data.success ?? true,
      content_state: data.content_state ?? 'filled',
      ...data,
    },
  });
  activeSessionId = null;
  sessionStartedAtMs = null;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  homepageReadyAtMs = null;
  homepageDistanceRecorded = false;
  pendingFinishData = null;
}

export function recordHomepageReadyAt(monotonicMs: number): void {
  if (!Number.isFinite(monotonicMs)) {
    return;
  }
  homepageReadyAtMs = monotonicMs;
  attachHomepageReadyDistance();
  if (pendingFinishData) {
    endActiveLoadingSession(pendingFinishData);
  }
}

export function finishPerpsLoadingSession(
  data: Record<string, string | number | boolean> = {},
): void {
  if (!activeSessionId || pendingFinishData) {
    return;
  }
  if (homepageReadyAtMs === null) {
    pendingFinishData = data;
    return;
  }
  endActiveLoadingSession(data);
}

export function resetPerpsLoadingSessionForTesting(): void {
  activeSessionId = null;
  sessionStartedAtMs = null;
  recordedMilestones.clear();
  cacheObservedBySource.clear();
  marketsReadySource = null;
  accountCacheSource = null;
  homepageReadyAtMs = null;
  homepageDistanceRecorded = false;
  pendingFinishData = null;
}
