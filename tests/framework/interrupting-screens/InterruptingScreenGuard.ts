import type { Browser } from 'webdriverio';
import AppiumGestures from '../AppiumGestures.ts';
import type { AppiumElement } from '../AppiumElement.ts';
import {
  getDriver,
  withOverheadTrackingSuspended,
} from '../AppiumUtilities.ts';
import TimerStore from '../TimerStore.ts';
import { createAppiumLogger } from '../appiumLogger.ts';
import {
  NESTED_PHASE_PREFIX,
  isNestedPhase,
  recordPhase,
} from '../telemetry/PhaseTimer.ts';
import {
  getElementForLocator,
  type RecoveredLocator,
} from '../ai-locator/SelfHealingLocator.ts';
import {
  isSafeDismissControl,
  type InterruptionRecoveryProvider,
} from '../ai-locator/ClaudeInterruptionRecoveryProvider.ts';
import { pageSourceContainsSecrets } from '../ai-locator/ClaudeLocatorRecoveryProvider.ts';
import {
  assessStepEligibility,
  isSafeAlternativeFix,
  isSafeDismissFix,
  validateDiagnosis,
} from '../flaky-recovery/FlakyRecoveryGuardrails.ts';
import type { FlakyRecoveryRuntime } from '../flaky-recovery/FlakyRecoverySession.ts';
import {
  describeLocator,
  type AppliedFlakyFix,
  type FlakyFix,
  type FlakyStep,
  type FlakyStepKind,
} from '../flaky-recovery/FlakyRecoveryTypes.ts';
import {
  findInterruptingScreensInPageSource,
  INTERRUPTING_SCREEN_REGISTRY,
  pageSourceContainsLocator,
  type InterruptingScreenDefinition,
} from './InterruptingScreenRegistry.ts';

const logger = createAppiumLogger('InterruptingScreenGuard');

/** Phase that accumulates post-login settle windows (overlaps its enclosing phase). */
export const INTERRUPTING_SCREEN_SETTLE_PHASE = 'interrupting_screens_settle';
/** Phase that accumulates dismiss-and-retry recoveries (overlaps its enclosing phase). */
export const INTERRUPTING_SCREEN_RECOVERY_PHASE =
  'interrupting_screens_recovery';

/** Phase that accumulates AI flaky-recovery diagnosis and fixes (overlaps its enclosing phase). */
export const FLAKY_RECOVERY_PHASE = 'flaky_recovery';

export const DEFAULT_SETTLE_WINDOW_MS = 4_000;
export const DEFAULT_SETTLE_POLL_INTERVAL_MS = 500;
export const DEFAULT_MAX_AI_ATTEMPTS_PER_TEST = 3;
/** Stops a sheet that reappears forever from turning settle into a loop. */
const MAX_SETTLE_DISMISSALS = 5;
const MAX_DISMISS_ATTEMPTS_PER_SCREEN = 2;
const DISMISS_TAP_TIMEOUT_MS = 3_000;
const DISMISS_GONE_TIMEOUT_MS = 3_000;

export type InterruptionTrigger = 'settle' | 'tap-failure' | 'wait-failure';

export interface InterruptingScreenDismissal {
  screen: string;
  source: 'registry' | 'ai';
  trigger: InterruptionTrigger;
  locator: RecoveredLocator;
  /** Intent of the step that failed (absent for settle). */
  intent?: string;
  /** Model explanation for AI dismissals. */
  reason?: string;
  durationMs: number;
  /**
   * True when a performance timer was running. The dismissal itself is
   * excluded from the timer, but the failed wait before it is not.
   */
  duringActiveTimer: boolean;
}

