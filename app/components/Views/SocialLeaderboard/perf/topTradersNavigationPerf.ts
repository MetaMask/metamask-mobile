import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
  TraceOperation,
  type TraceContext,
} from '../../../../util/trace';
import { setLeaderboardFetchSpanWrapper } from '../../../../util/leaderboardFetchSpan';

/**
 * Build-time gate. Babel inlines `MM_PERF_TOP_TRADERS` in release bundles.
 * When it is not `"true"`, every entry point returns before touching Sentry
 * or the log hook.
 */
const ENV_ENABLED = process.env.MM_PERF_TOP_TRADERS === 'true';

/** Give a slow network time to settle before emitting a partial summary. */
const EMIT_FALLBACK_MS = 8000;

export type TopTradersPerfVariant = 'V0' | 'V1' | 'onboarding';

export type TopTradersPerfSurface =
  | 'leaderboard'
  | 'feed'
  | 'trending'
  | 'following'
  | 'liveTrades'
  | 'onboarding';

export type TopTradersCacheStatus = 'hit' | 'miss' | 'stale-revalidate';

export type TopTradersQueryTimeframe = '7d' | '30d';

/** Query-key params safe to log. No addresses, URLs, or headers. */
export interface TopTradersQueryParams {
  limit: number;
  chains: string[];
  sort: string;
  timeframe: TopTradersQueryTimeframe;
}

export interface TopTradersPerfLog {
  event: 'navigation';
  variant: TopTradersPerfVariant;
  surface: TopTradersPerfSurface;
  fromCache: boolean | null;
  hasRows: boolean;
  tapToNavigateMs: number | null;
  tapToFirstCommitMs: number | null;
  tapToTransitionEndMs: number | null;
  tapToContentReadyMs: number | null;
  tapToFirstRowsMs: number | null;
  cache: TopTradersCacheStatus | null;
  limit: number | null;
  chains: string[] | null;
  sort: string | null;
  timeframe: TopTradersQueryTimeframe | null;
  fetchMs: number | null;
}

interface Session {
  id: string;
  tapAt: number;
  navigateAt?: number;
  firstCommitAt?: number;
  transitionEndAt?: number;
  contentReadyAt?: number;
  firstRowsAt?: number;
  fetchStartedAt?: number;
  fetchEndedAt?: number;
  variant?: TopTradersPerfVariant;
  surface?: TopTradersPerfSurface;
  fromCache: boolean | null;
  hasRows: boolean;
  contentSettled: boolean;
  emitted: boolean;
  emitTimer?: ReturnType<typeof setTimeout>;
  parent?: TraceContext;
  rowsSpan?: TraceContext;
  rowsEnded: boolean;
  landingQuery?: TopTradersQueryParams;
  cache?: TopTradersCacheStatus;
  fetchOpen: boolean;
}

let enabledOverride: boolean | null = null;
let session: Session | null = null;

const isJest = typeof process.env.JEST_WORKER_ID === 'string';

type NativeLoggingHook = (message: string, level: number) => void;

export function isTopTradersNavPerfEnabled(): boolean {
  if (isJest && enabledOverride !== null) {
    return enabledOverride;
  }
  return ENV_ENABLED;
}

export function _setTopTradersNavPerfEnabledForTests(
  enabled: boolean | null,
): void {
  if (!isJest) {
    return;
  }
  enabledOverride = enabled;
}

export function _resetTopTradersNavPerfForTests(): void {
  clearEmitTimer(session);
  endOpenSpans(session);
  session = null;
  enabledOverride = null;
}

/**
 * Release builds strip `console.*`. `nativeLoggingHook` still reaches
 * logcat (`ReactNativeJS`) and the iOS unified log. `console.log` is only
 * the dev/Jest fallback.
 */
