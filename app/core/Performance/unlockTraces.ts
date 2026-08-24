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

export interface UnlockTraceTokens {
  homepageReadyTraceToken: HomepageReadyTraceToken | null;
  deeplinkNavigatedTraceToken: DeeplinkTraceToken | null;
}

/**
 * Captured at unlock submit — before Login flips `getLoginAppStartType()` to
 * warm — so `resolve` and leftover `parse` can stamp the real process type.
 */
let unlockAppStartType: DeeplinkPerfAppStartType | undefined;

export const rememberUnlockAppStartType = (
  appStartType: DeeplinkPerfAppStartType,
) => {
  unlockAppStartType = appStartType;
};

export const getUnlockAppStartType = (): DeeplinkPerfAppStartType =>
  unlockAppStartType ?? getLoginAppStartType();

export const clearUnlockAppStartType = () => {
  unlockAppStartType = undefined;
};

export const resetUnlockAppStartTypeForTesting = () => {
  unlockAppStartType = undefined;
};

/**
 * Starts the unlock-anchored CUFs from a single seam:
 * - **HomepageReady** — always started
 * - **DeeplinkNavigated** — only when a pending deeplink will divert the launch
 *
 * Every unlock entry point (password, biometric, OAuth rehydration) calls this
 * pair instead of repeating the start/cancel blocks per trace.
 */
export const startUnlockTraces = ({
  appStartType,
}: {
  appStartType: HomepageReadyAppStartType;
}): UnlockTraceTokens => {
  rememberUnlockAppStartType(appStartType);
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
 * Cancels whatever {@link startUnlockTraces} opened after a failed unlock,
 * so a retry starts from its own submit rather than inheriting time from the
 * failed attempt.
 */
export const cancelUnlockTraces = ({
  homepageReadyTraceToken,
  deeplinkNavigatedTraceToken,
}: UnlockTraceTokens) => {
  clearUnlockAppStartType();
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
