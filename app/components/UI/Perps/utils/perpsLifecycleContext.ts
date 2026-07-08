import { AppState, type AppStateStatus } from 'react-native';

/**
 * Launch context for a Perps flow, used to split CUF latency by entry path.
 * AppState cannot distinguish cold_process from warm (both are "active, never
 * backgrounded"), so {@link markPerpsForegroundSettled} draws that boundary.
 */
export const PERPS_LIFECYCLE_CONTEXT = {
  COLD_PROCESS: 'cold_process',
  WARM: 'warm',
  BACKGROUND_RESUME: 'background_resume',
} as const;

export type PerpsLifecycleContext =
  (typeof PERPS_LIFECYCLE_CONTEXT)[keyof typeof PERPS_LIFECYCLE_CONTEXT];

// Module load == process start.
let currentContext: PerpsLifecycleContext =
  PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS;
let hasEnteredForegroundOnce = false;

/** Update context from an AppState transition. Exported for tests. */
export function handlePerpsAppStateChange(
  nextState: AppStateStatus,
  previousState: AppStateStatus,
): void {
  if (nextState !== 'active') {
    return;
  }
  if (
    hasEnteredForegroundOnce &&
    (previousState === 'background' || previousState === 'inactive')
  ) {
    currentContext = PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
  }
  hasEnteredForegroundOnce = true;
}

/** Mark the current foreground's first flow done; later flows read as warm. */
export function markPerpsForegroundSettled(): void {
  currentContext = PERPS_LIFECYCLE_CONTEXT.WARM;
}

export function getPerpsLifecycleContext(): PerpsLifecycleContext {
  return currentContext;
}

let subscription: { remove: () => void } | undefined;

/** Subscribe to AppState so background_resume is detected. Idempotent. */
export function initPerpsLifecycleTracking(): () => void {
  if (subscription) {
    return () => subscription?.remove();
  }
  let lastState = AppState.currentState;
  subscription = AppState.addEventListener('change', (nextState) => {
    const prevState = lastState;
    lastState = nextState;
    handlePerpsAppStateChange(nextState, prevState);
  });
  return () => {
    subscription?.remove();
    subscription = undefined;
  };
}

/** Test-only reset. */
export function resetPerpsLifecycleContextForTests(): void {
  currentContext = PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  subscription?.remove();
  subscription = undefined;
}
