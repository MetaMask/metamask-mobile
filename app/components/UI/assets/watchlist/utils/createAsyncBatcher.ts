/**
 * Options for {@link createAsyncBatcher}.
 */
export interface CreateAsyncBatcherOptions<TInput, TResult> {
  /**
   * Invoked once per flush with every input accumulated since the last
   * flush. The returned promise is propagated to every caller that
   * contributed to the batch via {@link AsyncBatcher.submit}.
   */
  processBatch: (inputs: TInput[]) => Promise<TResult>;
  /**
   * Idle window (ms) before a batch is flushed. Each new {@link AsyncBatcher.submit}
   * call resets the timer (trailing-edge debounce) so that bursts of
   * interactions collapse into a single backend write.
   *
   * Defaults to `300` ms which matches the rhythm of typical UI taps
   * without feeling sluggish.
   */
  delayMs?: number;
  /**
   * Maximum time (ms) a submitted input can sit in the buffer before the
   * batch is forcibly flushed. Prevents starvation under sustained user
   * interaction. `Infinity` disables the cap.
   *
   * Defaults to `1500` ms.
   */
  maxDelayMs?: number;
}

/**
 * Public surface returned by {@link createAsyncBatcher}.
 */
export interface AsyncBatcher<TInput, TResult> {
  /**
   * Adds an input to the pending batch and returns a promise that
   * resolves (or rejects) with the result of the flush that consumed it.
   *
   * Every caller that contributed to the same flush observes the same
   * outcome, mirroring how TanStack Query coalesces concurrent mutations.
   */
  submit: (input: TInput) => Promise<TResult>;
  /**
   * Forces the current batch (if any) to flush synchronously and returns
   * a promise that resolves with the flush outcome. Useful for tests and
   * for callers that need to ensure persistence before navigation.
   */
  flush: () => Promise<TResult | undefined>;
  /**
   * Indicates whether there are inputs waiting to be processed or a
   * flush is currently in flight. Consumers can use this to decide when
   * it is safe to invalidate dependent queries.
   */
  isPending: () => boolean;
  /**
   * Discards any pending inputs without invoking the processor. The
   * promises returned by previous {@link AsyncBatcher.submit} calls are
   * rejected with the provided reason (defaults to a generic abort
   * error).
   */
  cancel: (reason?: unknown) => void;
}

const DEFAULT_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 1500;

/**
 * Builds a trailing-edge debounced batcher that coalesces multiple calls
 * into a single asynchronous operation.
 *
 * This is the building block referenced in the WatchList tech spec
 * (section 2.3) that lets optimistic UI updates feel instant while
 * avoiding "mutation spam" against the underlying storage layer. The
 * watchlist mutation hooks all read-modify-write the same blob, so
 * collapsing a burst of taps into a single read-modify-write pass is
 * both correct and cheaper.
 *
 * Semantics:
 * - Each `submit` call enqueues an input and resets the idle timer. When the timer fires (or the `maxDelayMs` cap is hit), the processor is invoked with every accumulated input.
 * - If a flush is already in flight when new inputs arrive, the new inputs accumulate into the next batch — they never join an in-flight flush. This keeps the input set passed to `processBatch` deterministic from the caller's perspective.
 * - Errors thrown by `processBatch` reject every contributing `submit` promise. The batcher remains usable for subsequent calls.
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
    if (batch.idleTimer !== null) {
      clearTimeout(batch.idleTimer);
      batch.idleTimer = null;
    }
    if (batch.maxTimer !== null) {
      clearTimeout(batch.maxTimer);
      batch.maxTimer = null;
    }
  };

  const flushNow = async (): Promise<TResult | undefined> => {
    if (!pending) return undefined;

    const batch = pending;
    pending = null;
    clearTimers(batch);

    // Decrement before notifying callers so any `isPending()` checks made
    // synchronously after `await submit(...)` correctly observe the
    // batcher as idle.
    const runFlush = async (): Promise<TResult> => {
      activeFlushes++;
      let outcome:
        | { kind: 'ok'; value: TResult }
        | { kind: 'err'; reason: unknown };
      try {
        const value = await processBatch(batch.inputs);
        outcome = { kind: 'ok', value };
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

    // Chain after any in-flight flush so processors observe the batches
    // in submission order and never overlap.
    const next: Promise<TResult> = inFlight
      ? inFlight.then(runFlush, runFlush)
      : runFlush();

    inFlight = next;

    try {
      return await next;
    } finally {
      if (inFlight === next) {
        inFlight = null;
      }
    }
  };

  const scheduleFlush = (batch: Pending): void => {
    if (batch.idleTimer !== null) {
      clearTimeout(batch.idleTimer);
    }
    batch.idleTimer = setTimeout(() => {
      // Swallow rejection here — every caller is already notified via
      // their own submit-promise rejection inside `runFlush`.
      flushNow().catch(() => undefined);
    }, delayMs);

    if (batch.maxTimer === null && Number.isFinite(maxDelayMs)) {
      batch.maxTimer = setTimeout(() => {
        flushNow().catch(() => undefined);
      }, maxDelayMs);
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
