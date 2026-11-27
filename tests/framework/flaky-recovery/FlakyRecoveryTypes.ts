import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator.ts';

/** Interaction / wait steps that can be recovered. Anything else is never retried. */
export type FlakyStepKind = 'tap' | 'wait' | 'scroll-to' | 'type';

export const FLAKY_STEP_KINDS: readonly FlakyStepKind[] = [
  'tap',
  'wait',
  'scroll-to',
  'type',
];

export interface FlakyStep {
  kind: FlakyStepKind;
  /** What the test was trying to do, e.g. the element description. */
  intent: string;
  /** testID / text / label of the control the step was aimed at, when readable. */
  targetDescriptors: string[];
  /** Message of the original failure. */
  errorMessage: string;
  /** True when the call site can re-run the step against another locator. */
  supportsAlternativeLocator: boolean;
}

/** Why the step failed, as diagnosed by the model. */
export type FlakyCause =
  | 'unexpected-overlay'
  | 'slow-to-appear'
  | 'needs-scroll'
  | 'keyboard-covering'
  | 'stale-locator';

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/** The single corrective action the model proposes. */
export type FlakyFix =
  | {
      type: 'dismiss-overlay';
      locator: RecoveredLocator;
      label?: string;
    }
  | { type: 'wait'; waitMs: number }
  | { type: 'scroll'; direction: ScrollDirection; times: number }
  | { type: 'hide-keyboard' }
  | {
      type: 'alternative-locator';
      locator: RecoveredLocator;
      label?: string;
      equivalence: string;
    };

export type FlakyFixType = FlakyFix['type'];

export interface FlakyDiagnosis {
  classification: 'recoverable' | 'real-failure';
  cause?: FlakyCause;
  reason: string;
  /** One sentence describing what the fix does, for the report. */
  solution?: string;
  fix?: FlakyFix;
}

export interface FlakyDiagnosisContext {
  step: FlakyStep;
  pageSource: string;
  /** Base64 PNG of the screen at failure time. */
  screenshotBase64: string;
}

export interface FlakyRecoveryProvider {
  /** Returns null when the model gave no usable answer. */
  diagnose(context: FlakyDiagnosisContext): Promise<FlakyDiagnosis | null>;
}

/** Device actions the non-overlay fixes need; injectable for unit tests. */
export interface FlakyFixExecutor {
  takeScreenshot(): Promise<string>;
  scroll(direction: ScrollDirection, times: number): Promise<void>;
  hideKeyboard(): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export type FlakyFixSource = 'registry' | 'ai';

/** What was applied before the step was retried. */
export interface AppliedFlakyFix {
  source: FlakyFixSource;
  cause: FlakyCause;
  reason: string;
  solution: string;
  /** Registry screen name or AI-proposed fix. */
  fix:
    | FlakyFix
    | { type: 'registry-dismiss'; screen: string; locator: RecoveredLocator };
  screenshotBeforeBase64?: string;
  /** Wall time of diagnosis plus fix, excluding the retry. */
  durationMs: number;
}

export interface FlakyRecoveryRecord {
  schemaVersion: 1;
  test: { title: string; file: string; retry: number };
  recoveryIndex: number;
  step: Pick<FlakyStep, 'kind' | 'intent' | 'targetDescriptors'>;
  originalError: string;
  source: FlakyFixSource;
  cause: FlakyCause;
  reason: string;
  solution: string;
  fix: AppliedFlakyFix['fix'];
  durationMs: number;
  recoveredAt: string;
  screenshots: { before?: string; after?: string };
}

export interface FlakyRecoveryScreenshots {
  beforeBase64?: string;
  afterBase64?: string;
}

export function describeLocator(locator: RecoveredLocator): string {
  return `${locator.strategy}=${locator.value}`;
}
