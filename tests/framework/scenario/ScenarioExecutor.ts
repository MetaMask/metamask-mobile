import type { Browser } from 'webdriverio';
import TimerHelper, { type PlatformThreshold } from '../TimerHelper.ts';
import TimerStore from '../TimerStore.ts';
import {
  isOverheadTrackingActive,
  stopOverheadTracking,
} from '../AppiumUtilities.ts';
import QualityGatesValidator from '../quality-gates/QualityGatesValidator.ts';
import type {
  LocatorRecoveryProvider,
  RecoveredLocator,
} from '../ai-locator/SelfHealingLocator.ts';
import {
  configurePerformanceLocatorRecovery,
  getPerformanceLocatorRecovery,
} from '../ai-locator/PerformanceLocatorRecovery.ts';
import { resolveStepParams } from './ScenarioLoader.ts';
import { computeRunStatus } from './runStatus.ts';
import {
  SIMULATED_DRIFT_SUFFIX,
  type SimulatedDrift,
} from './simulateDrift.ts';
import type {
  HealEvent,
  HealPolicy,
  LoadedScenario,
  LockedLocator,
  LockedStep,
  ScenarioPlatform,
  ScenarioRunReport,
  ScenarioStep,
  ScenarioTimer,
  StepOutcome,
  StepParams,
  StepRole,
  TimerOutcome,
} from './types.ts';

/** Bound Page Object implementations keyed by the lockfile `binding`. */
export type BindingRegistry = Record<
  string,
  (params: StepParams) => Promise<void>
>;

/** Deterministic actions on a single locator (tiers 2 and 3). */
export interface LocatorActions {
  tap(locator: RecoveredLocator, description: string): Promise<void>;
  assertVisible(locator: RecoveredLocator, description: string): Promise<void>;
}

export interface ScenarioTimerTracker {
  addTimer(timer: TimerHelper): void;
}

export type TimerFactory = (
  name: string,
  threshold: PlatformThreshold,
  platform: ScenarioPlatform,
) => TimerHelper;

export interface ScenarioExecutorOptions {
  loaded: LoadedScenario;
  platform: ScenarioPlatform;
  bindings: BindingRegistry;
  locatorActions: LocatorActions;
  performanceTracker: ScenarioTimerTracker;
  driver: Browser;
  /** Tier 3. Omit to run with bindings and lockfile alternatives only. */
  aiProvider?: LocatorRecoveryProvider;
  policy: HealPolicy;
  simulatedDrift?: SimulatedDrift;
  /** Upper bound on AI calls per run to cap cost and session time. */
  maxAiCalls?: number;
  env?: Record<string, string | undefined>;
  createTimer?: TimerFactory;
  log?: (message: string) => void;
}

type StepMode = 'normal' | 'diagnosis';

const DEFAULT_MAX_AI_CALLS = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toRecoveredLocator(locator: LockedLocator): RecoveredLocator {
  return {
    strategy: locator.strategy,
    value: locator.value,
  } as RecoveredLocator;
}

/**
 * Runs a scenario step by step:
 *
 * 1. the bound Page Object method from the lockfile;
 * 2. the lockfile's alternative locators (deterministic, no model);
 * 3. the AI locator provider, only for untimed, non-sensitive, healable
 * tap / assertVisible steps, and never while a timer is running.
 *
 * Each timer measures only its `until` step's binding inside
 * `TimerHelper.measure`, and passing timers go to the performance tracker so
 * the fixture's quality gates apply unchanged. A failed end condition is
 * diagnosed (tiers 2 and 3) only after the timer has stopped; the diagnosis
 * produces a lock patch and lets the flow continue, but the timer stays
 * invalid and is never reported.
 */
export class ScenarioExecutor {
  private readonly options: ScenarioExecutorOptions;
  private readonly timerByTrigger: Map<string, ScenarioTimer>;
  private readonly createTimer: TimerFactory;
  private readonly log: (message: string) => void;
  private windowOpen = false;
  private aiCalls = 0;
  private aiTotalMs = 0;
  private readonly heals: HealEvent[] = [];
  private readonly stepOutcomes: StepOutcome[] = [];
  private readonly timerOutcomes: TimerOutcome[] = [];
  private readonly validTimers: TimerHelper[] = [];

