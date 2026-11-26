import { createDeferredPromise } from '@metamask/utils';
import { createLimiter, dedupe, mapWithConcurrency } from './async';

interface HeldCall {
  started: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  run: () => Promise<string>;
}

const heldCalls = (
  names: string[],
): { calls: HeldCall[]; started: string[] } => {
  const started: string[] = [];
  const calls = names.map((name): HeldCall => {
    const start = createDeferredPromise();
    const result = createDeferredPromise<string>();
    return {
      started: start.promise,
      resolve: () => result.resolve(name),
      reject: result.reject,
      run: async () => {
        started.push(name);
        start.resolve();
        return result.promise;
      },
    };
  });
  return { calls, started };
};

describe('dedupe', () => {
  it('shares one run between concurrent callers of a key', async () => {
    const inFlight = new Map<string, Promise<string>>();
    const run = jest.fn<Promise<string>, []>().mockResolvedValue('result');

    const first = dedupe(inFlight, 'key', run);
    const second = dedupe(inFlight, 'key', run);

    expect(second).toBe(first);
    await expect(first).resolves.toBe('result');
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
    const older = createDeferredPromise<string>();
    const olderRun = dedupe(inFlight, 'key', async () => older.promise);
    const newer = new Promise<string>(() => undefined);
    inFlight.set('key', newer);

    older.resolve('older');
    await olderRun;

    expect(inFlight.get('key')).toBe(newer);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order when mappers finish out of order', async () => {
    const { calls } = heldCalls(['a', 'b', 'c']);
    const [first, second, third] = calls;
    const mapping = mapWithConcurrency(calls, 2, async (call) => call.run());

    await second.started;
    second.resolve();
    await third.started;
    third.resolve();
    first.resolve();

    await expect(mapping).resolves.toEqual(['a', 'b', 'c']);
  });

  it.each([
    [2, 2],
    [0, 1],
  ])('limits concurrency %i to %i active mappers', async (limit, slots) => {
    const names = ['a', 'b', 'c', 'd', 'e'];
    const { calls, started } = heldCalls(names);
    const mapping = mapWithConcurrency(calls, limit, async (call) =>
      call.run(),
    );

    for (const [index, call] of calls.entries()) {
      const count = Math.min(index + slots, calls.length);
      await calls[count - 1].started;
      expect(started).toEqual(names.slice(0, count));
      call.resolve();
    }
    await expect(mapping).resolves.toEqual(names);
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

  it('stops a serial worker when its mapper rejects', async () => {
    const error = new Error('Mapper failed');
    const mapper = jest
      .fn<Promise<number>, [number]>()
      .mockRejectedValue(error);

    const mapping = mapWithConcurrency([1, 2], 1, mapper);
    await expect(mapping).rejects.toBe(error);

    expect(mapper.mock.calls).toEqual([[1]]);
  });
});

describe('createLimiter', () => {
  it('returns the result of the limited call', async () => {
    const limit = createLimiter(2);

    const result = await limit(async () => 'result');

    expect(result).toBe('result');
  });

  it.each([
    [2, 2],
    [1, 1],
    [0, 1],
  ])(
    'admits queued calls in order with concurrency %i and %i active slots',
    async (concurrency, slots) => {
      const limit = createLimiter(concurrency);
      const names = ['a', 'b', 'c'];
      const { calls, started } = heldCalls(names);
      const results = Promise.all(calls.map(async (call) => limit(call.run)));

      for (const [index, call] of calls.entries()) {
        const count = Math.min(index + slots, calls.length);
        await calls[count - 1].started;
        expect(started).toEqual(names.slice(0, count));
        call.resolve();
      }
      await expect(results).resolves.toEqual(names);
    },
  );

  it('reserves a released slot for the queued call before admitting a new arrival', async () => {
    const limit = createLimiter(1);
    const firstGate = createDeferredPromise<string>();
    const secondGate = createDeferredPromise<string>();
    const secondStarted = createDeferredPromise();
    const started: string[] = [];
    const firstTask = jest
      .fn<Promise<string>, []>()
      .mockReturnValue(firstGate.promise);
    const first = limit(firstTask);
    const second = limit(async () => {
      started.push('second');
      secondStarted.resolve();
      return secondGate.promise;
    });

    firstGate.resolve('first');
    const third = Promise.resolve().then(async () =>
      limit(async () => {
        started.push('third');
        return 'third';
      }),
    );
    await Promise.all([first, secondStarted.promise]);
    const startedBeforeSecondCompletes = [...started];
    secondGate.resolve('second');
    const results = await Promise.all([first, second, third]);

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(startedBeforeSecondCompletes).toEqual(['second']);
    expect(started).toEqual(['second', 'third']);
    expect(results).toEqual(['first', 'second', 'third']);
  });

  it('frees the slot of a call that rejects and rejects with its error', async () => {
    const limit = createLimiter(1);
    const {
      calls: [first, second],
      started,
    } = heldCalls(['a', 'b']);
    const error = new Error('Call failed');
    const failing = limit(first.run);
    const next = limit(second.run);

    await first.started;
    first.reject(error);
    await expect(failing).rejects.toBe(error);
    await second.started;
    expect(started).toEqual(['a', 'b']);
    second.resolve();
    await expect(next).resolves.toBe('b');
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

  it('keeps the slots of separate limiters apart', async () => {
    const {
      calls: [first, second],
    } = heldCalls(['first', 'second']);
    const results = Promise.all([
      createLimiter(1)(first.run),
      createLimiter(1)(second.run),
    ]);

    await Promise.all([first.started, second.started]);
    first.resolve();
    second.resolve();

    await expect(results).resolves.toEqual(['first', 'second']);
  });
});
