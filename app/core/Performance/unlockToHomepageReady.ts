import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import performance from 'react-native-performance';
import {
  endTrace,
  getCachedConsent,
  getPerformanceTimestampOffset,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../util/trace';
import Logger from '../../util/Logger';
import { AppStateEventProcessor } from '../AppStateEventListener';
import type { CredentialReadTimings } from '../SecureKeychain';
import type { HomepageReadyContentState } from './HomepageReady';
import {
  getStartupKind,
  noteStartupHandBack,
  noteStartupLeg2Ended,
} from './startupStageSpans';

/**
 * Records an unlock from the moment it has its password (the hand-back) until
 * the homepage shows usable content, and sends it as `Unlock To Homepage Ready`
 * with one child span per stage. The stages are defined in
 * docs/performance/startup-telemetry.md.
 *
 * Every call is synchronous and never throws. The spans are built from
 * `performance.now()` marks once the homepage is ready, right after
 * `Homepage Ready` ends, so no transaction starts while that one runs. An
 * unlock that waits on something other than the app is dropped, not sent.
 */

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

export type UnlockStage =
  | 'submit_to_unlock'
  | 'credential_decrypt'
  | 'seedless_rehydrate'
  | 'seedless_password_check'
  | 'seedless_password_sync'
  | 'vault_unlock'
  | 'unlock_finalize'
  | 'before_navigate'
  | 'home_visible'
  | 'homepage_content';

export type UnlockDropReason =
  | 'unlock_failed'
  | 'metrics_opt_in'
  | 'deeplink'
  | 'backgrounded'
  | 'navigated_away'
  | 'replaced';

export type UnlockToHomepageReadyToken = number;

const STAGES: readonly UnlockStage[] = [
  'submit_to_unlock',
  'credential_decrypt',
  'seedless_rehydrate',
  'seedless_password_check',
  'seedless_password_sync',
  'vault_unlock',
  'unlock_finalize',
  'before_navigate',
  'home_visible',
  'homepage_content',
];

const TRACE_ID = 'unlock';

let stageTraceNames: Record<UnlockStage, TraceName> | undefined;

// Built on first use: tests that partially mock `util/trace` import this file.
const getStageTraceName = (stage: UnlockStage): TraceName => {
  stageTraceNames ??= {
    submit_to_unlock: TraceName.UnlockSubmitToUnlock,
    credential_decrypt: TraceName.UnlockCredentialDecrypt,
    seedless_rehydrate: TraceName.UnlockSeedlessRehydrate,
    seedless_password_check: TraceName.UnlockSeedlessPasswordCheck,
    seedless_password_sync: TraceName.UnlockSeedlessPasswordSync,
    vault_unlock: TraceName.UnlockVaultUnlock,
    unlock_finalize: TraceName.UnlockFinalize,
    before_navigate: TraceName.UnlockBeforeNavigate,
    home_visible: TraceName.UnlockHomeVisible,
    homepage_content: TraceName.UnlockHomepageContent,
  };
  return stageTraceNames[stage];
};

interface StageInterval {
  start: number;
  end: number;
}

interface UnlockLedger {
  token: UnlockToHomepageReadyToken;
  handBackAt: number;
  /** Copied onto every stage, so stages split the same way as their parent. */
  tags: Record<string, string | boolean>;
  /**
   * `dispatchLogin` can hand the pending deeplink to `handleDeeplinkSaga`,
   * which clears it before navigation, so keep the one pending at hand-back.
   */
  pendingDeeplink: string | null;
  stages: Partial<Record<UnlockStage, StageInterval>>;
  navigateAt?: number;
  homeFocusedAt?: number;
}

interface EmittedStage extends StageInterval {
  stage: UnlockStage;
}

interface UnlockPayload {
  handBackAt: number;
  endAt: number;
  tags: Record<string, string | boolean>;
  data: Record<string, TraceValue>;
  stages: EmittedStage[];
}

export interface StartUnlockToHomepageReadyOptions {
  handBack: UnlockHandBack;
  /** `performance.now()` at `unlockWallet` entry. */
  unlockEnteredAt: number;
  /**
   * Rehydrating a wallet onto a new device is onboarding rather than a
   * return to the homepage, so it is not recorded.
   */
  existingUser: boolean;
  /**
   * `onBeforeNavigate` can show an OS prompt, so its samples are tagged to
   * be excluded.
   */
  beforeNavigate: boolean;
}

let ledger: UnlockLedger | null = null;
let nextToken = 0;
let hasUnlockedInProcess = false;
let appStateSubscription: NativeEventSubscription | undefined;

const noop = () => undefined;

const safely = (run: () => void) => {
  try {
    run();
  } catch (error) {
    Logger.error(error as Error, 'Unlock To Homepage Ready failed');
  }
};

const round = (value: number) => Math.round(value);

const getHandBackMark = (
  handBack: UnlockHandBack,
  unlockEnteredAt: number,
): number =>
  (handBack.source === 'keychain'
    ? handBack.credentialReadTimings.returnedAt
    : handBack.submittedAt) ?? unlockEnteredAt;

const addStage = (
  current: UnlockLedger,
  stage: UnlockStage,
  start: number | undefined,
  end: number | undefined,
) => {
  if (
    current.stages[stage] ||
    start === undefined ||
    end === undefined ||
    end < start
  ) {
    return;
  }
  current.stages[stage] = { start, end };
};

/** Ends the in-flight unlock, so the startup recorder stops waiting on it. */
const release = () => {
  ledger = null;
  appStateSubscription?.remove();
  appStateSubscription = undefined;
  noteStartupLeg2Ended();
};

const drop = (reason: UnlockDropReason) => {
  if (!ledger) {
    return;
  }
  release();
  if (__DEV__) {
    Logger.log(
      `[unlock] ${TraceName.UnlockToHomepageReady} dropped: ${reason}`,
    );
  }
};

const onAppStateChange = (nextAppState: AppStateStatus) =>
  safely(() => {
    if (nextAppState === 'background') {
      drop('backgrounded');
    }
  });

/**
 * Starts recording an unlock at its hand-back, from `unlockWallet`, so every
 * unlock path is covered. The first unlock in this JS runtime is cold; later
 * ones are warm.
 *
 * @returns The token to drop this unlock with, or null when it is not recorded.
 */
export const startUnlockToHomepageReady = ({
  handBack,
  unlockEnteredAt,
  existingUser,
  beforeNavigate,
}: StartUnlockToHomepageReadyOptions): UnlockToHomepageReadyToken | null => {
  try {
    const handBackAt = getHandBackMark(handBack, unlockEnteredAt);
    drop('replaced');
    if (!existingUser) {
      noteStartupHandBack(handBackAt, {
        leg2Started: false,
        leg2InFlight: false,
      });
      return null;
    }
    const appStartType = hasUnlockedInProcess ? 'warm' : 'cold';
    nextToken += 1;
    const current: UnlockLedger = {
      token: nextToken,
      handBackAt,
      tags: {
        app_start_type: appStartType,
        'unlock.before_navigate': beforeNavigate,
        ...(appStartType === 'cold'
          ? { 'startup.kind': getStartupKind() }
          : {}),
      },
      pendingDeeplink: AppStateEventProcessor.pendingDeeplink,
      stages: {},
    };
    if (handBack.source === 'keychain') {
      addStage(
        current,
        'credential_decrypt',
        handBackAt,
        handBack.credentialReadTimings.decryptedAt,
      );
    } else if (handBack.submittedAt !== undefined) {
      addStage(current, 'submit_to_unlock', handBackAt, unlockEnteredAt);
    }
    ledger = current;
    appStateSubscription = AppState.addEventListener(
      'change',
      onAppStateChange,
    );
    noteStartupHandBack(handBackAt, { leg2Started: true, leg2InFlight: true });
    return current.token;
  } catch (error) {
    Logger.error(error as Error, 'Unlock To Homepage Ready failed');
    return null;
  }
};

/**
 * Records a stage of the in-flight unlock from `performance.now()` marks
 * taken elsewhere. The first record wins.
 */
export const recordUnlockStage = (
  stage: UnlockStage,
  start: number | undefined,
  end: number | undefined,
) =>
  safely(() => {
    if (ledger) {
      addStage(ledger, stage, start, end);
    }
  });

/**
 * Starts timing a stage of the in-flight unlock.
 *
 * @returns Stops the timer. Does nothing once that unlock was sent or dropped.
 */
export const startUnlockStage = (stage: UnlockStage): (() => void) => {
  const current = ledger;
  if (!current) {
    return noop;
  }
  const start = performance.now();
  return () =>
    safely(() => {
      if (current === ledger) {
        addStage(current, stage, start, performance.now());
      }
    });
};

/** The unlock is about to navigate, to the metrics opt-in or the homepage. */
export const markUnlockNavigate = () =>
  safely(() => {
    if (ledger) {
      ledger.navigateAt ??= performance.now();
    }
  });

/**
 * The homepage committed while focused. Only counts after the unlock navigated.
 *
 * @returns The token of the unlock it counted for, to drop if the homepage
 * loses focus before its content is usable.
 */
export const markUnlockHomeFocused = (): UnlockToHomepageReadyToken | null => {
  try {
    if (ledger?.navigateAt === undefined) {
      return null;
    }
    ledger.homeFocusedAt ??= performance.now();
    return ledger.token;
  } catch (error) {
    Logger.error(error as Error, 'Unlock To Homepage Ready failed');
    return null;
  }
};

/** Drops the unlock `token` belongs to, if it is still in flight. */
export const dropUnlockToHomepageReady = (
  reason: UnlockDropReason,
  token: UnlockToHomepageReadyToken | null,
) =>
  safely(() => {
    if (token !== null && ledger?.token === token) {
      drop(reason);
    }
  });

/**
 * Drops the in-flight unlock when a deeplink will take the launch somewhere
 * other than the homepage. `Deeplink Navigated` measures those launches.
 */
export const dropUnlockToHomepageReadyForDeeplink = () =>
  safely(() => {
    if (ledger?.pendingDeeplink || AppStateEventProcessor.pendingDeeplink) {
      drop('deeplink');
    }
  });

/** Marks the end of a successful unlock, so later unlocks in this JS runtime are warm. */
export const markUnlockCompleted = () => {
  hasUnlockedInProcess = true;
};

const buildPayload = (
  { handBackAt, tags, stages: recorded }: UnlockLedger,
  navigateAt: number,
  homeFocusedAt: number,
  endAt: number,
  contentState: HomepageReadyContentState,
): UnlockPayload => {
  const intervals: Partial<Record<UnlockStage, StageInterval>> = {
    ...recorded,
    home_visible: { start: navigateAt, end: homeFocusedAt },
    homepage_content: { start: homeFocusedAt, end: endAt },
  };
  const stages: EmittedStage[] = [];
  const data: Record<string, TraceValue> = {
    success: contentState !== 'error',
    content_state: contentState,
    'unlock.duration_ms': round(endAt - handBackAt),
  };
  let attributedMs = 0;
  for (const stage of STAGES) {
    const interval = intervals[stage];
    if (interval) {
      stages.push({ stage, ...interval });
      data[`unlock.stage.${stage}_ms`] = round(interval.end - interval.start);
      attributedMs += interval.end - interval.start;
    }
  }
  data['unlock.unattributed_ms'] = round(endAt - handBackAt - attributedMs);
  return { handBackAt, endAt, tags, data, stages };
};

/** Prints the stages in dev builds, so a local change can be checked without Sentry. */
const logSummary = ({ tags, data, stages }: UnlockPayload) => {
  if (!__DEV__) {
    return;
  }
  const lines = [
    `[unlock] ${TraceName.UnlockToHomepageReady}: ${data['unlock.duration_ms']}ms (app_start_type: ${tags.app_start_type}, content: ${data.content_state})`,
    ...stages.map(
      ({ stage, start, end }) => `  ${stage}: ${round(end - start)}ms`,
    ),
    `  unattributed: ${data['unlock.unattributed_ms']}ms`,
  ];
  Logger.log(lines.join('\n'));
};

const emitPayload = ({
  handBackAt,
  endAt,
  tags,
  data,
  stages,
}: UnlockPayload) => {
  const offset = getPerformanceTimestampOffset();
  const rootName = TraceName.UnlockToHomepageReady;
  const rootSpan = trace({
    name: rootName,
    op: TraceOperation.UnlockHomepageReady,
    id: TRACE_ID,
    forceTransaction: true,
    startTime: handBackAt + offset,
    tags,
    data,
  });
  if (rootSpan) {
    for (const { stage, start, end } of stages) {
      const name = getStageTraceName(stage);
      trace({
        name,
        op: TraceOperation.UnlockStage,
        id: TRACE_ID,
        parentContext: rootSpan,
        startTime: start + offset,
        tags,
      });
      endTrace({ name, id: TRACE_ID, timestamp: end + offset });
    }
  }
  endTrace({ name: rootName, id: TRACE_ID, timestamp: endAt + offset });
};

/**
 * Sends the in-flight unlock once the homepage it navigated to shows usable
 * content. Call it right after `endHomepageReadyTrace`. Does nothing until the
 * unlock navigated and the homepage was focused after that.
 */
export const finishUnlockToHomepageReady = ({
  contentState,
}: {
  contentState: HomepageReadyContentState;
}) =>
  safely(() => {
    const current = ledger;
    if (
      current?.navigateAt === undefined ||
      current.homeFocusedAt === undefined
    ) {
      return;
    }
    release();
    const payload = buildPayload(
      current,
      current.navigateAt,
      current.homeFocusedAt,
      performance.now(),
      contentState,
    );
    logSummary(payload);
    // Spans started before consent is known are buffered without their parent.
    if (getCachedConsent() === true) {
      emitPayload(payload);
    }
  });

export const resetUnlockToHomepageReadyForTesting = () => {
  appStateSubscription?.remove();
  appStateSubscription = undefined;
  ledger = null;
  nextToken = 0;
  hasUnlockedInProcess = false;
};
