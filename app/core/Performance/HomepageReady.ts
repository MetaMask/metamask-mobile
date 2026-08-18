import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import {
  endTrace,
  getTraceContext,
  trace,
  TraceName,
  TraceOperation,
  TRACES_CLEANUP_INTERVAL,
} from '../../util/trace';

export const AUTHENTICATION_END_TO_HOMEPAGE_READY_MS =
  'authentication_end_to_homepage_ready_ms';

export type HomepageReadyContentState = 'filled' | 'empty' | 'error';
export type HomepageReadyStartSource = 'app_open' | 'unlock';
export type HomepageReadyAppStartType = 'cold' | 'warm';

interface StartHomepageReadyTraceOptions {
  source: HomepageReadyStartSource;
  appStartType: HomepageReadyAppStartType;
  startTime?: number;
}

interface EndHomepageReadyTraceOptions {
  contentState: HomepageReadyContentState;
}

interface CancelHomepageReadyTraceOptions {
  reason: 'unlock_failed';
  traceToken: HomepageReadyTraceToken | null;
}

let startedAt: number | null = null;
let activeTraceToken: HomepageReadyTraceToken | null = null;
let activeStartSource: HomepageReadyStartSource | null = null;
let authenticationEndedAtMs: number | null = null;
let authenticationEndToken: HomepageReadyTraceToken | null = null;
let nextTraceToken = 0;
let queuedColdTrace: { startTime?: number } | null = null;
let latestHomepageReadyAtMs: number | null = null;
const homepageReadyListeners = new Set<(monotonicMs: number) => void>();

export type HomepageReadyTraceToken = number;

/**
 * Returns whether an entry point has already started the Homepage Ready CUF.
 */
export const isHomepageReadyTraceActive = () => startedAt !== null;

const clearAuthenticationEnd = () => {
  authenticationEndedAtMs = null;
  authenticationEndToken = null;
};

/**
 * Records authentication-end on the current unlock Homepage Ready token.
 * Cleared on failure, cancel, or a new token.
 */
export const markHomepageAuthenticationEnd = (
  traceToken: HomepageReadyTraceToken | null,
) => {
  if (
    traceToken === null ||
    traceToken !== activeTraceToken ||
    activeStartSource !== 'unlock'
  ) {
    return;
  }
  const now = performance.now();
  if (!Number.isFinite(now)) {
    return;
  }
  authenticationEndedAtMs = now;
  authenticationEndToken = traceToken;
};

/**
 * Subscribe to Homepage Ready completion. Replays the latest completed
 * monotonic timestamp immediately, then notifies on later completions.
 */
export const subscribeHomepageReadyCompletion = (
  listener: (monotonicMs: number) => void,
): (() => void) => {
  if (latestHomepageReadyAtMs !== null) {
    listener(latestHomepageReadyAtMs);
  }
  homepageReadyListeners.add(listener);
  return () => {
    homepageReadyListeners.delete(listener);
  };
};

const notifyHomepageReadyCompletion = (monotonicMs: number) => {
  latestHomepageReadyAtMs = monotonicMs;
  homepageReadyListeners.forEach((listener) => listener(monotonicMs));
};

/**
 * Starts the app-open/unlock to usable homepage CUF.
 *
 * The guard allows cold-start and unlock entry points to call this safely
 * without replacing the same in-flight trace.
 */
export const startHomepageReadyTrace = ({
  source,
  appStartType,
  startTime,
}: StartHomepageReadyTraceOptions): HomepageReadyTraceToken | null => {
  const now = Date.now();
  if (startedAt !== null && now - startedAt < TRACES_CLEANUP_INTERVAL) {
    return null;
  }

  startedAt = now;
  nextTraceToken += 1;
  activeTraceToken = nextTraceToken;
  activeStartSource = source;
  clearAuthenticationEnd();
  trace({
    name: TraceName.HomepageReady,
    op: TraceOperation.HomepagePerformance,
    ...(startTime === undefined ? {} : { startTime }),
    tags: {
      start_source: source,
      app_start_type: appStartType,
    },
  });
  return activeTraceToken;
};

/**
 * Queues an already-unlocked cold launch until navigation resolves. This keeps
 * the native launch timestamp without recording non-home launch destinations.
 */
export const queueColdHomepageReadyTrace = (startTime?: number) => {
  if (startedAt !== null || queuedColdTrace !== null) {
    return;
  }

  queuedColdTrace = { startTime };
};

/**
 * Resolves the queued cold launch once the homepage knows whether it is the
 * focused destination. An unfocused homepage discards the launch.
 */
export const resolveColdHomepageReadyTrace = ({
  isHomepageFocused,
}: {
  isHomepageFocused: boolean;
}): HomepageReadyTraceToken | null => {
  if (queuedColdTrace === null) {
    return null;
  }

  const { startTime } = queuedColdTrace;
  queuedColdTrace = null;
  if (!isHomepageFocused) {
    return null;
  }

  return startHomepageReadyTrace({
    source: 'app_open',
    appStartType: 'cold',
    startTime,
  });
};

/**
 * Ends the Homepage Ready CUF once the token section has rendered a usable
 * filled, empty, or error state.
 */
export const endHomepageReadyTrace = ({
  contentState,
}: EndHomepageReadyTraceOptions) => {
  if (startedAt === null) {
    return;
  }

  const homepageReadyAtMs = performance.now();
  if (
    activeStartSource === 'unlock' &&
    authenticationEndedAtMs !== null &&
    authenticationEndToken === activeTraceToken &&
    Number.isFinite(homepageReadyAtMs) &&
    homepageReadyAtMs >= authenticationEndedAtMs
  ) {
    const span = getTraceContext({ name: TraceName.HomepageReady });
    if (span) {
      setMeasurement(
        AUTHENTICATION_END_TO_HOMEPAGE_READY_MS,
        homepageReadyAtMs - authenticationEndedAtMs,
        'millisecond',
        span,
      );
    }
  }
  if (Number.isFinite(homepageReadyAtMs)) {
    notifyHomepageReadyCompletion(homepageReadyAtMs);
  }

  endTrace({
    name: TraceName.HomepageReady,
    data: {
      success: contentState !== 'error',
      content_state: contentState,
    },
  });
  startedAt = null;
  activeTraceToken = null;
  activeStartSource = null;
  clearAuthenticationEnd();
};

/**
 * Ends an in-flight Homepage Ready CUF that cannot reach the homepage.
 *
 * Failed authentication attempts must release the guard so a retry starts from
 * its own submit action rather than inheriting time from the failed attempt.
 */
export const cancelHomepageReadyTrace = ({
  reason,
  traceToken,
}: CancelHomepageReadyTraceOptions) => {
  if (
    startedAt === null ||
    traceToken === null ||
    traceToken !== activeTraceToken
  ) {
    return;
  }

  endTrace({
    name: TraceName.HomepageReady,
    data: {
      success: false,
      reason,
    },
  });
  startedAt = null;
  activeTraceToken = null;
  activeStartSource = null;
  clearAuthenticationEnd();
};

export const resetHomepageReadyTraceForTesting = () => {
  startedAt = null;
  activeTraceToken = null;
  activeStartSource = null;
  nextTraceToken = 0;
  queuedColdTrace = null;
  latestHomepageReadyAtMs = null;
  homepageReadyListeners.clear();
  clearAuthenticationEnd();
};