function emitPerfLine(payload: object): void {
  const line = `[PERF_TOP_TRADERS] ${JSON.stringify(payload)}`;
  const root = globalThis as { nativeLoggingHook?: NativeLoggingHook };
  if (typeof root.nativeLoggingHook === 'function') {
    root.nativeLoggingHook(line, 1);
    return;
  }
  // Jest has no native hook. Release builds strip this call.
  if (isJest || typeof __DEV__ === 'undefined' || __DEV__) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

/**
 * (a) start — call at the top of the Top traders press handler, before any
 * navigation work. Opens the tap-to-rows span so the landing fetch can be
 * its child while the request is in flight.
 */
export function markTopTradersNavigationTap(): void {
  if (!isTopTradersNavPerfEnabled()) {
    return;
  }
  clearEmitTimer(session);
  endOpenSpans(session);
  const tapAt = getPerformanceTimestamp();
  const id = `top-traders-${tapAt}`;
  const parent = trace({
    name: TraceName.TopTradersNavigation,
    op: TraceOperation.TopTradersNavigation,
    id,
    startTime: tapAt,
    forceTransaction: true,
  });
  const rowsSpan = trace({
    name: TraceName.TopTradersNavigationToFirstRows,
    op: TraceOperation.TopTradersNavigation,
    id,
    parentContext: parent,
    startTime: tapAt,
  });
  session = {
    id,
    tapAt,
    fromCache: null,
    hasRows: false,
    contentSettled: false,
    emitted: false,
    parent,
    rowsSpan,
    rowsEnded: false,
    fetchOpen: false,
  };
}

/**
 * (a) end — call immediately before `navigate()`.
 */
export function markTopTradersNavigationTarget(target: {
  variant: TopTradersPerfVariant;
  surface: TopTradersPerfSurface;
}): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  session.variant = target.variant;
  session.surface = target.surface;
  session.navigateAt = getPerformanceTimestamp();
  armEmitTimer(session);
}

/**
 * (b) destination screen's first commit. `useLayoutEffect` on the screen root.
 */
export function markTopTradersFirstCommit(
  variant: TopTradersPerfVariant,
): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  if (session.variant !== variant || session.firstCommitAt != null) {
    return;
  }
  session.firstCommitAt = getPerformanceTimestamp();
  maybeEmit(session);
}

/**
 * (c) native-stack `transitionEnd` for the opening transition.
 */
export function markTopTradersTransitionEnd(): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  if (session.transitionEndAt != null) {
    return;
  }
  session.transitionEndAt = getPerformanceTimestamp();
  maybeEmit(session);
}

/**
 * (d) landing surface has rendered rows, or the query settled without rows.
 * Reports for a different surface are ignored so an off-screen pager page
 * cannot close the run.
 */
export function reportTopTradersContent(report: {
  surface: TopTradersPerfSurface;
  hasRows: boolean;
  settled: boolean;
  fromCache: boolean | null;
}): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  if (session.surface !== report.surface || session.contentSettled) {
    return;
  }
  if (!report.hasRows && !report.settled) {
    return;
  }
  session.contentSettled = true;
  session.hasRows = report.hasRows;
  session.fromCache = report.fromCache;
  session.contentReadyAt = getPerformanceTimestamp();
  maybeEmit(session);
}

/**
 * First paint of leaderboard rows that came from `useTopTraders`, not
 * skeletons and not a disk snapshot.
 */
export function markTopTradersFirstRows(): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  if (session.firstRowsAt != null) {
    return;
  }
  session.firstRowsAt = getPerformanceTimestamp();
  endRowsSpan(session, session.firstRowsAt);
  emitPerfLine({
    event: 'rows',
    variant: session.variant ?? null,
    surface: session.surface ?? null,
    tapToFirstRowsMs: elapsed(session.tapAt, session.firstRowsAt),
  });
  maybeEmit(session);
}

/**
 * Records the landing `useTopTraders` query. The first params win so a later
 * tab switch cannot replace the key the fetch span is matched against.
 */
