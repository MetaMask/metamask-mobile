import { AppStateEventProcessor } from '../AppStateEventListener';
import type { CredentialReadTimings } from '../SecureKeychain';
import { getPerformanceTimestampOffset } from '../../util/trace';
import {
  cancelHomepageReadyTrace,
  startHomepageReadyTrace,
  type HomepageReadyTraceToken,
} from './HomepageReady';
import {
  cancelDeeplinkNavigatedTrace,
  startDeeplinkNavigatedTrace,
  type DeeplinkPerfAppStartType,
  type DeeplinkTraceToken,
} from './DeeplinkPerformance';
import {
  beginHomepageReadyStages,
  recordHomepageReadyStage,
} from './homepageReadyStages';
import { getStartupKind, noteStartupHandBack } from './startupStageSpans';

/**
 * The moment `unlockWallet` has a password for the wallet. Time before it can
 * be the user (typing, an OS prompt); time after it is app work.
 */
export type UnlockHandBack =
  | {
      source: 'typed';
      /** `performance.now()` at submit. Defaults to `unlockWallet` entry. */
      submittedAt?: number;
    }
  | {
      source: 'keychain';
      credentialReadTimings: CredentialReadTimings;
    };

export interface UnlockTraceTokens {
  homepageReadyTraceToken: HomepageReadyTraceToken | null;
  deeplinkNavigatedTraceToken: DeeplinkTraceToken | null;
}

interface StartUnlockTracesOptions {
  handBack: UnlockHandBack;
  /** `performance.now()` at `unlockWallet` entry. */
  unlockEnteredAt: number;
  /**
   * Rehydration restores a wallet onto a new device. That is onboarding
   * rather than a return to Home, so it gets no Homepage Ready.
   */
  existingUser: boolean;
  /** `onBeforeNavigate` can show an OS prompt; its samples are tagged so they can be excluded. */
  beforeNavigate: boolean;
}

/**
 * Captured at hand-back so `resolve` and leftover `parse` stamp the type of
 * the unlock that started them.
 */
let unlockAppStartType: DeeplinkPerfAppStartType | undefined;

/**
 * Pending URL at hand-back. `dispatchLogin` fires `SET_COMPLETED_ONBOARDING`,
 * and outside the login and lock screens that saga copies then clears
 * `AppStateEventProcessor.pendingDeeplink` before navigation and before
 * metrics opt-in. Keep a copy so Navigated can restart after consent without
 * measuring the opt-in dwell, and so Homepage Ready knows the launch was
 * diverted.
 */
let unlockPendingDeeplink: string | null = null;

let hasUnlockedInProcess = false;
let unlockHomepageReadyTraceToken: HomepageReadyTraceToken | null = null;

/** The first successful unlock in this JS runtime is cold; later ones are warm. */
const getProcessAppStartType = (): DeeplinkPerfAppStartType =>
  hasUnlockedInProcess ? 'warm' : 'cold';

export const rememberUnlockAppStartType = (
  appStartType: DeeplinkPerfAppStartType,
) => {
  unlockAppStartType = appStartType;
};

export const getUnlockAppStartType = (): DeeplinkPerfAppStartType =>
  unlockAppStartType ?? getProcessAppStartType();

export const clearUnlockAppStartType = () => {
  unlockAppStartType = undefined;
};

/** Marks the end of a successful unlock, so later unlocks read as warm. */
export const markUnlockCompleted = () => {
  hasUnlockedInProcess = true;
};

export const resetUnlockTracesForTesting = () => {
  unlockAppStartType = undefined;
  unlockPendingDeeplink = null;
  hasUnlockedInProcess = false;
  unlockHomepageReadyTraceToken = null;
};

const getHandBackMark = (
  handBack: UnlockHandBack,
  unlockEnteredAt: number,
): number =>
  (handBack.source === 'keychain'
    ? handBack.credentialReadTimings.returnedAt
    : handBack.submittedAt) ?? unlockEnteredAt;

/**
 * Starts the unlock-anchored CUFs at hand-back, from `unlockWallet`, so every
 * unlock path is covered:
 * - **HomepageReady** (Leg 2): for existing users, with its stages
 * - **DeeplinkNavigated**: only when a pending deeplink will divert the launch
 *
 * Both are backdated to the hand-back, so neither includes the prompt or the
 * typing before it.
 */
export const startUnlockTraces = ({
  handBack,
  unlockEnteredAt,
  existingUser,
  beforeNavigate,
}: StartUnlockTracesOptions): UnlockTraceTokens => {
  const offset = getPerformanceTimestampOffset();
  const handBackAt = getHandBackMark(handBack, unlockEnteredAt);
  const startTime = handBackAt + offset;
  const appStartType = getProcessAppStartType();
  rememberUnlockAppStartType(appStartType);
  const pendingDeeplink = AppStateEventProcessor.pendingDeeplink;
  unlockPendingDeeplink = pendingDeeplink;

  const tags: Record<string, string | boolean> = {
    'unlock.before_navigate': beforeNavigate,
    ...(appStartType === 'cold' ? { 'startup.kind': getStartupKind() } : {}),
  };
  const homepageReadyTraceToken = existingUser
    ? startHomepageReadyTrace({
        source: 'unlock',
        appStartType,
        startTime,
        tags,
      })
    : null;
  unlockHomepageReadyTraceToken = homepageReadyTraceToken;
  if (homepageReadyTraceToken !== null) {
    beginHomepageReadyStages({
      traceToken: homepageReadyTraceToken,
      offset,
      handBackAt,
      tags: { ...tags, start_source: 'unlock', app_start_type: appStartType },
    });
    if (handBack.source === 'keychain') {
      recordHomepageReadyStage(
        'credential_decrypt',
        handBackAt,
        handBack.credentialReadTimings.decryptedAt,
      );
    } else if (handBack.submittedAt !== undefined) {
      recordHomepageReadyStage('submit_to_unlock', handBackAt, unlockEnteredAt);
    }
  }
  noteStartupHandBack(handBackAt, {
    leg2Started: homepageReadyTraceToken !== null,
    leg2InFlight: homepageReadyTraceToken !== null,
  });

  return {
    homepageReadyTraceToken,
    deeplinkNavigatedTraceToken:
      pendingDeeplink === null
        ? null
        : startDeeplinkNavigatedTrace({
            url: pendingDeeplink,
            source: 'unlock',
            appStartType,
            startTime,
          }),
  };
};

/**
 * Reopens Deeplink Navigated after metrics opt-in. Hand-back started the
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
 * Cancels this unlock's Homepage Ready when a deeplink will take the launch
 * somewhere other than Home. Deeplink Navigated measures those launches.
 */
export const cancelUnlockHomepageReadyForDeeplink = () => {
  if (!unlockPendingDeeplink && !AppStateEventProcessor.pendingDeeplink) {
    return;
  }
  cancelHomepageReadyTrace({
    reason: 'deeplink',
    traceToken: unlockHomepageReadyTraceToken,
  });
};

/**
 * Cancels whatever {@link startUnlockTraces} opened after a failed unlock,
 * so a retry starts from its own hand-back rather than inheriting time from
 * the failed attempt.
 */
export const cancelUnlockTraces = ({
  homepageReadyTraceToken,
  deeplinkNavigatedTraceToken,
}: UnlockTraceTokens) => {
  clearUnlockAppStartType();
  unlockPendingDeeplink = null;
  unlockHomepageReadyTraceToken = null;
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
