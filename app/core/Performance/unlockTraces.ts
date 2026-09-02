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

/**
 * Pending URL at unlock submit. `dispatchLogin` fires `SET_COMPLETED_ONBOARDING`,
 * and that saga copies then clears `AppStateEventProcessor.pendingDeeplink`
 * before metrics opt-in. Keep a copy so Navigated can restart after consent
 * without measuring the opt-in dwell.
 */
let unlockPendingDeeplink: string | null = null;

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
  unlockPendingDeeplink = null;
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
  unlockPendingDeeplink = pendingDeeplink;
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
 * Reopens Deeplink Navigated after metrics opt-in. Unlock submit started the
 * span, opt-in cancelled it so consent time is excluded, and
 * `handleDeeplinkSaga` has already cleared the live pending URL.
 */
export const resumeUnlockDeeplinkNavigatedAfterOptIn = ({
  appStartType,
}: {
  appStartType: DeeplinkPerfAppStartType;
}) => {
  rememberUnlockAppStartType(appStartType);
  if (unlockPendingDeeplink === null) {
    return;
  }
  startDeeplinkNavigatedTrace({
    url: unlockPendingDeeplink,
    source: 'unlock',
    appStartType,
  });
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
  unlockPendingDeeplink = null;
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
