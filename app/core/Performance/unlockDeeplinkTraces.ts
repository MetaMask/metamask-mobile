import { AppStateEventProcessor } from '../AppStateEventListener';
import {
  cancelHomepageReadyTrace,
  startHomepageReadyTrace,
  type HomepageReadyAppStartType,
  type HomepageReadyTraceToken,
} from './HomepageReady';
import {
  cancelDeeplinkNavigatedTrace,
  startDeeplinkNavigatedTrace,
  type DeeplinkTraceToken,
} from './DeeplinkPerformance';

export interface UnlockDeeplinkTraceTokens {
  homepageReadyTraceToken: HomepageReadyTraceToken | null;
  deeplinkNavigatedTraceToken: DeeplinkTraceToken | null;
}

/**
 * Starts the unlock-anchored CUFs from a single seam: Homepage Ready always,
 * Deeplink Navigated only when a pending deeplink will divert the launch.
 * Every unlock entry point (password, biometric, OAuth rehydration) calls this
 * pair instead of repeating the start/cancel blocks per trace.
 */
export const startUnlockDeeplinkTraces = ({
  appStartType,
}: {
  appStartType: HomepageReadyAppStartType;
}): UnlockDeeplinkTraceTokens => {
  const pendingDeeplink = AppStateEventProcessor.pendingDeeplink;
  return {
    homepageReadyTraceToken: startHomepageReadyTrace({
      source: 'unlock',
      appStartType,
    }),
    deeplinkNavigatedTraceToken:
      pendingDeeplink === null
        ? null
        : startDeeplinkNavigatedTrace({
            url: pendingDeeplink,
            source: 'unlock',
            appStartType,
          }),
  };
};

/**
 * Cancels whatever {@link startUnlockDeeplinkTraces} opened after a failed
 * unlock, so a retry starts from its own submit rather than inheriting time
 * from the failed attempt.
 */
export const cancelUnlockDeeplinkTraces = ({
  homepageReadyTraceToken,
  deeplinkNavigatedTraceToken,
}: UnlockDeeplinkTraceTokens) => {
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
