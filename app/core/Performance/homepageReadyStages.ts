import performance from 'react-native-performance';
import {
  endTrace,
  getCachedConsent,
  getTraceContext,
  trace,
  TraceName,
  TraceOperation,
} from '../../util/trace';
import Logger from '../../util/Logger';

/**
 * Times the app work inside an unlock's Homepage Ready, from the hand-back to
 * usable homepage content, and adds one child span per stage when it ends.
 * The stages are defined in docs/performance/startup-telemetry.md.
 *
 * Marks are raw `performance.now()` values, converted with the offset read
 * when Homepage Ready started so the children line up with its start.
 */

export type HomepageReadyStage =
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

const STAGES: readonly HomepageReadyStage[] = [
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

const STAGE_TRACE_ID = 'homepage_ready';

let stageTraceNames: Record<HomepageReadyStage, TraceName> | undefined;

// Built on first use: tests that partially mock `util/trace` import this file.
const getStageTraceName = (stage: HomepageReadyStage): TraceName => {
  stageTraceNames ??= {
    submit_to_unlock: TraceName.HomepageReadySubmitToUnlock,
    credential_decrypt: TraceName.HomepageReadyCredentialDecrypt,
    seedless_rehydrate: TraceName.HomepageReadySeedlessRehydrate,
    seedless_password_check: TraceName.HomepageReadySeedlessPasswordCheck,
    seedless_password_sync: TraceName.HomepageReadySeedlessPasswordSync,
    vault_unlock: TraceName.HomepageReadyVaultUnlock,
    unlock_finalize: TraceName.HomepageReadyUnlockFinalize,
    before_navigate: TraceName.HomepageReadyBeforeNavigate,
    home_visible: TraceName.HomepageReadyHomeVisible,
    homepage_content: TraceName.HomepageReadyHomepageContent,
  };
  return stageTraceNames[stage];
};

interface StageInterval {
  start: number;
  end: number;
}

interface StagesLedger {
  traceToken: number;
  offset: number;
  handBackAt: number;
  tags: Record<string, string | boolean>;
  stages: Partial<Record<HomepageReadyStage, StageInterval>>;
  navigateAt?: number;
  homeFocusedAt?: number;
}

export interface BeginHomepageReadyStagesOptions {
  traceToken: number;
  /** `getPerformanceTimestampOffset()` read when Homepage Ready started. */
  offset: number;
  /** `performance.now()` at the hand-back, where Homepage Ready starts. */
  handBackAt: number;
  /** Copied onto every stage, so stages split the same way as their parent. */
  tags: Record<string, string | boolean>;
}

export interface HomepageReadyStagesSummary {
  /** End of Homepage Ready, on the clock its children use. */
  timestamp: number;
  data: Record<string, number>;
}

let ledger: StagesLedger | null = null;

const noop = () => undefined;

const safely = (run: () => void) => {
  try {
    run();
  } catch (error) {
    Logger.error(error as Error, 'Homepage Ready stages failed');
  }
};

export const beginHomepageReadyStages = (
  options: BeginHomepageReadyStagesOptions,
) =>
  safely(() => {
    ledger = { ...options, stages: {} };
  });

/** Records a stage from `performance.now()` marks taken elsewhere. The first record wins. */
export const recordHomepageReadyStage = (
  stage: HomepageReadyStage,
  start: number | undefined,
  end: number | undefined,
) =>
  safely(() => {
    if (
      !ledger ||
      ledger.stages[stage] ||
      start === undefined ||
      end === undefined ||
      end < start
    ) {
      return;
    }
    ledger.stages[stage] = { start, end };
  });

/**
 * Starts timing a stage of the in-flight unlock's Homepage Ready.
 *
 * @returns Stops the timer. Does nothing once that Homepage Ready has ended.
 */
export const startHomepageReadyStage = (
  stage: HomepageReadyStage,
): (() => void) => {
  const current = ledger;
  if (!current) {
    return noop;
  }
  const start = performance.now();
  return () =>
    safely(() => {
      if (current === ledger && !current.stages[stage]) {
        current.stages[stage] = { start, end: performance.now() };
      }
    });
};

/** The unlock is about to navigate to the homepage. */
export const markHomepageReadyNavigate = () =>
  safely(() => {
    if (ledger) {
      ledger.navigateAt ??= performance.now();
    }
  });

/** The homepage committed while focused. Only counts after the unlock navigated. */
export const markHomepageReadyHomeFocused = () =>
  safely(() => {
    if (ledger?.navigateAt !== undefined) {
      ledger.homeFocusedAt ??= performance.now();
    }
  });

const emitStageSpans = (
  { offset, tags }: StagesLedger,
  intervals: Partial<Record<HomepageReadyStage, StageInterval>>,
) => {
  if (getCachedConsent() !== true) {
    return;
  }
  const parentContext = getTraceContext({ name: TraceName.HomepageReady });
  if (!parentContext) {
    return;
  }
  for (const stage of STAGES) {
    const interval = intervals[stage];
    if (!interval) {
      continue;
    }
    const name = getStageTraceName(stage);
    trace({
      name,
      op: TraceOperation.HomepageReadyStage,
      id: STAGE_TRACE_ID,
      parentContext,
      startTime: interval.start + offset,
      tags,
    });
    endTrace({ name, id: STAGE_TRACE_ID, timestamp: interval.end + offset });
  }
};

/**
 * Adds the stages as children of the unlock's Homepage Ready. Call it just
 * before ending that trace, and end it at the returned timestamp so no child
 * outlives it.
 *
 * @param traceToken - Token of the Homepage Ready that is ending.
 * @returns Undefined when an unlock did not start that trace.
 */
export const finishHomepageReadyStages = (
  traceToken: number | null,
): HomepageReadyStagesSummary | undefined => {
  const current = ledger;
  ledger = null;
  if (current?.traceToken !== traceToken) {
    return undefined;
  }
  try {
    const endAt = performance.now();
    const intervals = { ...current.stages };
    const { navigateAt, homeFocusedAt } = current;
    if (navigateAt !== undefined && homeFocusedAt !== undefined) {
      intervals.home_visible = { start: navigateAt, end: homeFocusedAt };
    }
    if (homeFocusedAt !== undefined) {
      intervals.homepage_content = { start: homeFocusedAt, end: endAt };
    }
    const data: Record<string, number> = {};
    let attributedMs = 0;
    for (const stage of STAGES) {
      const interval = intervals[stage];
      if (interval) {
        const durationMs = interval.end - interval.start;
        data[`homepage.stage.${stage}_ms`] = Math.round(durationMs);
        attributedMs += durationMs;
      }
    }
    data['homepage.unattributed_ms'] = Math.round(
      endAt - current.handBackAt - attributedMs,
    );
    emitStageSpans(current, intervals);
    return { timestamp: endAt + current.offset, data };
  } catch (error) {
    Logger.error(error as Error, 'Homepage Ready stages failed');
    return undefined;
  }
};

export const discardHomepageReadyStages = () => {
  ledger = null;
};
