import { createLimiter, dedupe, mapWithConcurrency } from './async';

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (error: Error) => void;
}

const deferred = <Value>(): Deferred<Value> => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

/** Lets every pending promise continuation run. */
const flushPromises = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

/**
 * Calls that wait until released, recording how many run at once.
 *
 * @returns The call factory, its record and its pending calls.
 */
const heldCalls = () => {
  const pending: Deferred<string>[] = [];
  const concurrency = { running: 0, max: 0 };
  const started: string[] = [];
  const call = (name: string) => async (): Promise<string> => {
    started.push(name);
    concurrency.running += 1;
    concurrency.max = Math.max(concurrency.max, concurrency.running);
    const held = deferred<string>();
    pending.push(held);
    try {
      return await held.promise;
    } finally {
      concurrency.running -= 1;
    }
  };
  return { call, concurrency, started, pending };
};

describe('dedupe', () => {
  it('shares one run between concurrent callers of a key', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const run = jest.fn<Promise<string>, []>().mockResolvedValue('result');

    const results = await Promise.all([
      dedupe(inFlight, 'key', run),
      dedupe(inFlight, 'key', run),
    ]);

    expect(results).toEqual(['result', 'result']);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs once per key for different keys', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const run = jest.fn<Promise<string>, []>().mockResolvedValue('result');

    await Promise.all([
      dedupe(inFlight, 'first', run),
      dedupe(inFlight, 'second', run),
    ]);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs again for a key whose run settled', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const run = jest.fn<Promise<string>, []>().mockResolvedValue('result');
    await dedupe(inFlight, 'key', run);

    await dedupe(inFlight, 'key', run);

    expect(run).toHaveBeenCalledTimes(2);
    expect(inFlight.size).toBe(0);
  });

  it('shares a rejection and forgets the key afterwards', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const error = new Error('Read failed');
    const run = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    const results = await Promise.allSettled([
      dedupe(inFlight, 'key', run),
      dedupe(inFlight, 'key', run),
    ]);

    expect(results).toEqual([
      { status: 'rejected', reason: error },
      { status: 'rejected', reason: error },
    ]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(inFlight.size).toBe(0);
  });

  it('keeps a newer run of the key when an older replaced run settles', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const older = deferred<string>();
    const olderRun = dedupe(inFlight, 'key', () => older.promise);
    const newer = new Promise<string>(() => undefined);
    inFlight.set('key', newer);

    older.resolve('older');
    await olderRun;

    expect(inFlight.get('key')).toBe(newer);
  });
});

describe('mapWithConcurrency', () => {
  it('maps every item in order', async () => {
    const items = [3, 1, 2];

    const results = await mapWithConcurrency(items, 2, async (item) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, item);
      });
      return item * 10;
    });

    expect(results).toEqual([30, 10, 20]);
  });

  it('runs at most the given number of mappers at once', async () => {
    const { call, concurrency, pending } = heldCalls();
    const items = ['a', 'b', 'c', 'd', 'e'];

    const mapping = mapWithConcurrency(items, 2, (item) => call(item)());
    await flushPromises();
    const startedAtOnce = pending.length;
    while (pending.length > 0) {
      pending.splice(0).forEach((held, index) => held.resolve(`${index}`));
      await flushPromises();
    }
    await mapping;

    expect(startedAtOnce).toBe(2);
    expect(concurrency.max).toBe(2);
  });

  it('runs one mapper at a time for a concurrency below one', async () => {
    const { call, concurrency, pending } = heldCalls();

    const mapping = mapWithConcurrency(['a', 'b'], 0, (item) => call(item)());
    await flushPromises();
    const startedAtOnce = pending.length;
    while (pending.length > 0) {
      pending.splice(0).forEach((held) => held.resolve('done'));
      await flushPromises();
    }
    await mapping;

    expect(startedAtOnce).toBe(1);
    expect(concurrency.max).toBe(1);
  });

  it('returns no results for no items without calling the mapper', async () => {
    const mapper = jest.fn<Promise<string>, [string]>();

    const results = await mapWithConcurrency([], 3, mapper);

    expect(results).toEqual([]);
    expect(mapper).not.toHaveBeenCalled();
  });

  it('rejects with the error of a failing mapper', async () => {
    const error = new Error('Mapper failed');

    const mapping = mapWithConcurrency([1, 2], 2, async (item) => {
      if (item === 2) {
        throw error;
      }
      return item;
    });

    await expect(mapping).rejects.toBe(error);
  });
});

