/* eslint-disable import-x/no-nodejs-modules -- AsyncLocalStorage for per-test PhaseTimer binding */
import { AsyncLocalStorage } from 'node:async_hooks';

export type PhaseName = string;

/**
 * Elapsed steps recorded inside a parent phase. Their time is already in the
 * parent span, so shard totals must not add them again.
 */
export const NESTED_PHASE_PREFIX = 'nested:';

export function isNestedPhase(phase: string): boolean {
  return phase.startsWith(NESTED_PHASE_PREFIX);
}

function nestedPhaseName(phase: PhaseName): string {
  return isNestedPhase(phase) ? phase : `${NESTED_PHASE_PREFIX}${phase}`;
}

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
  start(phase: PhaseName): void;
  record(phase: PhaseName, ms: number): void;
  stop(): void;
  setMeta(meta: Partial<PhaseTimerMeta>): void;
  snapshot(): PhaseTimerSnapshot;
}

export interface CreatePhaseTimerOptions {
  now?: () => number;
}

const storage = new AsyncLocalStorage<PhaseTimer>();
/**
 * Fallback when Playwright's `use()` resumes the test outside the ALS store.
 * Meta is written on the timer object directly; phases go through getPhaseTimer().
 */
let activeTimer: PhaseTimer | undefined;

export function bindPhaseTimer(timer: PhaseTimer): () => void {
  const previous = activeTimer;
  activeTimer = timer;
  return () => {
    if (activeTimer === timer) {
      activeTimer = previous;
    }
  };
}

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
    this.#phases.set(phase, (this.#phases.get(phase) ?? 0) + ms);
  }

  stop(): void {
    this.#stopCurrent();
  }

  setMeta(meta: Partial<PhaseTimerMeta>): void {
    this.#meta = { ...this.#meta, ...meta };
  }

  snapshot(): PhaseTimerSnapshot {
    this.#stopCurrent();
    return {
      phases: Object.fromEntries(this.#phases.entries()),
      meta: { ...this.#meta },
    };
  }

  #stopCurrent(): void {
    if (this.#currentPhase === null || this.#currentStartedAt === null) {
      this.#currentPhase = null;
      this.#currentStartedAt = null;
      return;
    }
    const elapsed = this.#now() - this.#currentStartedAt;
    this.#phases.set(
      this.#currentPhase,
      (this.#phases.get(this.#currentPhase) ?? 0) + elapsed,
    );
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
  const unbind = bindPhaseTimer(timer);
  let result: T | Promise<T>;
  try {
    result = storage.run(timer, fn);
  } catch (error) {
    unbind();
    throw error;
  }
  if (result instanceof Promise) {
    return result.finally(unbind);
  }
  unbind();
  return result;
}

export function getPhaseTimer(): PhaseTimer | undefined {
  return storage.getStore() ?? activeTimer;
}

/**
 * ALS store only — ignores the activeTimer fallback.
 * Tests use this to prove a real context gap while getPhaseTimer() still resolves.
 */
export function getPhaseTimerAlsStore(): PhaseTimer | undefined {
  return storage.getStore();
}

export function startPhase(phase: PhaseName): void {
  getPhaseTimer()?.start(phase);
}

export function recordPhase(phase: PhaseName, ms: number): void {
  getPhaseTimer()?.record(phase, ms);
}

/**
 * Playwright prints `error.stack` when it is set, and V8 does not rewrite that
 * string when `error.message` changes.
 */
function annotateElapsedError(error: unknown, note: string): Error {
  if (error instanceof Error) {
    const original = error.message;
    error.message = `${original} (${note})`;
    if (error.stack) {
      error.stack = error.stack.replace(original, error.message);
    }
    return error;
  }
  return new Error(`${note}: ${String(error)}`);
}

/**
 * Time `run` and add it as a nested step without stopping the current phase.
 * The stored name is prefixed so shard totals do not add it on top of the parent.
 * A thrown error keeps its message, with the phase name and elapsed ms appended
 * on both `message` and `stack`. Arguments to `run` are not written onto the error.
 */
export async function recordElapsedPhase<T>(
  phase: PhaseName,
  run: () => Promise<T>,
  now: () => number = Date.now,
): Promise<T> {
  const startedAt = now();
  const storedPhase = nestedPhaseName(phase);
  try {
    const value = await run();
    recordPhase(storedPhase, now() - startedAt);
    return value;
  } catch (error) {
    const elapsedMs = now() - startedAt;
    recordPhase(storedPhase, elapsedMs);
    throw annotateElapsedError(error, `${phase} after ${elapsedMs}ms`);
  }
}

export function stopPhase(): void {
  getPhaseTimer()?.stop();
}

export const PHASE_TIMINGS_ATTACHMENT_NAME = 'appium-phase-timings';