/** Device operations the guard needs; injectable for unit tests. */
export interface InterruptingScreenDeviceAdapter {
  driver(): Browser;
  getPageSource(): Promise<string>;
  /** Taps the control and waits for it to go away. False when not tappable. */
  tap(locator: RecoveredLocator): Promise<boolean>;
  /** On-device text / label / content-desc of the control, for safety checks. */
  describe(locator: RecoveredLocator): Promise<string[]>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export interface InterruptingScreenGuardConfig {
  registry?: readonly InterruptingScreenDefinition[];
  /** AI fallback for unknown screens. Omit to use the registry only. */
  aiProvider?: InterruptionRecoveryProvider;
  maxAiAttemptsPerTest?: number;
  onDismissed?: (event: InterruptingScreenDismissal) => Promise<void> | void;
  /** Receives diagnostic page sources (e.g. on a wallet-home timeout). */
  onPageSource?: (label: string, pageSource: string) => Promise<void> | void;
  /**
   * AI flaky-failure recovery for E2E smoke. When set, the guard only reacts
   * after a step has failed (the post-login settle window and the polling
   * dismissals are skipped, so the happy path pays nothing), and every
   * recovered step is reported through the runtime. Omit it for performance
   * runs: nothing in this file changes their behavior.
   */
  flakyRecovery?: FlakyRecoveryRuntime;
}

export interface SettleOptions {
  windowMs?: number;
  pollIntervalMs?: number;
}

export interface RetryContext<TResult = unknown> {
  intent: string;
  trigger: Exclude<InterruptionTrigger, 'settle'>;
  /**
   * Re-runs the step against another locator. Only used by AI flaky recovery
   * when the model finds an equivalent control for a stale locator.
   */
  retryWithLocator?: (locator: RecoveredLocator) => Promise<TResult>;
  /** Timeout the step waited for, when known. Short ones are treated as probes. */
  timeoutMs?: number;
}

export interface TapRetryContext extends RetryContext<void> {
  /** testID / text / label of the control the tap was aimed at. */
  describeTarget: () => Promise<string[]>;
}

/** A step that AI flaky recovery may fix; a no-op when recovery is not configured. */
export interface FlakyStepContext<TResult = void> {
  kind: FlakyStepKind;
  intent: string;
  /** testID / text / label of the control the step is aimed at. */
  describeTarget?: () => Promise<string[]>;
  retryWithLocator?: (locator: RecoveredLocator) => Promise<TResult>;
  /** Timeout the step waited for, when known. Short ones are treated as probes. */
  timeoutMs?: number;
}

type FlakyRetry =
  | { kind: 'rerun' }
  | { kind: 'done' }
  | { kind: 'locator'; locator: RecoveredLocator };

interface FlakyAttempt {
  step: FlakyStep;
  applied: AppliedFlakyFix;
  retry: FlakyRetry;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readAttribute(
  read: () => Promise<string | null>,
): Promise<string | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/**
 * testID / text / label / content-desc of an element, read one command at a
 * time. Unreadable attributes are skipped.
 */
export async function describeElement(
  control: AppiumElement,
): Promise<string[]> {
  const values: string[] = [];
  for (const read of [
    () => control.getText(),
    () => control.getAttribute('resource-id'),
    () => control.getAttribute('content-desc'),
    () => control.getAttribute('label'),
    () => control.getAttribute('name'),
  ]) {
    const value = await readAttribute(read);
    if (value) {
      values.push(value);
    }
  }
  return values;
}

function normalizeDescriptor(value: string): string {
  return value.trim().toLowerCase();
}

export const appiumInterruptingScreenAdapter: InterruptingScreenDeviceAdapter =
  {
    driver: () => getDriver(),
    getPageSource: () => getDriver().getPageSource(),
    async tap(locator) {
      try {
        const control = await getElementForLocator(locator);
        await AppiumGestures.waitAndTap(control, {
          timeout: DISMISS_TAP_TIMEOUT_MS,
          checkForDisplayed: true,
          checkForEnabled: true,
          elemDescription: `interrupting screen dismiss (${locator.strategy}=${locator.value})`,
        });
        await control
          .unwrap()
          .waitForDisplayed({ reverse: true, timeout: DISMISS_GONE_TIMEOUT_MS })
          .catch(() => undefined);
        return true;
      } catch (error) {
        logger.debug(
          `Dismiss tap failed for ${locator.strategy}=${locator.value}: ${errorMessage(error)}`,
        );
        return false;
      }
    },
    async describe(locator) {
      try {
        // Sequential on purpose: one Appium session must not run commands concurrently.
        return await describeElement(await getElementForLocator(locator));
      } catch {
        return [];
      }
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };

/**
 * Resolves the post-login settle window from `INTERRUPTING_SCREEN_SETTLE_MS`.
 * Invalid values fall back to {@link DEFAULT_SETTLE_WINDOW_MS}.
 */
export function resolveSettleWindowMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env.INTERRUPTING_SCREEN_SETTLE_MS?.trim();
  if (!raw) {
    return DEFAULT_SETTLE_WINDOW_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_SETTLE_WINDOW_MS;
}

/** `INTERRUPTING_SCREEN_GUARD_ENABLED=false` turns the guard off entirely. */
export function isInterruptingScreenGuardEnabledByEnv(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.INTERRUPTING_SCREEN_GUARD_ENABLED?.trim() !== 'false';
}

/**
 * Serial guard against screens that slide over a performance flow
 * (marketing consent, push opt-in, GTM promos, …).
 *
 * It never runs in the background: WebDriver commands on one session are not
 * safely concurrent. Instead it runs (1) a short settle window after login and
 * (2) a dismiss-and-retry-once when a shared tap / wait helper fails.
 * Known screens come from {@link INTERRUPTING_SCREEN_REGISTRY}; unknown ones go
 * to the optional AI provider. All guard time is removed from running timers.
 */
export class InterruptingScreenGuard {
  #config: InterruptingScreenGuardConfig | undefined;
  #handling = false;
  #aiAttempts = 0;
  /** Bumped by configure() so a timed-out test's leftover work cannot touch the next test. */
  #generation = 0;
  /** Generation that owns the device. Leftover work stops when this no longer matches. */
  #ownedGeneration = 0;
  /** Chains device work so a new test waits out the previous test's in-flight command. */
  #turn: Promise<void> = Promise.resolve();
  /** Normalized descriptors of the control a failed tap was aimed at. */
  #recoveryTarget: string[] = [];
  /** Dismiss locator that matched that control during the last recovery. */
  #tappedRecoveryLocator: RecoveredLocator | undefined;
  /** Set when that dismissal completed the tap: nothing matching it is left. */
  #tappedRecoveryTarget = false;
  readonly #adapter: InterruptingScreenDeviceAdapter;

  constructor(
    adapter: InterruptingScreenDeviceAdapter = appiumInterruptingScreenAdapter,
  ) {
    this.#adapter = adapter;
  }

  /** Enables the guard for the current test, or disables it with `undefined`. */
  configure(config: InterruptingScreenGuardConfig | undefined): void {
    this.#config = config;
    this.#aiAttempts = 0;
    this.#generation += 1;
  }

  /** True once configure() has moved on from the work that owns the device. */
  #abandoned(): boolean {
    return this.#ownedGeneration !== this.#generation;
  }

  /** True while this generation is already inside a guard device call. Nested calls must not queue behind it. */
  #inGuardWork(): boolean {
    return this.#handling && !this.#abandoned();
  }