export function observeTopTradersLandingQuery(input: {
  limit: number;
  chains: readonly string[];
  sort: string;
  timeframe: TopTradersQueryTimeframe;
  hasData: boolean;
  isFetching: boolean;
  hasFetched: boolean;
}): void {
  if (!isTopTradersNavPerfEnabled() || !session || session.emitted) {
    return;
  }
  const params = sanitizeQueryParams(input);
  if (!params) {
    return;
  }
  if (!session.landingQuery) {
    session.landingQuery = params;
  } else if (!sameQuery(session.landingQuery, params)) {
    return;
  }

  if (!session.cache) {
    const cache = classifyCache(input);
    if (!cache) {
      return;
    }
    session.cache = cache;
    emitQuery(session, 'mount', null);
    if (input.isFetching) {
      beginFetch(session);
    }
    return;
  }

  if (input.isFetching && !session.fetchOpen) {
    beginFetch(session);
    return;
  }
  if (!input.isFetching && session.fetchOpen) {
    endFetch(session);
  }
}

/**
 * Wraps the landing-tab leaderboard messenger call so the HTTP span is a
 * child of the tap-to-rows span. Other leaderboard fetches pass through.
 */
export async function traceLandingLeaderboardFetch<T>(
  rawOptions: unknown,
  run: () => Promise<T>,
): Promise<T> {
  if (
    !isTopTradersNavPerfEnabled() ||
    !session ||
    session.emitted ||
    !session.landingQuery ||
    !session.rowsSpan
  ) {
    return run();
  }
  const fetched = readFetchOptions(rawOptions);
  if (!fetched || !sameQuery(session.landingQuery, fetched)) {
    return run();
  }
  const { landingQuery, cache, rowsSpan, id } = session;
  return trace(
    {
      name: TraceName.TopTradersLeaderboardFetch,
      op: TraceOperation.TopTradersNavigation,
      id,
      parentContext: rowsSpan,
      tags: {
        cache: cache ?? 'miss',
        limit: landingQuery.limit,
        sort: landingQuery.sort,
        timeframe: landingQuery.timeframe,
        chains: landingQuery.chains.join(','),
      },
    },
    run,
  );
}

setLeaderboardFetchSpanWrapper(traceLandingLeaderboardFetch);

function beginFetch(current: Session): void {
  current.fetchOpen = true;
  current.fetchStartedAt = getPerformanceTimestamp();
  emitQuery(current, 'start', null);
}

function endFetch(current: Session): void {
  current.fetchOpen = false;
  current.fetchEndedAt = getPerformanceTimestamp();
  emitQuery(
    current,
    'end',
    elapsed(current.fetchStartedAt ?? current.tapAt, current.fetchEndedAt),
  );
}

function emitQuery(
  current: Session,
  phase: 'mount' | 'start' | 'end',
  durationMs: number | null,
): void {
  const params = current.landingQuery;
  const cache = current.cache;
  if (!params || !cache) {
    return;
  }
  emitPerfLine({
    event: 'query',
    phase,
    variant: current.variant ?? null,
    surface: current.surface ?? null,
    cache,
    limit: params.limit,
    chains: params.chains,
    sort: params.sort,
    timeframe: params.timeframe,
    ...(durationMs === null ? {} : { durationMs }),
  });
}

function classifyCache(input: {
  hasData: boolean;
  isFetching: boolean;
  hasFetched: boolean;
}): TopTradersCacheStatus | null {
  if (!input.hasFetched && !input.isFetching && !input.hasData) {
    return null;
  }
  if (input.hasData && input.isFetching) {
    return 'stale-revalidate';
  }
  if (input.hasData || (input.hasFetched && !input.isFetching)) {
    return 'hit';
  }
  if (input.isFetching) {
    return 'miss';
  }
  return null;
}

