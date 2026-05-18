export interface CreateAsyncBatcherOptions<TInput, TResult> {
  /** Invoked once per flush with every input accumulated since the last flush. */
  processBatch: (inputs: TInput[]) => Promise<TResult>;
  /** Idle window (ms) before a batch is flushed; reset on every submit. Defaults to `300`. */
  delayMs?: number;
  /** Hard cap (ms) on how long inputs can sit in the buffer before a forced flush. Defaults to `1500`. */
  maxDelayMs?: number;
}

export interface AsyncBatcher<TInput, TResult> {
  /** Enqueue an input; the returned promise resolves with the outcome of the flush that consumes it. */
  submit: (input: TInput) => Promise<TResult>;
  /** Force the current batch (if any) to flush synchronously. */
  flush: () => Promise<TResult | undefined>;
  /** True while inputs are buffered or a flush is in flight. */
  isPending: () => boolean;
  /** Discard pending inputs without invoking the processor; rejects outstanding submits. */
  cancel: (reason?: unknown) => void;
}

const DEFAULT_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 1500;

/**
 * Trailing-edge debounced batcher that coalesces multiple submissions into a single asynchronous flush. Used by the watchlist mutation hooks (tech spec §2.3) so optimistic UI updates can fire freely while the underlying storage layer only sees one read-modify-write per burst.
 *
 * Semantics:
 * - Each `submit` enqueues an input and resets the idle timer; when the timer (or `maxDelayMs` cap) fires the processor runs with every accumulated input.
 * - Inputs that arrive while a flush is in flight accumulate into the next batch — they never join an in-flight flush.
 * - Errors thrown by `processBatch` reject every contributing `submit`; the batcher remains usable for subsequent calls.
 */
export function createAsyncBatcher<TInput, TResult>(
  options: CreateAsyncBatcherOptions<TInput, TResult>,
): AsyncBatcher<TInput, TResult> {
  const {
    processBatch,
    delayMs = DEFAULT_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
  } = options;

  interface Pending {
    inputs: TInput[];
    resolvers: ((value: TResult) => void)[];
    rejecters: ((reason: unknown) => void)[];
    idleTimer: ReturnType<typeof setTimeout> | null;
    maxTimer: ReturnType<typeof setTimeout> | null;
  }

  let pending: Pending | null = null;
  let inFlight: Promise<TResult> | null = null;
  let activeFlushes = 0;

  const clearTimers = (batch: Pending): void => {
    if (batch.idleTimer !== null) clearTimeout(batch.idleTimer);
    if (batch.maxTimer !== null) clearTimeout(batch.maxTimer);
    batch.idleTimer = null;
    batch.maxTimer = null;
  };

  const flushNow = async (): Promise<TResult | undefined> => {
    if (!pending) return undefined;
    const batch = pending;
    pending = null;
    clearTimers(batch);

    // `activeFlushes` is decremented before resolvers fire so callers that
    // check `isPending()` immediately after `await submit(...)` see the
    // batcher as idle. Resolvers run after the finally block.
    const runFlush = async (): Promise<TResult> => {
      activeFlushes++;
      let outcome:
        | { kind: 'ok'; value: TResult }
        | { kind: 'err'; reason: unknown };
      try {
        outcome = { kind: 'ok', value: await processBatch(batch.inputs) };
      } catch (error) {
        outcome = { kind: 'err', reason: error };
      } finally {
        activeFlushes--;
      }
      if (outcome.kind === 'err') {
        for (const reject of batch.rejecters) reject(outcome.reason);
        throw outcome.reason;
      }
      for (const resolve of batch.resolvers) resolve(outcome.value);
      return outcome.value;
    };

    // Chain after any in-flight flush so batches never overlap.
    const next: Promise<TResult> = inFlight
      ? inFlight.then(runFlush, runFlush)
      : runFlush();
    inFlight = next;
    try {
      return await next;
    } finally {
      if (inFlight === next) inFlight = null;
    }
  };

  const scheduleFlush = (batch: Pending): void => {
    if (batch.idleTimer !== null) clearTimeout(batch.idleTimer);
    // Submit-promise rejection is handled inside `runFlush`, so we can
    // safely swallow any rejection that propagates back to the timer.
    batch.idleTimer = setTimeout(
      () => flushNow().catch(() => undefined),
      delayMs,
    );
    if (batch.maxTimer === null && Number.isFinite(maxDelayMs)) {
      batch.maxTimer = setTimeout(
        () => flushNow().catch(() => undefined),
        maxDelayMs,
      );
    }
  };

  const submit = (input: TInput): Promise<TResult> =>
    new Promise<TResult>((resolve, reject) => {
      if (!pending) {
        pending = {
          inputs: [],
          resolvers: [],
          rejecters: [],
          idleTimer: null,
          maxTimer: null,
        };
      }
      pending.inputs.push(input);
      pending.resolvers.push(resolve);
      pending.rejecters.push(reject);
      scheduleFlush(pending);
    });

  const cancel = (
    reason: unknown = new Error('AsyncBatcher cancelled'),
  ): void => {
    if (!pending) return;
    const batch = pending;
    pending = null;
    clearTimers(batch);
    for (const reject of batch.rejecters) reject(reason);
  };

  const isPending = (): boolean => pending !== null || activeFlushes > 0;

  return { submit, flush: flushNow, isPending, cancel };
}
