import type { RecoveredLocator } from '../ai-locator/SelfHealingLocator.ts';
import type { PlatformThreshold } from '../TimerHelper.ts';

export type ScenarioPlatform = 'android' | 'ios';

/** Shared flows the thin spec runs before the scenario steps. */
export type ScenarioPrecondition = 'logged-in';

export type ScenarioProfiling = 'hermes' | 'none';

export type StepParams = Record<string, string>;

interface ScenarioStepBase {
  id: string;
  params: StepParams;
  /** Never sent to the AI fallback (SRP, passwords, private keys). */
  sensitive: boolean;
  /** When false, only the bound Page Object method may run this step. */
  allowHeal: boolean;
}

export interface ScenarioDoStep extends ScenarioStepBase {
  kind: 'do';
  text: string;
}

export interface ScenarioExpectStep extends ScenarioStepBase {
  kind: 'expect';
  text: string;
}

export type ScenarioStep = ScenarioDoStep | ScenarioExpectStep;

export interface ScenarioTimer {
  name: string;
  /** `do` step whose action triggers the measured interval (not timed). */
  after: string;
  /** `expect` step that ends the measured interval (timed). */
  until: string;
  threshold: PlatformThreshold;
}

export interface ScenarioVisualCheck {
  baseline: string;
  config: string;
  options: Record<string, number | string | boolean>;
}

export interface Scenario {
  id: string;
  title: string;
  tags: string[];
  team: string;
  platforms: ScenarioPlatform[];
  precondition: ScenarioPrecondition;
  profiling: ScenarioProfiling;
  steps: ScenarioStep[];
  timers: ScenarioTimer[];
  visual: ScenarioVisualCheck[];
}

/**
 * - `tap`: single control; alternatives and AI may resolve a replacement.
 * - `assertVisible`: single element that must become visible.
 * - `macro`: composite Page Object flow; only the binding can run it.
 */
export type LockedStepAction = 'tap' | 'assertVisible' | 'macro';

/** A deterministic locator plus where it comes from in the app / test code. */
export type LockedLocator = RecoveredLocator & { source: string };

export interface LockedStep {
  /** Must equal the scenario step text so text edits force a lock review. */
  text: string;
  action: LockedStepAction;
  /** Key in the scenario binding registry, e.g. `WalletView.tapWalletSwapButton`. */
  binding: string;
  /** Page Object file and method the binding calls. */
  source: string;
  /** Deterministic alternatives tried after the binding fails (in order). */
  locators: LockedLocator[];
}

export interface ScenarioLock {
  scenario: string;
  generatedFrom: string;
  steps: Record<string, LockedStep>;
}

export interface LoadedScenario {
  scenario: Scenario;
  lock: ScenarioLock;
  scenarioPath: string;
  lockPath: string;
}

export type HealPolicy = 'off' | 'report' | 'fail';

export type StepRole = 'trigger' | 'until' | 'untimed';

export type ResolutionTier = 'binding' | 'alternative' | 'ai';

export type StepStatus = 'passed' | 'healed' | 'failed' | 'skipped';

export interface StepOutcome {
  id: string;
  kind: ScenarioStep['kind'];
  text: string;
  role: StepRole;
  status: StepStatus;
  resolvedBy: ResolutionTier | null;
  locator: RecoveredLocator | null;
  durationMs: number;
  /** Errors from each tier that was tried, in order. */
  errors: string[];
  /** Tiers that were skipped and why (e.g. "ai: step is sensitive"). */
  skippedTiers: string[];
}

export interface TimerOutcome {
  name: string;
  after: string;
  until: string;
  /** False when the end condition could not be measured with locked locators. */
  valid: boolean;
  durationMs: number | null;
  reason: string | null;
}

export interface HealEvent {
  stepId: string;
  role: StepRole;
  tier: Exclude<ResolutionTier, 'binding'>;
  locator: RecoveredLocator;
  primaryError: string;
  durationMs: number;
  /** True when the heal ran after a failed timed window (diagnosis only). */
  diagnosisOnly: boolean;
  proposedLockPatch: {
    stepId: string;
    locators: LockedLocator[];
  };
}

export type ScenarioRunStatus =
  | 'PASS'
  | 'PASS_HEALED'
  | 'PASS_HEALED_TRIGGER'
  | 'FAIL_THRESHOLD'
  | 'INVALID_MEASUREMENT'
  | 'FAIL_FUNCTIONAL';

export interface ScenarioRunReport {
  scenarioId: string;
  title: string;
  platform: ScenarioPlatform;
  policy: HealPolicy;
  status: ScenarioRunStatus;
  steps: StepOutcome[];
  timers: TimerOutcome[];
  heals: HealEvent[];
  ai: {
    available: boolean;
    calls: number;
    totalMs: number;
  };
  qualityGates: {
    evaluated: boolean;
    passed: boolean | null;
    violations: string[];
  };
}