function sanitizeQueryParams(input: {
  limit: number;
  chains: readonly string[];
  sort: string;
  timeframe: TopTradersQueryTimeframe;
}): TopTradersQueryParams | null {
  if (!Number.isFinite(input.limit) || input.limit < 0) {
    return null;
  }
  if (!isLeaderboardSort(input.sort)) {
    return null;
  }
  if (input.timeframe !== '7d' && input.timeframe !== '30d') {
    return null;
  }
  const chains = input.chains.filter(isChainSlug);
  if (chains.length !== input.chains.length || chains.length === 0) {
    return null;
  }
  return {
    limit: input.limit,
    chains: [...chains],
    sort: input.sort,
    timeframe: input.timeframe,
  };
}

function readFetchOptions(
  raw: unknown,
): Pick<TopTradersQueryParams, 'limit' | 'chains' | 'sort'> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as { limit?: unknown; chains?: unknown; sort?: unknown };
  if (typeof record.limit !== 'number' || !Number.isFinite(record.limit)) {
    return null;
  }
  if (!isLeaderboardSort(record.sort)) {
    return null;
  }
  if (!Array.isArray(record.chains)) {
    return null;
  }
  const chains = record.chains.filter(
    (chain): chain is string => typeof chain === 'string' && isChainSlug(chain),
  );
  if (chains.length !== record.chains.length || chains.length === 0) {
    return null;
  }
  return { limit: record.limit, chains, sort: record.sort };
}

function isChainSlug(chain: string): boolean {
  return /^[a-z][a-z0-9]*$/.test(chain);
}

function isLeaderboardSort(sort: unknown): sort is 'pnl' | 'roi' | 'winRate' {
  return sort === 'pnl' || sort === 'roi' || sort === 'winRate';
}

function sameQuery(
  expected: Pick<TopTradersQueryParams, 'limit' | 'chains' | 'sort'>,
  actual: Pick<TopTradersQueryParams, 'limit' | 'chains' | 'sort'>,
): boolean {
  return (
    expected.limit === actual.limit &&
    expected.sort === actual.sort &&
    expected.chains.join(',') === actual.chains.join(',')
  );
}

function armEmitTimer(current: Session): void {
  clearEmitTimer(current);
  current.emitTimer = setTimeout(() => {
    if (session === current) {
      emit(current);
    }
  }, EMIT_FALLBACK_MS);
}

function clearEmitTimer(current: Session | null): void {
  if (current?.emitTimer) {
    clearTimeout(current.emitTimer);
    current.emitTimer = undefined;
  }
}

function maybeEmit(current: Session): void {
  if (current.emitted || !current.contentSettled || !current.navigateAt) {
    return;
  }
  if (current.transitionEndAt == null) {
    return;
  }
  emit(current);
}

function emit(current: Session): void {
  if (current.emitted || !current.variant || !current.surface) {
    return;
  }
  current.emitted = true;
  clearEmitTimer(current);

  const payload: TopTradersPerfLog = {
    event: 'navigation',
    variant: current.variant,
    surface: current.surface,
    fromCache: current.fromCache,
    hasRows: current.hasRows,
    tapToNavigateMs: elapsed(current.tapAt, current.navigateAt),
    tapToFirstCommitMs: elapsed(current.tapAt, current.firstCommitAt),
    tapToTransitionEndMs: elapsed(current.tapAt, current.transitionEndAt),
    tapToContentReadyMs: elapsed(current.tapAt, current.contentReadyAt),
    tapToFirstRowsMs: elapsed(current.tapAt, current.firstRowsAt),
    cache: current.cache ?? null,
    limit: current.landingQuery?.limit ?? null,
    chains: current.landingQuery?.chains ?? null,
    sort: current.landingQuery?.sort ?? null,
    timeframe: current.landingQuery?.timeframe ?? null,
    fetchMs: elapsed(current.fetchStartedAt, current.fetchEndedAt),
  };

  emitPerfLine(payload);
  emitTraces(current, payload);
  if (session === current) {
    session = null;
  }
}