describe('createLimiter', () => {
  it('returns the result of the limited call', async () => {
    const limit = createLimiter(2);

    const result = await limit(async () => 'result');

    expect(result).toBe('result');
  });

  it('runs at most the given number of calls at once', async () => {
    const limit = createLimiter(2);
    const { call, concurrency, started } = heldCalls();

    ['a', 'b', 'c'].forEach((name) => limit(call(name)));
    await flushPromises();

    expect(started).toEqual(['a', 'b']);
    expect(concurrency.max).toBe(2);
  });

  it('starts waiting calls in order as slots free', async () => {
    const limit = createLimiter(1);
    const { call, started, pending } = heldCalls();
    const calls = ['a', 'b', 'c'].map((name) => limit(call(name)));
    await flushPromises();

    pending[0].resolve('a');
    await flushPromises();
    const startedAfterFirst = [...started];
    pending[1].resolve('b');
    await flushPromises();
    pending[2].resolve('c');
    const results = await Promise.all(calls);

    expect(startedAfterFirst).toEqual(['a', 'b']);
    expect(started).toEqual(['a', 'b', 'c']);
    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('reserves a released slot for the queued call before admitting a new arrival', async () => {
    const limit = createLimiter(1);
    const firstGate = deferred<string>();
    const secondGate = deferred<string>();
    const started: string[] = [];
    const first = limit(() => {
      started.push('first');
      return firstGate.promise;
    });
    const second = limit(() => {
      started.push('second');
      return secondGate.promise;
    });

    firstGate.resolve('first');
    const third = Promise.resolve().then(() =>
      limit(async () => {
        started.push('third');
        return 'third';
      }),
    );
    await first;
    await flushPromises();
    const startedBeforeSecondCompletes = [...started];
    secondGate.resolve('second');
    const results = await Promise.all([first, second, third]);

    expect(startedBeforeSecondCompletes).toEqual(['first', 'second']);
    expect(started).toEqual(['first', 'second', 'third']);
    expect(results).toEqual(['first', 'second', 'third']);
  });

  it('frees the slot of a call that rejects and rejects with its error', async () => {
    const limit = createLimiter(1);
    const { call, started, pending } = heldCalls();
    const error = new Error('Call failed');
    const failing = limit(call('a'));
    failing.catch(() => undefined);
    limit(call('b'));
    await flushPromises();

    pending[0].reject(error);
    await flushPromises();

    await expect(failing).rejects.toBe(error);
    expect(started).toEqual(['a', 'b']);
  });

  it('frees the slot of a call that throws before returning a promise', async () => {
    const limit = createLimiter(1);
    const error = new Error('Call threw');
    const failing = limit(() => {
      throw error;
    });
    failing.catch(() => undefined);

    const result = await limit(async () => 'next');

    await expect(failing).rejects.toBe(error);
    expect(result).toBe('next');
  });

  it('runs one call at a time for a concurrency below one', async () => {
    const limit = createLimiter(0);
    const { call, started } = heldCalls();

    ['a', 'b'].forEach((name) => limit(call(name)));
    await flushPromises();

    expect(started).toEqual(['a']);
  });

  it('keeps the slots of separate limiters apart', async () => {
    const first = createLimiter(1);
    const second = createLimiter(1);
    const { call, started } = heldCalls();

    first(call('first'));
    second(call('second'));
    await flushPromises();

    expect(started).toEqual(['first', 'second']);
  });
});
