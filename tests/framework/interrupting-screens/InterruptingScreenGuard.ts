import type { Browser } from 'webdriverio';
import AppiumGestures from '../AppiumGestures.ts';
import {
  getDriver,
  withOverheadTrackingSuspended,
} from '../AppiumUtilities.ts';
import TimerStore from '../TimerStore.ts';
import { createAppiumLogger } from '../appiumLogger.ts';
import { recordPhase } from '../telemetry/PhaseTimer.ts';
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
  findInterruptingScreensInPageSource,
  INTERRUPTING_SCREEN_REGISTRY,
  type InterruptingScreenDefinition,
} from './InterruptingScreenRegistry.ts';

const logger = createAppiumLogger('InterruptingScreenGuard');

/** Phase that accumulates post-login settle windows (overlaps its enclosing phase). */
export const INTERRUPTING_SCREEN_SETTLE_PHASE = 'interrupting_screens_settle';
/** Phase that accumulates dismiss-and-retry recoveries (overlaps its enclosing phase). */
export const INTERRUPTING_SCREEN_RECOVERY_PHASE =
  'interrupting_screens_recovery';

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
}

export interface SettleOptions {
  windowMs?: number;
  pollIntervalMs?: number;
}

export interface RetryContext {
  intent: string;
  trigger: Exclude<InterruptionTrigger, 'settle'>;
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
        const control = await getElementForLocator(locator);
        // Sequential on purpose: one Appium session must not run commands concurrently.
        const values: string[] = [];
        for (const read of [
          () => control.getText(),
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
    if (!this.isActive()) {
      return [];
    }
    const windowMs = options.windowMs ?? resolveSettleWindowMs();
    if (windowMs <= 0) {
      return [];
    }
    const pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_SETTLE_POLL_INTERVAL_MS;

    return this.#runExcluded(INTERRUPTING_SCREEN_SETTLE_PHASE, async () => {
      const dismissed: InterruptingScreenDismissal[] = [];
      const failedAttempts = new Map<string, number>();
      const deadline = this.#adapter.now() + windowMs;

      while (dismissed.length < MAX_SETTLE_DISMISSALS) {
        const pageSource = await this.#safePageSource();
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
    context: RetryContext & { error: unknown },
  ): Promise<boolean> {
    if (!this.isActive()) {
      return false;
    }
    return this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      const pageSource = await this.#safePageSource();
      if (pageSource === null) {
        return false;
      }
      if (
        await this.#dismissFirstKnownScreen(
          pageSource,
          context.trigger,
          context.intent,
        )
      ) {
        return true;
      }
      return this.#dismissWithAi(pageSource, context);
    });
  }

  /**
   * Reads the page source once and dismisses the first known screen on it.
   * Registry only (no AI). For polling loops whose readiness checks cannot
   * pass while a sheet covers the screen, such as the wallet-home wait.
   */
  async dismissKnownScreen(intent: string): Promise<boolean> {
    if (!this.isActive()) {
      return false;
    }
    return this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      const pageSource = await this.#safePageSource();
      return (
        pageSource !== null &&
        this.#dismissFirstKnownScreen(pageSource, 'wait-failure', intent)
      );
    });
  }

  /**
   * Hands the current page source to `onPageSource` for diagnosis, unless the
   * screen can expose secrets. No-op when the guard is inactive.
   */
  async capturePageSource(label: string): Promise<void> {
    const onPageSource = this.#config?.onPageSource;
    if (!this.isActive() || !onPageSource) {
      return;
    }
    await this.#runExcluded(INTERRUPTING_SCREEN_RECOVERY_PHASE, async () => {
      const pageSource = await this.#safePageSource();
      if (pageSource === null || pageSourceContainsSecrets(pageSource)) {
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
    context: RetryContext,
  ): Promise<TResult> {
    try {
      return await action();
    } catch (error) {
      if (!(await this.recoverFromFailure({ ...context, error }))) {
        throw error;
      }
      logger.info(
        `Retrying "${context.intent}" after dismissing an interrupting screen`,
      );
      return action();
    }
  }

  async #dismissFirstKnownScreen(
    pageSource: string,
    trigger: InterruptionTrigger,
    intent: string,
  ): Promise<boolean> {
    for (const screen of this.#findKnownScreens(pageSource)) {
      if (await this.#dismissKnownScreen(screen, trigger, intent)) {
        return true;
      }
    }
    return false;
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
    const startedAt = this.#adapter.now();
    for (const locator of screen.dismiss) {
      if (await this.#adapter.tap(locator)) {
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

    if (!decision?.blocking || !decision.dismissLocator) {
      logger.debug(
        `AI found no blocking overlay for "${context.intent}"${decision?.reason ? `: ${decision.reason}` : ''}`,
      );
      return false;
    }

    const locator = decision.dismissLocator;
    const onDevice = await this.#adapter.describe(locator);
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
    try {
      await this.#config?.onDismissed?.(event);
    } catch (error) {
      logger.debug(`onDismissed callback failed: ${errorMessage(error)}`);
    }
  }

  async #runExcluded<TResult>(
    phase: string,
    fn: () => Promise<TResult>,
  ): Promise<TResult> {
    this.#handling = true;
    const startedAt = this.#adapter.now();
    try {
      return await withOverheadTrackingSuspended(fn);
    } finally {
      const elapsedMs = this.#adapter.now() - startedAt;
      this.#handling = false;
      TimerStore.excludeFromActiveTimers(elapsedMs);
      recordPhase(phase, elapsedMs);
    }
  }
}

/** Process-wide guard used by the shared Gestures / Assertions helpers. */
export const interruptingScreenGuard = new InterruptingScreenGuard();