function elapsed(
  tapAt: number | undefined,
  at: number | undefined,
): number | null {
  if (tapAt == null || at == null) {
    return null;
  }
  return Math.round(at - tapAt);
}

function emitTraces(current: Session, payload: TopTradersPerfLog): void {
  const tags: Record<string, string | number | boolean> = {
    variant: payload.variant,
    surface: payload.surface,
    hasRows: payload.hasRows,
  };
  if (payload.fromCache !== null) {
    tags.fromCache = payload.fromCache;
  }
  if (payload.cache) {
    tags.cache = payload.cache;
  }
  assignMs(tags, 'tapToNavigateMs', payload.tapToNavigateMs);
  assignMs(tags, 'tapToFirstCommitMs', payload.tapToFirstCommitMs);
  assignMs(tags, 'tapToTransitionEndMs', payload.tapToTransitionEndMs);
  assignMs(tags, 'tapToContentReadyMs', payload.tapToContentReadyMs);
  assignMs(tags, 'tapToFirstRowsMs', payload.tapToFirstRowsMs);
  assignMs(tags, 'fetchMs', payload.fetchMs);

  const parent =
    current.parent ??
    trace({
      name: TraceName.TopTradersNavigation,
      op: TraceOperation.TopTradersNavigation,
      id: current.id,
      startTime: current.tapAt,
      forceTransaction: true,
      tags,
    });

  endChild(
    parent,
    TraceName.TopTradersNavigationToNavigate,
    current,
    current.navigateAt,
  );
  endChild(
    parent,
    TraceName.TopTradersNavigationToFirstCommit,
    current,
    current.firstCommitAt,
  );
  endChild(
    parent,
    TraceName.TopTradersNavigationToTransitionEnd,
    current,
    current.transitionEndAt,
  );
  endChild(
    parent,
    TraceName.TopTradersNavigationToContentReady,
    current,
    current.contentReadyAt,
  );
  if (!current.rowsEnded) {
    endRowsSpan(current, current.firstRowsAt);
  }

  const parentEnd = Math.max(
    current.navigateAt ?? current.tapAt,
    current.firstCommitAt ?? current.tapAt,
    current.transitionEndAt ?? current.tapAt,
    current.contentReadyAt ?? current.tapAt,
    current.firstRowsAt ?? current.tapAt,
    current.fetchEndedAt ?? current.tapAt,
  );
  endTrace({
    name: TraceName.TopTradersNavigation,
    id: current.id,
    timestamp: parentEnd,
  });
}

function endRowsSpan(current: Session, endAt: number | undefined): void {
  if (current.rowsEnded) {
    return;
  }
  current.rowsEnded = true;
  if (endAt == null) {
    endTrace({
      name: TraceName.TopTradersNavigationToFirstRows,
      id: current.id,
    });
    return;
  }
  endTrace({
    name: TraceName.TopTradersNavigationToFirstRows,
    id: current.id,
    timestamp: endAt,
  });
}

function endOpenSpans(current: Session | null): void {
  if (!current || current.emitted) {
    return;
  }
  if (!current.rowsEnded) {
    endRowsSpan(current, undefined);
  }
  if (current.parent) {
    endTrace({
      name: TraceName.TopTradersNavigation,
      id: current.id,
    });
  }
}

function endChild(
  parent: TraceContext,
  name: TraceName,
  current: Session,
  endAt: number | undefined,
): void {
  if (endAt == null) {
    return;
  }
  trace({
    name,
    op: TraceOperation.TopTradersNavigation,
    id: current.id,
    parentContext: parent,
    startTime: current.tapAt,
  });
  endTrace({ name, id: current.id, timestamp: endAt });
}

function assignMs(
  tags: Record<string, string | number | boolean>,
  key: string,
  value: number | null,
): void {
  if (value !== null) {
    tags[key] = value;
  }
}
