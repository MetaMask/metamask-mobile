import { AppState, type AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
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

export const PERPS_LIFECYCLE_DETAIL = {
  COLD_PROCESS: 'cold_process',
  WARM_FOREGROUND: 'warm_foreground',
  BACKGROUND_SHORT: 'background_short',
  BACKGROUND_RECONNECT: 'background_reconnect',
  NETWORK_RECOVERY: 'network_recovery',
  ACCOUNT_SWITCH: 'account_switch',
} as const;

export type PerpsLifecycleDetail =
  (typeof PERPS_LIFECYCLE_DETAIL)[keyof typeof PERPS_LIFECYCLE_DETAIL];

// Module load == process start.
let currentContext: PerpsLifecycleContext =
  PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS;
let currentDetail: PerpsLifecycleDetail = PERPS_LIFECYCLE_DETAIL.COLD_PROCESS;
let hasEnteredForegroundOnce = false;
let backgroundStartedAt: number | null = null;

/** Update context from an AppState transition. Exported for tests. */
export function handlePerpsAppStateChange(
  nextState: AppStateStatus,
  previousState: AppStateStatus,
  now = performance.now(),
): void {
  if (nextState === 'background' || nextState === 'inactive') {
    backgroundStartedAt ??= now;
    return;
  }

  if (nextState !== 'active') {
    return;
  }
  if (
    hasEnteredForegroundOnce &&
    (previousState === 'background' || previousState === 'inactive')
  ) {
    currentContext = PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME;
    const backgroundDurationMs =
      backgroundStartedAt === null
        ? PERPS_CONSTANTS.ConnectionGracePeriodMs
        : Math.max(0, now - backgroundStartedAt);
    currentDetail =
      backgroundDurationMs < PERPS_CONSTANTS.ConnectionGracePeriodMs
        ? PERPS_LIFECYCLE_DETAIL.BACKGROUND_SHORT
        : PERPS_LIFECYCLE_DETAIL.BACKGROUND_RECONNECT;
  }
  backgroundStartedAt = null;
  hasEnteredForegroundOnce = true;
}

/** Mark the current foreground's first flow done; later flows read as warm. */
export function markPerpsForegroundSettled(): void {
  currentContext = PERPS_LIFECYCLE_CONTEXT.WARM;
  currentDetail = PERPS_LIFECYCLE_DETAIL.WARM_FOREGROUND;
}

export function markPerpsNetworkRecovery(): void {
  currentDetail = PERPS_LIFECYCLE_DETAIL.NETWORK_RECOVERY;
}

export function markPerpsAccountSwitch(): void {
  currentDetail = PERPS_LIFECYCLE_DETAIL.ACCOUNT_SWITCH;
}

/**
 * Spans whose completion means the user has seen live Perps data this
 * foreground, so it is settled and later flows read as `warm`. The SINGLE
 * source of truth for the cold/resume→warm boundary across every path.
 *
 * Includes the entry-surface renders (Home, Market Details, Order — covers
 * deeplinks and homepage cards) AND the operation/reconnect confirmations. The
 * latter matter when the app resumes with a Perps screen already mounted: its
 * entry span already completed and cannot settle again, so without an operation
 * or reconnect completing the foreground, `background_resume` would stick and
 * every later operation would be mis-tagged. The reconnect (or first operation)
 * after a resume carries `background_resume`; everything after reads `warm`.
 */
const FOREGROUND_SETTLING_SPANS: ReadonlySet<TraceName> = new Set([
  TraceName.PerpsEntryToLiveMarketList,
  TraceName.PerpsMarketDetailLive,
  TraceName.PerpsTradePageRender,
  TraceName.PerpsPlaceOrderToPositionRendered,
  TraceName.PerpsPlaceLimitOrderToOrderRendered,
  TraceName.PerpsClosePositionToConfirmation,
  TraceName.PerpsCancelOrderToConfirmation,
  TraceName.PerpsUpdateTPSLToConfirmation,
  TraceName.PerpsWebSocketReconnectToFreshData,
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

export function getPerpsLifecycleDetail(): PerpsLifecycleDetail {
  return currentDetail;
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
  currentDetail = PERPS_LIFECYCLE_DETAIL.COLD_PROCESS;
  hasEnteredForegroundOnce = false;
  backgroundStartedAt = null;
  subscription?.remove();
  subscription = undefined;
}
