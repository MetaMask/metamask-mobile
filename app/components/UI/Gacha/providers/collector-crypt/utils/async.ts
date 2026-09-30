/**
 * Runs `run` once per key: concurrent callers share the same promise until it
 * settles.
 *
 * @param inFlight - Promises in flight, by key.
 * @param key - Deduplication key.
 * @param run - Work to start when nothing is in flight for the key.
 * @returns The shared promise.
 */
export const dedupe = <Result>(
  inFlight: Map<string, Promise<Result>>,
  key: string,
  run: () => Promise<Result>,
): Promise<Result> => {
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const promise = run().finally(() => {
    // A wallet reset may have replaced this run with a newer one for the key.
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, promise);
  return promise;
};

/**
 * Maps items with at most `concurrency` calls in flight. Order is preserved.
 *
 * @param items - Items to map.
 * @param concurrency - Max concurrent calls (at least 1).
 * @param mapper - Async mapper.
 * @returns The mapped values.
 */
export const mapWithConcurrency = async <Item, Result>(
  items: readonly Item[],
  concurrency: number,
  mapper: (item: Item) => Promise<Result>,
): Promise<Result[]> => {
  const results: Result[] = new Array(items.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  };
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
};
