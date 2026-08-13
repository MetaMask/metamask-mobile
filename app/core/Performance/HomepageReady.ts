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

let startedAt: number | null = null;

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

export const resetHomepageReadyTraceForTesting = () => {
  startedAt = null;
};