  constructor(options: ScenarioExecutorOptions) {
    this.options = options;
    this.timerByTrigger = new Map(
      options.loaded.scenario.timers.map((timer) => [timer.after, timer]),
    );
    this.createTimer =
      options.createTimer ??
      ((name, threshold, platform) =>
        new TimerHelper(name, threshold, platform));
    this.log = options.log ?? ((message) => console.log(message));

    const missing = Object.values(options.loaded.lock.steps)
      .map((step) => step.binding)
      .filter((binding) => !(binding in options.bindings));
    if (missing.length > 0) {
      throw new Error(
        `Scenario "${options.loaded.scenario.id}" lock references unknown bindings: ${[
          ...new Set(missing),
        ].join(', ')}`,
      );
    }
  }

  async run(): Promise<ScenarioRunReport> {
    // Gestures.waitAndTap has its own per-tap AI recovery. Suspend it so a
    // binding either succeeds deterministically or fails into tiers 2 and 3,
    // where every heal is recorded.
    const suspendedRecovery = getPerformanceLocatorRecovery();
    configurePerformanceLocatorRecovery(undefined);
    try {
      await this.runSteps();
    } finally {
      configurePerformanceLocatorRecovery(suspendedRecovery);
    }
    return this.buildReport();
  }

  private async runSteps(): Promise<void> {
    const { steps } = this.options.loaded.scenario;
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];
      const timer = this.timerByTrigger.get(step.id);
      const outcome = await this.executeStep(
        step,
        timer ? 'trigger' : 'untimed',
        'normal',
      );
      this.stepOutcomes.push(outcome);
      if (outcome.status === 'failed') {
        this.skipFrom(index + 1);
        return;
      }
      if (!timer) {
        continue;
      }

