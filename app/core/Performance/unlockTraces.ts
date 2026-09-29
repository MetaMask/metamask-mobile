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

/**
 * Unlock marks converted to the trace clock with the offset read when Leg 2
 * started, so child spans line up with its start.
 */
export interface UnlockHandBackTimestamps {
  source: UnlockHandBack['source'];
  handBackAt: number;
  unlockEnteredAt: number;
  credentialDecryptedAt?: number;
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
let hasStartedLeg2InProcess = false;
let unlockHomepageReadyTraceToken: HomepageReadyTraceToken | null = null;
let unlockHandBackTimestamps: UnlockHandBackTimestamps | null = null;

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

/**
 * Whether an unlock in this JS runtime has started Homepage Ready. An
 * unlocked keyring without it means an unlock path skipped the hand-back.
 */
export const wasLeg2StartedThisProcess = () => hasStartedLeg2InProcess;

/** Hand-back marks of the latest unlock that started Homepage Ready. */
export const getUnlockHandBackTimestamps = () => unlockHandBackTimestamps;

export const resetUnlockTracesForTesting = () => {
  unlockAppStartType = undefined;
  unlockPendingDeeplink = null;
  hasUnlockedInProcess = false;
  hasStartedLeg2InProcess = false;
  unlockHomepageReadyTraceToken = null;
  unlockHandBackTimestamps = null;
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
 * - **HomepageReady** (Leg 2): for existing users
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
  const startTime = getHandBackMark(handBack, unlockEnteredAt) + offset;
  const appStartType = getProcessAppStartType();
  rememberUnlockAppStartType(appStartType);
  const pendingDeeplink = AppStateEventProcessor.pendingDeeplink;
  unlockPendingDeeplink = pendingDeeplink;

  const homepageReadyTraceToken = existingUser
    ? startHomepageReadyTrace({
        source: 'unlock',
        appStartType,
        startTime,
        tags: { 'unlock.before_navigate': beforeNavigate },
      })
    : null;
  unlockHomepageReadyTraceToken = homepageReadyTraceToken;
  unlockHandBackTimestamps = null;
  if (homepageReadyTraceToken !== null) {
    hasStartedLeg2InProcess = true;
    const decryptedAt =
      handBack.source === 'keychain'
        ? handBack.credentialReadTimings.decryptedAt
        : undefined;
    unlockHandBackTimestamps = {
      source: handBack.source,
      handBackAt: startTime,
      unlockEnteredAt: unlockEnteredAt + offset,
      ...(decryptedAt === undefined
        ? {}
        : { credentialDecryptedAt: decryptedAt + offset }),
    };
  }

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
  unlockHandBackTimestamps = null;
  cancelHomepageReadyTrace({
    reason: 'unlock_failed',
    traceToken: homepageReadyTraceToken,
  });
  cancelDeeplinkNavigatedTrace({
    reason: 'unlock_failed',
    traceToken: deeplinkNavigatedTraceToken,
  });
};
