interface BatchingEntry {
  id: string;
}

/**
 * Function that fetches data for a batch of entries.
 * Must return a record keyed by entry.id
 */
type BatchFetchFn<Entry extends BatchingEntry, Result> = (
  entries: Entry[],
) => Promise<Record<Entry['id'], Result>>;

interface QueueEntry<Entry extends BatchingEntry, Result> {
  entry: Entry;
  resolve: (data: Result) => void;
  reject: (error: unknown) => void;
}

/**
 * Creates a debounced fetcher for batching entries.
 *
 * Individual calls to `.fetch(entry)` are accumulated in a queue.
 * The queue is dispatched — split into chunks of at most `batchSize` — either
 * when it reaches `batchSize` entries or when `maxWaitMs` has elapsed since
 * the first entry was added, whichever comes first.
 *
 * Each chunk is dispatched as an independent call to `fetchFn`, so multiple
 * chunks can be in-flight concurrently.
 *
 * @example
 * // Create a custom fetcher for testing
 * const fetcher = createBatchFetchWithDebounce({
 *   batchSize: 5,
 *   maxWaitMs: 100,
 *   fetchFn: myFetchFn,
 * });
 * const data = await fetcher({ id: 'eip155:1/erc20:0xabc...' });
 *
 * @param options - Configuration: batchSize, maxWaitMs, and the underlying fetchFn.
 * @returns A BatchFetchWithDebounce instance.
 */
export function createBatchFetchWithDebounce<
  Entry extends BatchingEntry,
  Result,
>(options: {
  /**
   * Maximum number of asset IDs to include in a single batch request.
   * When the queue reaches this size the batch is dispatched immediately,
   * without waiting for the timer.
   */
  batchSize: number;

  /**
   * Maximum time in milliseconds to wait before dispatching a pending batch.
   * A timer is started when the first item enters an empty queue.
   * Reaching batchSize cancels the timer and dispatches immediately.
   */
  maxWaitMs: number;

  /**
   * Underlying function used to resolve a batch of entries.
   */
  fetchFn: BatchFetchFn<Entry, Result>;
}): (entry: Entry) => Promise<Result> {
  const { batchSize, maxWaitMs, fetchFn } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;

  const queue: QueueEntry<Entry, Result>[] = [];

  /**
   * Dispatch a single pre-extracted batch of entries.
   * Errors from fetchFn are forwarded to every entry in the batch.
   */
  const dispatchBatch = async (
    batch: QueueEntry<Entry, Result>[],
  ): Promise<void> => {
    try {
      const batchResults = await fetchFn(
        batch.map((batchedEntry) => batchedEntry.entry),
      );

      for (const batchedEntry of batch) {
        const entryId = batchedEntry.entry.id as keyof typeof batchResults;
        const result = batchResults[entryId];

        if (result === undefined) {
          batchedEntry.reject(
            new Error(`Result not found for entry ${entryId}`),
          );
        } else {
          batchedEntry.resolve(result);
        }
      }
    } catch (error) {
      for (const batchedEntry of batch) {
        batchedEntry.reject(error);
      }
    }
  };

  /**
   * Drain the entire queue, splitting it into chunks of batchSize and
   * firing each chunk as an independent dispatchBatch call.
   * Clears any pending timer.
   */
  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    // Drain in batchSize-sized chunks; each chunk is dispatched independently
    while (queue.length > 0) {
      const batch = queue.splice(0, batchSize);
      // Is it not necessary to await because dispatchBatch cannot throw
      dispatchBatch(batch);
    }
  };

  return (entry: Entry): Promise<Result> =>
    new Promise((resolve, reject) => {
      queue.push({ entry, resolve, reject });

      if (queue.length >= batchSize) {
        // Batch is full — dispatch immediately without waiting for the timer
        flush();
      } else {
        // Start the countdown if not already running
        if (timer !== null) return;
        timer = setTimeout(() => {
          timer = null;
          flush();
        }, maxWaitMs);
      }
    });
}