  /** False when unconfigured or while the guard itself is dismissing a screen. */
  isActive(): boolean {
    return this.#config !== undefined && !this.#handling;
  }

  /**
   * Polls for known screens for `windowMs` and dismisses each one that
   * appears. Use right after a transition known to trigger sheets (unlock),
   * before the measured part of the test starts.
   *
   * A window of 0 or less (including `INTERRUPTING_SCREEN_SETTLE_MS=0`) returns
   * immediately and does not read the page source or tap anything.
   */
  async settle(
    options: SettleOptions = {},
  ): Promise<InterruptingScreenDismissal[]> {
    const windowMs = options.windowMs ?? resolveSettleWindowMs();
    if (this.#inGuardWork()) {
      return [];
    }
    if (
      this.#config === undefined ||
      this.#config.flakyRecovery !== undefined ||
      windowMs <= 0
    ) {
      await this.#turn;
      return [];
    }
    const pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_SETTLE_POLL_INTERVAL_MS;

    return this.#runExcluded(INTERRUPTING_SCREEN_SETTLE_PHASE, async () => {
      const dismissed: InterruptingScreenDismissal[] = [];
      if (this.#abandoned()) {
        return dismissed;
      }
      const failedAttempts = new Map<string, number>();
      const deadline = this.#adapter.now() + windowMs;

      while (dismissed.length < MAX_SETTLE_DISMISSALS) {
        if (this.#abandoned()) {
          return dismissed;
        }
        const pageSource = await this.#safePageSource();
        if (this.#abandoned()) {
          return dismissed;
        }
        const screen =
          pageSource === null
            ? undefined
            : this.#findKnownScreens(pageSource).find(
                (candidate) =>
                  (failedAttempts.get(candidate.name) ?? 0) <
                  MAX_DISMISS_ATTEMPTS_PER_SCREEN,
              );

        if (screen) {
          const event = await this.#dismissKnownScreen(screen, 'settle');
          if (this.#abandoned()) {
            return dismissed;
          }
          if (event) {
            dismissed.push(event);
          } else {
            failedAttempts.set(
              screen.name,
              (failedAttempts.get(screen.name) ?? 0) + 1,
            );
          }
          continue;
        }

        const remaining = deadline - this.#adapter.now();
        if (remaining <= 0) {
          break;
        }
        await this.#adapter.sleep(Math.min(pollIntervalMs, remaining));
        if (this.#abandoned()) {
          return dismissed;
        }
      }
      return dismissed;
    });
  }

  /**
   * Called after a tap / wait failed. Dismisses a known screen, or asks the
   * AI provider about an unknown overlay. Returns true when something was
   * dismissed and the caller should retry once.
   */
  async recoverFromFailure(
    context: (RetryContext | TapRetryContext) & { error: unknown },
  ): Promise<boolean> {
    if (this.#inGuardWork()) {
      return false;
    }
    this.#recoveryTarget = [];
    this.#tappedRecoveryLocator = undefined;
    this.#tappedRecoveryTarget = false;
    if (this.#config === undefined) {
      await this.#turn;
      return false;
    }
    return this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      if (this.#abandoned()) {
        return false;
      }
      const pageSource = await this.#safePageSource();
      if (this.#abandoned() || pageSource === null) {
        return false;
      }
      const tapContext = 'describeTarget' in context ? context : undefined;
      if (tapContext) {
        this.#recoveryTarget = await this.#readRecoveryTarget(tapContext);
        if (this.#abandoned()) {
          return false;
        }
      }
      const dismissed =
        (await this.#dismissFirstKnownScreen(
          pageSource,
          context.trigger,
          context.intent,
        )) ||
        (!this.#abandoned() &&
          (await this.#dismissWithAi(pageSource, context)));
      const tappedLocator = this.#tappedRecoveryLocator;
      if (dismissed && tapContext && tappedLocator) {
        // A shared label (two sheets with "Not now") must not skip the retry
        // while a matching control is still on screen. The old element
        // reference is usually stale after the sheet closes, so look again.
        this.#tappedRecoveryTarget =
          !(await this.#controlStillOnScreen(tappedLocator));
      }
      return dismissed;
    });
  }

  /**
   * Reads the page source once and dismisses the first known screen on it.
   * Registry only (no AI). For polling loops whose readiness checks cannot
   * pass while a sheet covers the screen, such as the wallet-home wait.
   */
  async dismissKnownScreen(intent: string): Promise<boolean> {
    if (this.#inGuardWork()) {
      return false;
    }
    if (
      this.#config === undefined ||
      this.#config.flakyRecovery !== undefined
    ) {
      await this.#turn;
      return false;
    }
    return this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      if (this.#abandoned()) {
        return false;
      }
      const pageSource = await this.#safePageSource();
      if (this.#abandoned() || pageSource === null) {
        return false;
      }
      return this.#dismissFirstKnownScreen(pageSource, 'wait-failure', intent);
    });
  }

  /**
   * Hands the current page source to `onPageSource` for diagnosis, unless the
   * screen can expose secrets. No-op when the guard is inactive.
   */
  async capturePageSource(label: string): Promise<void> {
    const onPageSource = this.#config?.onPageSource;
    if (this.#inGuardWork()) {
      return;
    }
    if (this.#config === undefined || !onPageSource) {
      await this.#turn;
      return;
    }
    await this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      if (this.#abandoned()) {
        return;
      }
      const pageSource = await this.#safePageSource();
      if (
        this.#abandoned() ||
        pageSource === null ||
        pageSourceContainsSecrets(pageSource)
      ) {
        return;
      }
      try {
        await onPageSource(label, pageSource);
      } catch (error) {
        logger.debug(`onPageSource callback failed: ${errorMessage(error)}`);
      }
    });
  }

  /**
   * Runs `action`; when it fails and an interrupting screen is dismissed,
   * runs it exactly once more. Otherwise rethrows the original error.
   */
  async retryAfterInterruption<TResult>(
    action: () => Promise<TResult>,
    context: RetryContext<TResult>,
  ): Promise<TResult> {
    if (!this.#inGuardWork()) {
      await this.#turn;
    }
    try {
      return await action();
    } catch (error) {
      if (this.#config?.flakyRecovery) {
        return this.#flakyRetry(
          action,
          {
            kind: 'wait',
            intent: context.intent,
            retryWithLocator: context.retryWithLocator,
            timeoutMs: context.timeoutMs,
          },
          context.trigger,
          error,
        );
      }
      if (!(await this.recoverFromFailure({ ...context, error }))) {
        throw error;
      }
      logger.info(
        `Retrying "${context.intent}" after dismissing an interrupting screen`,
      );
      return action();
    }
  }

  /**
   * {@link retryAfterInterruption} for a tap. When the guard dismissed the
   * sheet by tapping the very control the tap was aimed at (for example the
   * spec's own "Not now"), the tap is done and is not retried: the control is
   * gone, so a retry would fail.
   */
  async retryTapAfterInterruption(
    tap: () => Promise<void>,
    context: TapRetryContext,
  ): Promise<void> {
    if (!this.#inGuardWork()) {
      await this.#turn;
    }
    try {
      await tap();
    } catch (error) {
      if (this.#config?.flakyRecovery) {
        return this.#flakyRetry(
          tap,
          {
            kind: 'tap',
            intent: context.intent,
            describeTarget: context.describeTarget,
            retryWithLocator: context.retryWithLocator,
            timeoutMs: context.timeoutMs,
          },
          context.trigger,
          error,
          () => undefined,
        );
      }
      if (!(await this.recoverFromFailure({ ...context, error }))) {
        throw error;
      }
      if (this.#tappedRecoveryTarget) {
        logger.info(
          `"${context.intent}" completed by the interrupting-screen dismissal of the same control`,
        );
        return;
      }
      logger.info(
        `Retrying "${context.intent}" after dismissing an interrupting screen`,
      );
      await tap();
    }
  }

  /**
   * Runs a scroll-to / type step. With AI flaky recovery configured, a failure
   * is diagnosed and the step retried once after the fix; otherwise this is
   * exactly `action()` (so performance runs behave as before).
   */
  async retryStepWithFlakyRecovery<TResult>(
    action: () => Promise<TResult>,
    context: FlakyStepContext<TResult>,
  ): Promise<TResult> {
    if (!this.#config?.flakyRecovery) {
      return action();
    }
    if (!this.#inGuardWork()) {
      await this.#turn;
    }
    try {
      return await action();
    } catch (error) {
      return this.#flakyRetry(action, context, 'wait-failure', error);
    }
  }

  /**
   * Diagnoses the failure, applies one fix and retries the step once. The
   * ORIGINAL error is rethrown, unchanged, when nothing was recovered or the
   * retry fails too.
   */
  async #flakyRetry<TResult>(
    action: () => Promise<TResult>,
    context: FlakyStepContext<TResult>,
    trigger: Exclude<InterruptionTrigger, 'settle'>,
    originalError: unknown,
    completedResult?: () => TResult,
  ): Promise<TResult> {
    const runtime = this.#config?.flakyRecovery;
    if (!runtime || this.#inGuardWork()) {
      throw originalError;
    }
    const attempt = await this.#attemptFlakyFix(
      runtime,
      context,
      trigger,
      originalError,
    );
    if (!attempt) {
      throw originalError;
    }

    let result: TResult;
    try {
      if (attempt.retry.kind === 'done' && completedResult) {
        result = completedResult();
      } else if (attempt.retry.kind === 'locator') {
        if (!context.retryWithLocator) {
          throw originalError;
        }
        result = await context.retryWithLocator(attempt.retry.locator);
      } else {
        result = await action();
      }
    } catch (retryError) {
      logger.warn(
        `"${context.intent}" still failed after the flaky-recovery fix (${attempt.applied.solution}): ${errorMessage(retryError)}. Rethrowing the original error.`,
      );
      throw originalError;
    }

    await this.#reportFlakyRecovery(runtime, attempt);
    return result;
  }

  async #reportFlakyRecovery(
    runtime: FlakyRecoveryRuntime,
    attempt: FlakyAttempt,
  ): Promise<void> {
    if (this.#abandoned()) {
      return;
    }
    let afterBase64: string | undefined;
    try {
      afterBase64 = await runtime.executor.takeScreenshot();
    } catch (error) {
      logger.debug(`After-fix screenshot failed: ${errorMessage(error)}`);
    }
    logger.warn(
      `Step "${attempt.step.intent}" PASSED AFTER AI FLAKY RECOVERY (${attempt.applied.cause}): ${attempt.applied.solution}`,
    );
    try {
      await runtime.recordRecovery(attempt.step, attempt.applied, {
        beforeBase64: attempt.applied.screenshotBeforeBase64,
        afterBase64,
      });
    } catch (error) {
      logger.debug(`Flaky recovery report failed: ${errorMessage(error)}`);
    }
  }

  /**
   * Known screens first (no model call), then the model. Everything runs in
   * the excluded section; the retry itself is left to the caller.
   */
  async #attemptFlakyFix<TResult>(
    runtime: FlakyRecoveryRuntime,
    context: FlakyStepContext<TResult>,
    trigger: Exclude<InterruptionTrigger, 'settle'>,
    error: unknown,
  ): Promise<FlakyAttempt | undefined> {
    const failure = errorMessage(error);
    if (
      context.timeoutMs !== undefined &&
      context.timeoutMs < runtime.limits.minStepTimeoutMs
    ) {
      // Presence probes (try/catch around a short wait) fail by design; a
      // recovery there would only add latency inside the caller's poll loop.
      return undefined;
    }
    if (!runtime.canRecover()) {
      logger.info(
        `Flaky recovery budget (${runtime.limits.maxRecoveriesPerTest}) used up; "${context.intent}" fails as before`,
      );
      return undefined;
    }
    const eligibility = assessStepEligibility({
      kind: context.kind,
      intent: context.intent,
      errorMessage: failure,
    });
    if (!eligibility.eligible) {
      logger.info(`Not recovering "${context.intent}": ${eligibility.reason}`);
      return undefined;
    }

    this.#recoveryTarget = [];
    this.#tappedRecoveryLocator = undefined;
    this.#tappedRecoveryTarget = false;

    return this.#runExcluded(FLAKY_RECOVERY_PHASE, async () => {
      if (this.#abandoned()) {
        return undefined;
      }
      const startedAt = this.#adapter.now();
      const pageSource = await this.#safePageSource();
      if (this.#abandoned() || pageSource === null) {
        return undefined;
      }
      if (pageSourceContainsSecrets(pageSource)) {
        logger.info('Not recovering: the screen can expose secrets');
        return undefined;
      }

      const targetDescriptors = await this.#readFlakyTarget(context);
      this.#recoveryTarget = targetDescriptors.map(normalizeDescriptor);
      const step: FlakyStep = {
        kind: context.kind,
        intent: context.intent,
        targetDescriptors,
        errorMessage: failure,
        supportsAlternativeLocator: context.retryWithLocator !== undefined,
      };

      const hasKnownScreen = this.#findKnownScreens(pageSource).length > 0;
      if (!hasKnownScreen && !runtime.canDiagnose()) {
        return undefined;
      }
      let screenshotBeforeBase64: string | undefined;
      try {
        screenshotBeforeBase64 = await runtime.executor.takeScreenshot();
      } catch (screenshotError) {
        logger.debug(`Screenshot failed: ${errorMessage(screenshotError)}`);
      }
      if (this.#abandoned()) {
        return undefined;
      }

      const known = await this.#dismissFirstKnownScreenEvent(
        pageSource,
        trigger,
        context.intent,
      );
      if (known) {
        const completed = await this.#tapCompletedByDismissal(step.kind);
        return {
          step,
          retry: completed ? { kind: 'done' } : { kind: 'rerun' },
          applied: {
            source: 'registry',
            cause: 'unexpected-overlay',
            reason: `Known screen "${known.screen}" was covering the app`,
            solution: `Dismissed known screen "${known.screen}" via ${describeLocator(known.locator)}`,
            fix: {
              type: 'registry-dismiss',
              screen: known.screen,
              locator: known.locator,
            },
            screenshotBeforeBase64,
            durationMs: this.#adapter.now() - startedAt,
          },
        };
      }
      if (this.#abandoned()) {
        return undefined;
      }

      return this.#diagnoseAndFix(runtime, {
        step,
        pageSource,
        screenshotBeforeBase64,
        startedAt,
      });
    });
  }

  async #readFlakyTarget(context: {
    describeTarget?: () => Promise<string[]>;
  }): Promise<string[]> {
    if (!context.describeTarget) {
      return [];
    }
    try {
      return await context.describeTarget();
    } catch (error) {
      logger.debug(`Reading the step target failed: ${errorMessage(error)}`);
      return [];
    }
  }

  /** True when the dismissal tapped the very control a tap step was aimed at, and it is gone. */
  async #tapCompletedByDismissal(kind: FlakyStepKind): Promise<boolean> {
    const tapped = this.#tappedRecoveryLocator;
    if (kind !== 'tap' || !tapped) {
      return false;
    }
    this.#tappedRecoveryTarget = !(await this.#controlStillOnScreen(tapped));
    return this.#tappedRecoveryTarget;
  }

  async #diagnoseAndFix(
    runtime: FlakyRecoveryRuntime,
    input: {
      step: FlakyStep;
      pageSource: string;
      screenshotBeforeBase64: string | undefined;
      startedAt: number;
    },
  ): Promise<FlakyAttempt | undefined> {
    const { step, pageSource, screenshotBeforeBase64, startedAt } = input;
    if (!runtime.canDiagnose() || !screenshotBeforeBase64) {
      return undefined;
    }
    runtime.noteDiagnosis();

    let diagnosis;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      diagnosis = await Promise.race([
        runtime.provider.diagnose({
          step,
          pageSource,
          screenshotBase64: screenshotBeforeBase64,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `no answer within ${runtime.limits.diagnosisTimeoutMs}ms`,
                ),
              ),
            runtime.limits.diagnosisTimeoutMs,
          );
        }),
      ]);
    } catch (error) {
      logger.warn(`AI flaky diagnosis failed: ${errorMessage(error)}`);
      return undefined;
    } finally {
      clearTimeout(timer);
    }
    if (this.#abandoned()) {
      return undefined;
    }
    if (!diagnosis) {
      logger.info('AI gave no usable flaky diagnosis; failing as before');
      return undefined;
    }
    if (diagnosis.classification === 'real-failure') {
      logger.info(
        `AI classified "${step.intent}" as a REAL failure: ${diagnosis.reason}`,
      );
      return undefined;
    }

    const validation = validateDiagnosis(diagnosis, step);
    if (!validation.valid) {
      logger.warn(`Refused AI flaky fix: ${validation.reason}`);
      return undefined;
    }
    const retry = await this.#executeFlakyFix(runtime, step, validation.fix);
    if (!retry || !diagnosis.cause || !diagnosis.solution) {
      return undefined;
    }
    return {
      step,
      retry,
      applied: {
        source: 'ai',
        cause: diagnosis.cause,
        reason: diagnosis.reason,
        solution: diagnosis.solution,
        fix: validation.fix,
        screenshotBeforeBase64,
        durationMs: this.#adapter.now() - startedAt,
      },
    };
  }

  /** Applies the fix on the device. Undefined when it was refused or could not be applied. */
  async #executeFlakyFix(
    runtime: FlakyRecoveryRuntime,
    step: FlakyStep,
    fix: FlakyFix,
  ): Promise<FlakyRetry | undefined> {
    try {
      switch (fix.type) {
        case 'dismiss-overlay': {
          const onDevice = await this.#adapter.describe(fix.locator);
          if (this.#abandoned()) {
            return undefined;
          }
          if (!isSafeDismissFix(fix, onDevice)) {
            logger.warn(
              `Refused AI dismiss of ${describeLocator(fix.locator)} (label "${fix.label ?? ''}", on-device [${onDevice.join(', ')}]): not a safe non-consenting control`,
            );
            return undefined;
          }
          if (!(await this.#adapter.tap(fix.locator))) {
            return undefined;
          }
          this.#noteDismissTap(fix.locator);
          return (await this.#tapCompletedByDismissal(step.kind))
            ? { kind: 'done' }
            : { kind: 'rerun' };
        }
        case 'wait':
          await runtime.executor.sleep(fix.waitMs);
          return { kind: 'rerun' };
        case 'scroll':
          await runtime.executor.scroll(fix.direction, fix.times);
          return { kind: 'rerun' };
        case 'hide-keyboard':
          await runtime.executor.hideKeyboard();
          return { kind: 'rerun' };
        case 'alternative-locator': {
          const onDevice = await this.#adapter.describe(fix.locator);
          if (this.#abandoned()) {
            return undefined;
          }
          if (
            onDevice.length === 0 ||
            !isSafeAlternativeFix(fix, step, onDevice)
          ) {
            logger.warn(
              `Refused AI alternative locator ${describeLocator(fix.locator)} (on-device [${onDevice.join(', ')}]): not found or not the same control`,
            );
            return undefined;
          }
          return { kind: 'locator', locator: fix.locator };
        }
      }
    } catch (error) {
      logger.warn(
        `Applying the AI flaky fix "${fix.type}" failed: ${errorMessage(error)}`,
      );
      return undefined;
    }
  }

  async #readRecoveryTarget(context: TapRetryContext): Promise<string[]> {
    try {
      return (await context.describeTarget()).map(normalizeDescriptor);
    } catch (error) {
      logger.debug(`Reading the tap target failed: ${errorMessage(error)}`);
      return [];
    }
  }

  /** True unless a fresh page source shows no control matching `locator`. */
  async #controlStillOnScreen(locator: RecoveredLocator): Promise<boolean> {
    const pageSource = await this.#safePageSource();
    return (
      pageSource === null ||
      pageSourceContainsLocator(pageSource, {
        strategy: 'text',
        value: locator.value,
      })
    );
  }

  #noteDismissTap(locator: RecoveredLocator): void {
    if (this.#recoveryTarget.includes(normalizeDescriptor(locator.value))) {
      this.#tappedRecoveryLocator = locator;
    }
  }

  async #dismissFirstKnownScreen(
    pageSource: string,
    trigger: InterruptionTrigger,
    intent: string,
  ): Promise<boolean> {
    return (
      (await this.#dismissFirstKnownScreenEvent(
        pageSource,
        trigger,
        intent,
      )) !== undefined
    );
  }

  async #dismissFirstKnownScreenEvent(
    pageSource: string,
    trigger: InterruptionTrigger,
    intent: string,
  ): Promise<InterruptingScreenDismissal | undefined> {
    for (const screen of this.#findKnownScreens(pageSource)) {
      const event = await this.#dismissKnownScreen(screen, trigger, intent);
      if (event) {
        return event;
      }
    }
    return undefined;
  }

  #findKnownScreens(pageSource: string): InterruptingScreenDefinition[] {
    return findInterruptingScreensInPageSource(
      pageSource,
      this.#config?.registry ?? INTERRUPTING_SCREEN_REGISTRY,
    );
  }

  async #safePageSource(): Promise<string | null> {
    try {
      return await this.#adapter.getPageSource();
    } catch (error) {
      logger.debug(`getPageSource failed: ${errorMessage(error)}`);
      return null;
    }
  }

  async #dismissKnownScreen(
    screen: InterruptingScreenDefinition,
    trigger: InterruptionTrigger,
    intent?: string,
  ): Promise<InterruptingScreenDismissal | undefined> {
    if (this.#abandoned()) {
      return undefined;
    }
    const startedAt = this.#adapter.now();
    for (const locator of screen.dismiss) {
      if (this.#abandoned()) {
        return undefined;
      }
      if (await this.#adapter.tap(locator)) {
        if (this.#abandoned()) {
          return undefined;
        }
        this.#noteDismissTap(locator);
        const event: InterruptingScreenDismissal = {
          screen: screen.name,
          source: 'registry',
          trigger,
          locator,
          intent,
          durationMs: this.#adapter.now() - startedAt,
          duringActiveTimer: TimerStore.hasActiveTimer(),
        };
        logger.info(
          `Dismissed known interrupting screen "${screen.name}" via ${locator.strategy}=${locator.value} (${trigger})`,
        );
        await this.#emit(event);
        return event;
      }
    }
    logger.warn(
      `Known interrupting screen "${screen.name}" detected but no dismiss control could be tapped`,
    );
    return undefined;
  }

  async #dismissWithAi(
    pageSource: string,
    context: RetryContext & { error: unknown },
  ): Promise<boolean> {
    if (this.#abandoned()) {
      return false;
    }
    const provider = this.#config?.aiProvider;
    const maxAttempts =
      this.#config?.maxAiAttemptsPerTest ?? DEFAULT_MAX_AI_ATTEMPTS_PER_TEST;
    if (!provider || this.#aiAttempts >= maxAttempts) {
      return false;
    }
    this.#aiAttempts++;

    const startedAt = this.#adapter.now();
    let decision;
    try {
      decision = await provider.identifyInterruption({
        driver: this.#adapter.driver(),
        pageSource,
        intent: context.intent,
        primaryError: errorMessage(context.error),
      });
    } catch (error) {
      logger.warn(`AI interruption check failed: ${errorMessage(error)}`);
      return false;
    }
    if (this.#abandoned()) {
      return false;
    }

    if (!decision?.blocking || !decision.dismissLocator) {
      logger.debug(
        `AI found no blocking overlay for "${context.intent}"${decision?.reason ? `: ${decision.reason}` : ''}`,
      );
      return false;
    }

    const locator = decision.dismissLocator;
    const onDevice = await this.#adapter.describe(locator);
    if (this.#abandoned()) {
      return false;
    }
    if (
      !isSafeDismissControl([locator.value, decision.dismissLabel, ...onDevice])
    ) {
      logger.warn(
        `Refused AI dismiss of "${decision.screenName}": ${locator.strategy}=${locator.value} (label "${decision.dismissLabel ?? ''}", on-device [${onDevice.join(', ')}]) is not a safe non-consenting control`,
      );
      return false;
    }

    if (!(await this.#adapter.tap(locator))) {
      return false;
    }
    if (this.#abandoned()) {
      return false;
    }
    this.#noteDismissTap(locator);

    const event: InterruptingScreenDismissal = {
      screen: decision.screenName,
      source: 'ai',
      trigger: context.trigger,
      locator,
      intent: context.intent,
      reason: decision.reason,
      durationMs: this.#adapter.now() - startedAt,
      duringActiveTimer: TimerStore.hasActiveTimer(),
    };
    logger.warn(
      `AI dismissed unknown interrupting screen "${decision.screenName}" via ${locator.strategy}=${locator.value}. Promote it to INTERRUPTING_SCREEN_REGISTRY if it recurs.`,
    );
    await this.#emit(event);
    return true;
  }

  async #emit(event: InterruptingScreenDismissal): Promise<void> {
    if (this.#abandoned()) {
      return;
    }
    const onDismissed = this.#config?.onDismissed;
    try {
      await onDismissed?.(event);
    } catch (error) {
      logger.debug(`onDismissed callback failed: ${errorMessage(error)}`);
    }
  }

  async #runExcluded<TResult>(
    phase: string,
    fn: () => Promise<TResult>,
  ): Promise<TResult> {
    const generation = this.#generation;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = () => {
        resolve();
      };
    });
    const previous = this.#turn;
    this.#turn = gate;
    try {
      await previous;
      if (generation !== this.#generation) {
        return await fn();
      }
      this.#ownedGeneration = generation;
      this.#handling = true;
      const startedAt = this.#adapter.now();
      try {
        return await withOverheadTrackingSuspended(fn);
      } finally {
        if (generation === this.#generation) {
          const elapsedMs = this.#adapter.now() - startedAt;
          TimerStore.excludeFromActiveTimers(elapsedMs);
          recordPhase(nestedPhase(phase), elapsedMs);
        }
        this.#handling = false;
      }
    } finally {
      release();
    }
  }
}

/** Shard totals skip `nested:` phases, which already sit inside their parent span. */
function nestedPhase(phase: string): string {
  return isNestedPhase(phase) ? phase : `${NESTED_PHASE_PREFIX}${phase}`;
}

/** Process-wide guard used by the shared Gestures / Assertions helpers. */
export const interruptingScreenGuard = new InterruptingScreenGuard();
