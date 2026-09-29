import { AppState, type NativeEventSubscription } from 'react-native';
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
export type HomepageReadyCancelReason =
  | 'unlock_failed'
  | 'metrics_opt_in'
  | 'backgrounded'
  | 'deeplink'
  | 'navigated_away';

interface StartHomepageReadyTraceOptions {
  source: HomepageReadyStartSource;
  appStartType: HomepageReadyAppStartType;
  startTime?: number;
  /** Numbers belong in span data: `trace` turns numeric tags into measurements. */
  tags?: Record<string, string | boolean>;
}

interface EndHomepageReadyTraceOptions {
  contentState: HomepageReadyContentState;
}

interface CancelHomepageReadyTraceOptions {
  reason: HomepageReadyCancelReason;
  /** When given, only cancels the trace started with that token. */
  traceToken?: HomepageReadyTraceToken | null;
}

let startedAt: number | null = null;
let activeTraceToken: HomepageReadyTraceToken | null = null;
let nextTraceToken = 0;
let appStateSubscription: NativeEventSubscription | null = null;

export type HomepageReadyTraceToken = number;

/**
 * Returns whether an entry point has already started the Homepage Ready CUF.
 */
export const isHomepageReadyTraceActive = () => startedAt !== null;

/** Token of the in-flight trace, or null when none is running. */
export const getActiveHomepageReadyTraceToken =
  (): HomepageReadyTraceToken | null => activeTraceToken;

const stopListeningForBackground = () => {
  appStateSubscription?.remove();
  appStateSubscription = null;
};

const clearActiveTrace = () => {
  startedAt = null;
  activeTraceToken = null;
  stopListeningForBackground();
};

/**
 * Ends an in-flight Homepage Ready CUF that cannot reach the homepage without
 * including time that is not app work. The span is still sent, with
 * `success: false` and the reason.
 *
 * Also releases the guard, so a retry starts from its own hand-back rather
 * than inheriting time from the failed attempt.
 */
export const cancelHomepageReadyTrace = ({
  reason,
  traceToken,
}: CancelHomepageReadyTraceOptions) => {
  if (startedAt === null) {
    return;
  }
  if (traceToken !== undefined && traceToken !== activeTraceToken) {
    return;
  }

  endTrace({
    name: TraceName.HomepageReady,
    data: {
      success: false,
      reason,
    },
  });
  clearActiveTrace();
};

/**
 * Time in the background is not app work, so going to the background ends the
 * trace. `inactive` is ignored: Face ID and system sheets pass through it.
 */
const listenForBackground = () => {
  stopListeningForBackground();
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background') {
      cancelHomepageReadyTrace({ reason: 'backgrounded' });
    }
  });
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
  tags,
}: StartHomepageReadyTraceOptions): HomepageReadyTraceToken | null => {
  const now = Date.now();
  if (startedAt !== null && now - startedAt < TRACES_CLEANUP_INTERVAL) {
    return null;
  }

  startedAt = now;
  nextTraceToken += 1;
  activeTraceToken = nextTraceToken;
  trace({
    name: TraceName.HomepageReady,
    op: TraceOperation.HomepagePerformance,
    ...(startTime === undefined ? {} : { startTime }),
    tags: {
      ...tags,
      start_source: source,
      app_start_type: appStartType,
    },
  });
  const traceToken = activeTraceToken;
  listenForBackground();
  // A background launch (fetch, push) can unlock with remember-me before the
  // app is ever shown, and never emits a `background` change.
  if (AppState.currentState === 'background') {
    cancelHomepageReadyTrace({ reason: 'backgrounded', traceToken });
  }
  return traceToken;
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
  clearActiveTrace();
};

export const resetHomepageReadyTraceForTesting = () => {
  clearActiveTrace();
  nextTraceToken = 0;
};
