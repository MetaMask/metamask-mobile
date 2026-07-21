import { debounce } from 'lodash';

export interface AsyncBatcher<T> {
  /**
   * Enqueue an item. The returned promise resolves (or rejects) when the
   * batch that consumes this item finishes processing.
   */
  submit: (item: T) => Promise<void>;
  /**
   * Force the pending batch (if any) to run immediately and return a
   * promise that resolves once all in-flight batches have settled.
   */
  flush: () => Promise<void>;
}

/**
 * Trailing-edge debounced batcher. Each `submit(item)` pushes into a
 * shared buffer; after `waitMs` of idle the buffer is drained by
 * `processor(batch)`. Batches are chained sequentially so writes
 * serialize against each other, and each `submit` promise tracks the
 * batch that eventually consumes it.
 */
export function createAsyncBatcher<T>(
  processor: (items: T[]) => Promise<void>,
  waitMs = 200,
): AsyncBatcher<T> {
  let queue: T[] = [];
  let resolvers: (() => void)[] = [];
  let rejecters: ((reason: unknown) => void)[] = [];
  let inflight: Promise<void> = Promise.resolve();

  const drain = (): void => {
    if (queue.length === 0) return;
    const batch = queue;
    const batchResolvers = resolvers;
    const batchRejecters = rejecters;
    queue = [];
    resolvers = [];
    rejecters = [];

    // The inflight chain always resolves so that we never leak an
    // unhandled rejection between tests or callers that only attach a
    // handler to one of the per-submit promises. Failures still
    // propagate to every caller via `batchRejecters`.
    inflight = inflight.then(async () => {
      try {
        await processor(batch);
        batchResolvers.forEach((r) => r());
      } catch (error) {
        batchRejecters.forEach((r) => r(error));
      }
    });
  };

  const debouncedDrain = debounce(drain, waitMs);

  return {
    submit: (item) =>
      new Promise<void>((resolve, reject) => {
        queue.push(item);
        resolvers.push(resolve);
        rejecters.push(reject);
        debouncedDrain();
      }),
    flush: () => {
      debouncedDrain.flush();
      return inflight;
    },
  };
}
