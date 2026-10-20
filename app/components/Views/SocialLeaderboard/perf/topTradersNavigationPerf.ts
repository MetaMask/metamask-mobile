import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
  TraceOperation,
  type TraceContext,
} from '../../../../util/trace';

/**
 * Build-time gate. Babel inlines `MM_PERF_TOP_TRADERS` in release bundles.
 * When it is not `"true"`, every entry point returns before touching Sentry
 * or `console`.
 */
const ENV_ENABLED = process.env.MM_PERF_TOP_TRADERS === 'true';

/** Give a slow network time to settle before emitting a partial line. */
const EMIT_FALLBACK_MS = 8000;

export type TopTradersPerfVariant = 'V0' | 'V1' | 'onboarding';

export type TopTradersPerfSurface =
  | 'leaderboard'
  | 'feed'
  | 'trending'
  | 'following'
  | 'liveTrades'
  | 'onboarding';

export interface TopTradersPerfLog {
  variant: TopTradersPerfVariant;
  surface: TopTradersPerfSurface;
  fromCache: boolean | null;
  hasRows: boolean;
  tapToNavigateMs: number | null;
  tapToFirstCommitMs: number | null;
  tapToTransitionEndMs: number | null;
  tapToContentReadyMs: number | null;
}

interface Session {
  id: string;
  tapAt: number;
  navigateAt?: number;
  firstCommitAt?: number;
  transitionEndAt?: number;
  contentReadyAt?: number;
  variant?: TopTradersPerfVariant;
  surface?: TopTradersPerfSurface;
  fromCache: boolean | null;
  hasRows: boolean;
  contentSettled: boolean;
  emitted: boolean;
  emitTimer?: ReturnType<typeof setTimeout>;
}

let enabledOverride: boolean | null = null;
let session: Session | null = null;

const isJest = typeof process.env.JEST_WORKER_ID === 'string';

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
  session = null;
  enabledOverride = null;
}

/**
 * (a) start — call at the top of the Top traders press handler, before any
 * navigation work.
 */
export function markTopTradersNavigationTap(): void {
  if (!isTopTradersNavPerfEnabled()) {
    return;
  }
  clearEmitTimer(session);
  const tapAt = getPerformanceTimestamp();
  session = {
    id: `top-traders-${tapAt}`,
    tapAt,
    fromCache: null,
    hasRows: false,
    contentSettled: false,
    emitted: false,
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
    variant: current.variant,
    surface: current.surface,
    fromCache: current.fromCache,
    hasRows: current.hasRows,
    tapToNavigateMs: elapsed(current.tapAt, current.navigateAt),
    tapToFirstCommitMs: elapsed(current.tapAt, current.firstCommitAt),
    tapToTransitionEndMs: elapsed(current.tapAt, current.transitionEndAt),
    tapToContentReadyMs: elapsed(current.tapAt, current.contentReadyAt),
  };

  // Logcat / Xcode console. One line per navigation, gated above.
  // eslint-disable-next-line no-console
  console.log(`[PERF_TOP_TRADERS] ${JSON.stringify(payload)}`);
  emitTraces(current, payload);
  if (session === current) {
    session = null;
  }
}

function elapsed(tapAt: number, at: number | undefined): number | null {
  if (at == null) {
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
  assignMs(tags, 'tapToNavigateMs', payload.tapToNavigateMs);
  assignMs(tags, 'tapToFirstCommitMs', payload.tapToFirstCommitMs);
  assignMs(tags, 'tapToTransitionEndMs', payload.tapToTransitionEndMs);
  assignMs(tags, 'tapToContentReadyMs', payload.tapToContentReadyMs);

  const parent = trace({
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

  const parentEnd = Math.max(
    current.navigateAt ?? current.tapAt,
    current.firstCommitAt ?? current.tapAt,
    current.transitionEndAt ?? current.tapAt,
    current.contentReadyAt ?? current.tapAt,
  );
  endTrace({
    name: TraceName.TopTradersNavigation,
    id: current.id,
    timestamp: parentEnd,
  });
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