      // The loader guarantees `until` directly follows `after`.
      index += 1;
      const untilOutcome = await this.runTimedWindow(timer, steps[index]);
      this.stepOutcomes.push(untilOutcome);
      if (untilOutcome.status === 'failed') {
        this.skipFrom(index + 1);
        return;
      }
    }
  }

  private skipFrom(startIndex: number): void {
    const { scenario } = this.options.loaded;
    for (const step of scenario.steps.slice(startIndex)) {
      this.stepOutcomes.push({
        id: step.id,
        kind: step.kind,
        text: step.text,
        role: this.roleOf(step.id),
        status: 'skipped',
        resolvedBy: null,
        locator: null,
        durationMs: 0,
        errors: [],
        skippedTiers: [],
      });
    }
    for (const timer of scenario.timers) {
      if (!this.timerOutcomes.some((outcome) => outcome.name === timer.name)) {
        this.timerOutcomes.push({
          name: timer.name,
          after: timer.after,
          until: timer.until,
          valid: false,
          durationMs: null,
          reason: 'not reached: an earlier step failed',
        });
      }
    }
  }

  private roleOf(stepId: string): StepRole {
    const { timers } = this.options.loaded.scenario;
    if (timers.some((timer) => timer.after === stepId)) {
      return 'trigger';
    }
    if (timers.some((timer) => timer.until === stepId)) {
      return 'until';
    }
    return 'untimed';
  }

  private async runTimedWindow(
    timer: ScenarioTimer,
    untilStep: ScenarioStep,
  ): Promise<StepOutcome> {
    const helper = this.createTimer(
      timer.name,
      timer.threshold,
      this.options.platform,
    );
    const lockedStep = this.lockedStep(untilStep.id);
    const startedAt = Date.now();
    let windowError: unknown = null;

    this.windowOpen = true;
    try {
      await helper.measure(() => this.runBinding(untilStep, lockedStep));
    } catch (error) {
      windowError = error;
      // measureWithOverhead skips stopOverheadTracking when the action throws.
      // Reset it, or every later measure() is treated as nested and subtracts
      // overhead accumulated across the failed window.
      if (isOverheadTrackingActive()) {
        stopOverheadTracking();
      }
    } finally {
      this.windowOpen = false;
    }

    if (windowError === null) {
      this.options.performanceTracker.addTimer(helper);
      this.validTimers.push(helper);
      this.timerOutcomes.push({
        name: timer.name,
        after: timer.after,
        until: timer.until,
        valid: true,
        durationMs: helper.getDuration(),
        reason: null,
      });
      return {
        id: untilStep.id,
        kind: untilStep.kind,
        text: untilStep.text,
        role: 'until',
        status: 'passed',
        resolvedBy: 'binding',
        locator: null,
        durationMs: Date.now() - startedAt,
        errors: [],
        skippedTiers: [],
      };
    }

    const windowMessage = errorMessage(windowError);
    this.log(
      `[scenario] Timed end condition "${untilStep.id}" failed inside "${timer.name}": ${windowMessage}. Diagnosing outside the timed window; the timer will not be reported.`,
    );
    const diagnosis = await this.executeStep(
      untilStep,
      'until',
      'diagnosis',
      windowMessage,
    );
    this.timerOutcomes.push({
      name: timer.name,
      after: timer.after,
      until: timer.until,
      valid: false,
      durationMs: null,
      reason:
        diagnosis.status === 'healed'
          ? `end condition only resolved after healing via ${diagnosis.resolvedBy}; measured window is not comparable`
          : `end condition failed: ${windowMessage}`,
    });
    return diagnosis;
  }

  private lockedStep(stepId: string): LockedStep {
    return this.options.loaded.lock.steps[stepId];
  }

  private async runBinding(
    step: ScenarioStep,
    lockedStep: LockedStep,
  ): Promise<void> {
    if (this.options.simulatedDrift?.has(step.id)) {
      throw new Error(
        `Simulated drift: binding ${lockedStep.binding} for step "${step.id}" no longer matches the UI`,
      );
    }
    const params = resolveStepParams(step.params, this.options.env);
    await this.options.bindings[lockedStep.binding](params);
  }

  private alternativesFor(step: ScenarioStep, lockedStep: LockedStep) {
    const drifted = this.options.simulatedDrift?.get(step.id) === 'locators';
    return lockedStep.locators.map((locator) =>
      drifted
        ? { ...locator, value: `${locator.value}${SIMULATED_DRIFT_SUFFIX}` }
        : locator,
    );
  }

  private async performLocatorAction(
    lockedStep: LockedStep,
    locator: RecoveredLocator,
    description: string,
  ): Promise<void> {
    if (lockedStep.action === 'tap') {
      await this.options.locatorActions.tap(locator, description);
      return;
    }
    await this.options.locatorActions.assertVisible(locator, description);
  }

  /** Reasons tier 3 is not allowed for this step, empty when allowed. */
  private aiBlockers(step: ScenarioStep, lockedStep: LockedStep): string[] {
    const blockers: string[] = [];
    if (!this.options.aiProvider) {
      blockers.push('no AI provider configured');
    }
    if (step.sensitive) {
      blockers.push('step is sensitive');
    }
    if (lockedStep.action === 'macro') {
      blockers.push('macro steps run only through their binding');
    }
    if (this.windowOpen || TimerStore.hasActiveTimer()) {
      blockers.push('a performance timer is running');
    }
    if (this.aiCalls >= (this.options.maxAiCalls ?? DEFAULT_MAX_AI_CALLS)) {
      blockers.push('AI call budget for this run is used up');
    }
    return blockers;
  }

  private async executeStep(
    step: ScenarioStep,
    role: StepRole,
    mode: StepMode,
    priorError?: string,
  ): Promise<StepOutcome> {
    const lockedStep = this.lockedStep(step.id);
    const startedAt = Date.now();
    const errors: string[] = priorError
      ? [`binding (timed): ${priorError}`]
      : [];
    const skippedTiers: string[] = [];
    const outcome = (
      status: StepOutcome['status'],
      resolvedBy: StepOutcome['resolvedBy'],
      locator: RecoveredLocator | null,
    ): StepOutcome => ({
      id: step.id,
      kind: step.kind,
      text: step.text,
      role,
      status,
      resolvedBy,
      locator,
      durationMs: Date.now() - startedAt,
      errors,
      skippedTiers,
    });

    if (mode === 'normal') {
      try {
        await this.runBinding(step, lockedStep);
        return outcome('passed', 'binding', null);
      } catch (error) {
        errors.push(`binding ${lockedStep.binding}: ${errorMessage(error)}`);
      }
    }

    if (this.options.policy === 'off') {
      skippedTiers.push(
        'alternative: PERF_HEAL_POLICY=off',
        'ai: PERF_HEAL_POLICY=off',
      );
      return outcome('failed', null, null);
    }
    if (!step.allowHeal) {
      skippedTiers.push(
        'alternative: step has allowHeal: false',
        'ai: step has allowHeal: false',
      );
      return outcome('failed', null, null);
    }
    if (this.windowOpen || TimerStore.hasActiveTimer()) {
      skippedTiers.push(
        'alternative: a performance timer is running',
        'ai: a performance timer is running',
      );
      return outcome('failed', null, null);
    }

    const alternatives =
      lockedStep.action === 'macro'
        ? []
        : this.alternativesFor(step, lockedStep);
    if (alternatives.length === 0) {
      skippedTiers.push('alternative: lockfile has no alternative locators');
    }
    for (const alternative of alternatives) {
      const locator = toRecoveredLocator(alternative);
      try {
        await this.performLocatorAction(lockedStep, locator, step.text);
        this.recordHeal({
          step,
          role,
          tier: 'alternative',
          locator,
          errors,
          startedAt,
          mode,
          triedAlternatives: alternatives,
        });
        return outcome('healed', 'alternative', locator);
      } catch (error) {
        errors.push(
          `alternative ${locator.strategy}=${locator.value}: ${errorMessage(error)}`,
        );
      }
    }

    const blockers = this.aiBlockers(step, lockedStep);
    if (blockers.length > 0) {
      skippedTiers.push(`ai: ${blockers.join('; ')}`);
      return outcome('failed', null, null);
    }

    const provider = this.options.aiProvider as LocatorRecoveryProvider;
    const aiStartedAt = Date.now();
    this.aiCalls += 1;
    let recovered: RecoveredLocator | null = null;
    try {
      recovered = await provider.recover({
        driver: this.options.driver,
        intent: this.buildIntent(step, lockedStep),
        primaryError: errors.join(' | '),
        knownLocators: alternatives.map(toRecoveredLocator),
      });
    } catch (error) {
      errors.push(`ai: ${errorMessage(error)}`);
    } finally {
      this.aiTotalMs += Date.now() - aiStartedAt;
    }
    if (!recovered) {
      errors.push('ai: provider returned no locator');
      return outcome('failed', null, null);
    }

    try {
      await this.performLocatorAction(lockedStep, recovered, step.text);
    } catch (error) {
      errors.push(
        `ai ${recovered.strategy}=${recovered.value}: ${errorMessage(error)}`,
      );
      return outcome('failed', null, null);
    }
    this.recordHeal({
      step,
      role,
      tier: 'ai',
      locator: recovered,
      errors,
      startedAt,
      mode,
      triedAlternatives: alternatives,
    });
    return outcome('healed', 'ai', recovered);
  }

  private buildIntent(step: ScenarioStep, lockedStep: LockedStep): string {
    const verb =
      lockedStep.action === 'tap' ? 'Tap target' : 'Element to wait for';
    return `${verb}: ${step.text}. Previously implemented by ${lockedStep.binding} (${lockedStep.source}).`;
  }

  private recordHeal({
    step,
    role,
    tier,
    locator,
    errors,
    startedAt,
    mode,
    triedAlternatives,
  }: {
    step: ScenarioStep;
    role: StepRole;
    tier: HealEvent['tier'];
    locator: RecoveredLocator;
    errors: string[];
    startedAt: number;
    mode: StepMode;
    triedAlternatives: LockedLocator[];
  }): void {
    const source =
      tier === 'ai'
        ? `learned by AI locator recovery (scenario ${this.options.loaded.scenario.id})`
        : 'lockfile alternative';
    const healedLocator = { ...locator, source } as LockedLocator;
    const original = this.lockedStep(step.id).locators;
    const remaining = original.filter(
      (candidate) =>
        candidate.strategy !== locator.strategy ||
        candidate.value !== locator.value,
    );
    this.heals.push({
      stepId: step.id,
      role,
      tier,
      locator,
      primaryError: errors[0] ?? '',
      durationMs: Date.now() - startedAt,
      diagnosisOnly: mode === 'diagnosis',
      proposedLockPatch: {
        stepId: step.id,
        // Promote the working locator to the front; keep the rest for review.
        locators: [healedLocator, ...remaining],
      },
    });
    this.log(
      `[scenario] HEALED step "${step.id}" (${role}) via ${tier}: ${locator.strategy}=${locator.value}${
        triedAlternatives.length > 0 && tier === 'ai'
          ? ` (lockfile alternatives failed: ${triedAlternatives.map((l) => l.value).join(', ')})`
          : ''
      }`,
    );
  }

  private buildReport(): ScenarioRunReport {
    const { scenario } = this.options.loaded;
    const gates =
      this.validTimers.length > 0
        ? new QualityGatesValidator().validateTimers(
            scenario.title,
            this.validTimers,
          )
        : null;
    const qualityGatesPassed = gates?.hasThresholds ? gates.passed : null;
    return {
      scenarioId: scenario.id,
      title: scenario.title,
      platform: this.options.platform,
      policy: this.options.policy,
      status: computeRunStatus({
        steps: this.stepOutcomes,
        timers: this.timerOutcomes,
        heals: this.heals,
        qualityGatesPassed,
      }),
      steps: this.stepOutcomes,
      timers: this.timerOutcomes,
      heals: this.heals,
      ai: {
        available: Boolean(this.options.aiProvider),
        calls: this.aiCalls,
        totalMs: this.aiTotalMs,
      },
      qualityGates: {
        evaluated: Boolean(gates?.hasThresholds),
        passed: qualityGatesPassed,
        violations:
          gates?.violations.map((violation) => violation.message) ?? [],
      },
    };
  }
}
