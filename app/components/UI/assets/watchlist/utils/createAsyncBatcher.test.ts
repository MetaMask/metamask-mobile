import { createAsyncBatcher } from './createAsyncBatcher';

// The global test setup at `app/util/test/testSetup.js` freezes
// `Date.now()` to a constant, which breaks lodash's `debounce` (it
// tracks elapsed time via `Date.now()`). Restore the real clock for
// every test in this suite.
const frozenDateNow = Date.now;
beforeAll(() => {
  Date.now = () => new Date().getTime();
});
afterAll(() => {
  Date.now = frozenDateNow;
});

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe('createAsyncBatcher', () => {
  it('coalesces multiple submits into a single process call after the idle window', async () => {
    const processor = jest.fn(async () => undefined);
    const batcher = createAsyncBatcher<number>(processor, 20);

    const a = batcher.submit(1);
    const b = batcher.submit(2);
    const c = batcher.submit(3);

    expect(processor).not.toHaveBeenCalled();

    await Promise.all([a, b, c]);

    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('resets the idle timer on each submit until the burst settles', async () => {
    const processor = jest.fn(async () => undefined);
    const batcher = createAsyncBatcher<string>(processor, 30);

    batcher.submit('a');
    await wait(15);
    batcher.submit('b');
    await wait(15);
    expect(processor).not.toHaveBeenCalled();

    await batcher.submit('c');

    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('rejects every submit that contributed to a failing batch', async () => {
    const error = new Error('boom');
    const processor = jest.fn(async () => {
      throw error;
    });
    const batcher = createAsyncBatcher<string>(processor, 10);

    const a = batcher.submit('x');
    const b = batcher.submit('y');

    await expect(a).rejects.toBe(error);
    await expect(b).rejects.toBe(error);
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('processes successive batches sequentially via the inflight chain', async () => {
    let resolveFirst!: () => void;
    const processor = jest
      .fn<Promise<void>, [string[]]>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async () => undefined);

    const batcher = createAsyncBatcher<string>(processor, 10);

    const first = batcher.submit('a');
    await wait(20);
    expect(processor).toHaveBeenNthCalledWith(1, ['a']);

    // Queue a second batch while the first is still in flight.
    const second = batcher.submit('b');
    const third = batcher.submit('c');
    await wait(20);

    // The second batch must not start until the first resolves.
    expect(processor).toHaveBeenCalledTimes(1);

    resolveFirst();
    await Promise.all([first, second, third]);

    expect(processor).toHaveBeenCalledTimes(2);
    expect(processor).toHaveBeenNthCalledWith(2, ['b', 'c']);
  });

  it('flush() forces the pending batch to run immediately and resolves once in-flight work settles', async () => {
    const processor = jest.fn(async () => undefined);
    const batcher = createAsyncBatcher<number>(processor, 1000);

    batcher.submit(1);
    batcher.submit(2);

    await batcher.flush();

    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith([1, 2]);
  });

  it('flush() is a no-op when there is nothing pending', async () => {
    const processor = jest.fn(async () => undefined);
    const batcher = createAsyncBatcher<number>(processor, 100);

    await batcher.flush();

    expect(processor).not.toHaveBeenCalled();
  });
});
