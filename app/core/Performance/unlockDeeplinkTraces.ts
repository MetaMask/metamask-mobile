import { AppStateEventProcessor } from '../AppStateEventListener';
import { getLoginAppStartType } from '../../components/Views/Login/loginPerformanceTags';
import {
  cancelHomepageReadyTrace,
  startHomepageReadyTrace,
  type HomepageReadyAppStartType,
  type HomepageReadyTraceToken,
} from './HomepageReady';
import {
  cancelDeeplinkNavigatedTrace,
  startDeeplinkNavigatedTrace,
  type DeeplinkPerfAppStartType,
  type DeeplinkTraceToken,
} from './DeeplinkPerformance';

export interface UnlockDeeplinkTraceTokens {
  homepageReadyTraceToken: HomepageReadyTraceToken | null;
  deeplinkNavigatedTraceToken: DeeplinkTraceToken | null;
}

/**
 * Captured at unlock submit — before Login flips `getLoginAppStartType()` to
 * warm — so `resolve` and leftover `parse` can stamp the real process type.
 */
let unlockAppStartType: DeeplinkPerfAppStartType | undefined;

export const rememberUnlockDeeplinkAppStartType = (
  appStartType: DeeplinkPerfAppStartType,
) => {
  unlockAppStartType = appStartType;
};

export const getUnlockDeeplinkAppStartType = (): DeeplinkPerfAppStartType =>
  unlockAppStartType ?? getLoginAppStartType();

export const clearUnlockDeeplinkAppStartType = () => {
  unlockAppStartType = undefined;
};

export const resetUnlockDeeplinkAppStartTypeForTesting = () => {
  unlockAppStartType = undefined;
};

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
  rememberUnlockDeeplinkAppStartType(appStartType);
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
  clearUnlockDeeplinkAppStartType();
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
