import { AppState, type AppStateStatus } from 'react-native';
import { TraceName } from '../../../../util/trace';
import {
  RAMPS_BUY_LIFECYCLE_CONTEXT,
  type RampsBuyLifecycleContext,
} from '../constants/rampsBuyCufTags';

/**
 * Tracks which launch context a Buy CUF span starts in. AppState alone cannot
 * separate a cold process from warm in-session navigation — both read as
 * "active, never backgrounded" — so {@link markRampsBuyForegroundSettled}
 * draws that boundary when the user has actually seen Buy content.
 *
 * Unlike Perps, Buy is not always-on: no Buy code runs until the user enters
 * the flow. Tracking therefore arms on the first Buy span rather than at app
 * start, which makes the first Buy flow of a process `cold_process` even if
 * the app was backgrounded earlier while the user was elsewhere in the wallet.
 * That is the intended reading — nothing about Buy was warm at that point.
 */

let currentContext: RampsBuyLifecycleContext =
  RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS;
let hasEnteredForegroundOnce = false;
let subscription: { remove: () => void } | undefined;

/** Update context from an AppState transition. Exported for tests. */
export function handleRampsBuyAppStateChange(
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
    currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
  }
  hasEnteredForegroundOnce = true;
}

/** Mark the current foreground's first Buy span done; later spans read warm. */
export function markRampsBuyForegroundSettled(): void {
  currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.WARM;
}

/**
 * Spans whose success means the user has seen Buy content this foreground.
 * A screen load covers ordinary navigation; the journey covers a resume where
 * a Buy screen stayed mounted and so no screen span completes again.
 */
const FOREGROUND_SETTLING_SPANS: ReadonlySet<TraceName> = new Set([
  TraceName.RampScreenLoad,
  TraceName.RampBuyToOrderDetails,
]);

/** Settle the foreground when a Buy span completes successfully. */
export function settleRampsBuyForegroundOnSpan(name: TraceName): void {
  if (FOREGROUND_SETTLING_SPANS.has(name)) {
    markRampsBuyForegroundSettled();
  }
}

/**
 * Subscribe to AppState so `background_resume` is detected. Idempotent, and
 * armed lazily by the first Buy span rather than by an app-level provider.
 */
export function initRampsBuyLifecycleTracking(): () => void {
  if (subscription) {
    return () => subscription?.remove();
  }
  let lastState = AppState.currentState;
  // Already foregrounded at init: no initial 'active' event will fire, so seed
  // the flag or the first real resume would read as the first foreground.
  if (lastState === 'active') {
    hasEnteredForegroundOnce = true;
  }
  subscription = AppState.addEventListener('change', (nextState) => {
    const previousState = lastState;
    lastState = nextState;
    handleRampsBuyAppStateChange(nextState, previousState);
  });
  return () => {
    subscription?.remove();
    subscription = undefined;
  };
}

export function getRampsBuyLifecycleContext(): RampsBuyLifecycleContext {
  initRampsBuyLifecycleTracking();
  return currentContext;
}

/** Test-only reset. */
export function resetRampsBuyLifecycleContextForTests(): void {
  currentContext = RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  subscription?.remove();
  subscription = undefined;
}
