/* eslint-disable import-x/no-nodejs-modules -- AsyncLocalStorage for per-test PhaseTimer binding */
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Canonical Appium smoke fixture/login phases.
 * Sibling durations in milliseconds.
 */
export const APPIUM_PHASES = [
  'servers_start',
  'app_clear',
  'context_reset',
  'app_launch',
  'fixture_bootstrap',
  'login',
  'modal_dismissal',
  'test_body',
  'teardown',
] as const;

export type AppiumPhase = (typeof APPIUM_PHASES)[number];

export type PhaseName = AppiumPhase | (string & {});

export interface PhaseTimerMeta {
  platform?: 'android' | 'ios' | string;
  suite?: string;
  spec?: string;
  title?: string;
  retry?: number;
  outcome?: string;
  sessionReused?: boolean;
  sessionRecreated?: boolean;
  sessionCreationMs?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PhaseTimerSnapshot {
  phases: Record<string, number>;
  meta: PhaseTimerMeta;
}

export interface PhaseTimer {
  /** Start an exclusive phase; stops the previous phase and accumulates duration. */
  start(phase: PhaseName): void;
  /** Add an absolute duration for a phase (e.g. soft-reload measurements). */
  record(phase: PhaseName, ms: number): void;
  /** Stop the current running phase without starting another. */
  stop(): void;
  setMeta(meta: Partial<PhaseTimerMeta>): void;
  snapshot(): PhaseTimerSnapshot;
}

export interface CreatePhaseTimerOptions {
  /** Clock for tests; defaults to `Date.now`. */
  now?: () => number;
}

const storage = new AsyncLocalStorage<PhaseTimer>();

class PhaseTimerImpl implements PhaseTimer {
  readonly #phases = new Map<string, number>();
  readonly #now: () => number;
  #meta: PhaseTimerMeta = {};
  #currentPhase: string | null = null;
  #currentStartedAt: number | null = null;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  start(phase: PhaseName): void {
    this.#stopCurrent();
    this.#currentPhase = phase;
    this.#currentStartedAt = this.#now();
  }

  record(phase: PhaseName, ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }
    const previous = this.#phases.get(phase) ?? 0;
    this.#phases.set(phase, previous + ms);
  }

  stop(): void {
    this.#stopCurrent();
  }

  setMeta(meta: Partial<PhaseTimerMeta>): void {
    this.#meta = { ...this.#meta, ...meta };
  }

  snapshot(): PhaseTimerSnapshot {
    this.#stopCurrent();
    const phases: Record<string, number> = {};
    for (const [name, ms] of this.#phases.entries()) {
      phases[name] = ms;
    }
    return { phases, meta: { ...this.#meta } };
  }

  #stopCurrent(): void {
    if (this.#currentPhase === null || this.#currentStartedAt === null) {
      this.#currentPhase = null;
      this.#currentStartedAt = null;
      return;
    }
    const elapsed = this.#now() - this.#currentStartedAt;
    const previous = this.#phases.get(this.#currentPhase) ?? 0;
    this.#phases.set(this.#currentPhase, previous + elapsed);
    this.#currentPhase = null;
    this.#currentStartedAt = null;
  }
}

export function createPhaseTimer(
  options: CreatePhaseTimerOptions = {},
): PhaseTimer {
  return new PhaseTimerImpl(options.now);
}

export function runWithPhaseTimer<T>(
  timer: PhaseTimer,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run(timer, fn);
}

/**
 * Active timer for the current async context, or `undefined` outside a fixture.
 * Callers must no-op safely when missing (Detox / unit paths).
 */
export function getPhaseTimer(): PhaseTimer | undefined {
  return storage.getStore();
}

/** Convenience: start a phase when a timer is bound. */
export function startPhase(phase: PhaseName): void {
  getPhaseTimer()?.start(phase);
}

/** Convenience: record absolute ms when a timer is bound. */
export function recordPhase(phase: PhaseName, ms: number): void {
  getPhaseTimer()?.record(phase, ms);
}

/** Convenience: stop current phase when a timer is bound. */
export function stopPhase(): void {
  getPhaseTimer()?.stop();
}

export const PHASE_TIMINGS_ATTACHMENT_NAME = 'appium-phase-timings';
