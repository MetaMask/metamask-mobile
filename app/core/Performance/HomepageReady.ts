import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  TRACES_CLEANUP_INTERVAL,
} from '../../util/trace';

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
}

let startedAt: number | null = null;

/**
 * Returns whether an entry point has already started the Homepage Ready CUF.
 */
export const isHomepageReadyTraceActive = () => startedAt !== null;

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
}: StartHomepageReadyTraceOptions) => {
  const now = Date.now();
  if (startedAt !== null && now - startedAt < TRACES_CLEANUP_INTERVAL) {
    return;
  }

  startedAt = now;
  trace({
    name: TraceName.HomepageReady,
    op: TraceOperation.HomepagePerformance,
    ...(startTime === undefined ? {} : { startTime }),
    tags: {
      start_source: source,
      app_start_type: appStartType,
    },
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

  endTrace({
    name: TraceName.HomepageReady,
    data: {
      success: contentState !== 'error',
      content_state: contentState,
    },
  });
  startedAt = null;
};

/**
 * Ends an in-flight Homepage Ready CUF that cannot reach the homepage.
 *
 * Failed authentication attempts must release the guard so a retry starts from
 * its own submit action rather than inheriting time from the failed attempt.
 */
export const cancelHomepageReadyTrace = ({
  reason,
}: CancelHomepageReadyTraceOptions) => {
  if (startedAt === null) {
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
};

export const resetHomepageReadyTraceForTesting = () => {
  startedAt = null;
};
