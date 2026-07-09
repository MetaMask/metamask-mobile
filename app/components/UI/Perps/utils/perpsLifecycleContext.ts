import { AppState, type AppStateStatus } from 'react-native';
import { TraceName } from '../../../../util/trace';

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

/**
 * Spans whose completion means the user has seen a live Perps screen, so the
 * foreground is settled and later flows read as `warm`. This is the SINGLE
 * source of truth for the cold→warm boundary across every entry path — Home,
 * Market Details, Order, deeplinks, homepage cards. Add a new Perps entry
 * surface's render span here and every entry path stays correctly tagged; no
 * per-view opt-in is needed.
 */
const FOREGROUND_SETTLING_SPANS: ReadonlySet<TraceName> = new Set([
  TraceName.PerpsEntryToLiveMarketList,
  TraceName.PerpsMarketDetailLive,
  TraceName.PerpsTradePageRender,
]);

/** Settle the foreground when an entry-surface render span completes. */
export function settlePerpsForegroundOnSpan(name: TraceName): void {
  if (FOREGROUND_SETTLING_SPANS.has(name)) {
    markPerpsForegroundSettled();
  }
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
  // Already foregrounded at init: no initial 'active' event will fire, so
  // seed the flag or the first real resume would read as the first foreground.
  if (lastState === 'active') {
    hasEnteredForegroundOnce = true;
  }
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
