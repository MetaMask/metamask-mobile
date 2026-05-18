import { createAsyncBatcher } from './createAsyncBatcher';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

describe('createAsyncBatcher', () => {
  it('coalesces multiple submits into a single processBatch call after the idle window', async () => {
    const processBatch = jest.fn(async (inputs: number[]) => inputs.length);
    const batcher = createAsyncBatcher({ processBatch, delayMs: 20 });

    const a = batcher.submit(1);
    const b = batcher.submit(2);
    const c = batcher.submit(3);

    expect(processBatch).not.toHaveBeenCalled();

    await expect(a).resolves.toBe(3);
    await expect(b).resolves.toBe(3);
    await expect(c).resolves.toBe(3);
    expect(processBatch).toHaveBeenCalledTimes(1);
    expect(processBatch).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('resets the idle timer on each submit until the burst settles', async () => {
    const processBatch = jest.fn(async (inputs: string[]) => inputs.join(','));
    const batcher = createAsyncBatcher({ processBatch, delayMs: 30 });

    batcher.submit('a');
    await wait(15);
    batcher.submit('b');
    await wait(15);
    expect(processBatch).not.toHaveBeenCalled();

    const last = batcher.submit('c');
    await expect(last).resolves.toBe('a,b,c');
    expect(processBatch).toHaveBeenCalledTimes(1);
    expect(processBatch).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('forces a flush when maxDelayMs is reached even if submits keep coming', async () => {
    const processBatch = jest.fn(async (inputs: number[]) => inputs);
    const batcher = createAsyncBatcher({
      processBatch,
      delayMs: 50,
      maxDelayMs: 80,
    });

    const a = batcher.submit(1);
    await wait(30);
    const b = batcher.submit(2);
    await wait(30);
    const c = batcher.submit(3);
    await wait(30);

    await expect(a).resolves.toStrictEqual([1, 2, 3]);
    await expect(b).resolves.toStrictEqual([1, 2, 3]);
    await expect(c).resolves.toStrictEqual([1, 2, 3]);
    expect(processBatch).toHaveBeenCalledTimes(1);
    expect(processBatch).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('rejects every submit that contributed to a failing flush', async () => {
    const error = new Error('boom');
    const processBatch = jest.fn(async () => {
      throw error;
    });
    const batcher = createAsyncBatcher({ processBatch, delayMs: 10 });

    const a = batcher.submit('x');
    const b = batcher.submit('y');

    await expect(a).rejects.toBe(error);
    await expect(b).rejects.toBe(error);
    expect(processBatch).toHaveBeenCalledTimes(1);
  });

  it('queues new submits as a separate batch while a flush is in flight', async () => {
    let resolveFirst!: (value: string) => void;
    const processBatch = jest
      .fn<Promise<string>, [string[]]>()
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async (inputs) => inputs.join('|'));

    const batcher = createAsyncBatcher({ processBatch, delayMs: 10 });

    const first = batcher.submit('a');
    await wait(20);
    expect(processBatch).toHaveBeenNthCalledWith(1, ['a']);

    const second = batcher.submit('b');
    const third = batcher.submit('c');
    await wait(20);

    expect(processBatch).toHaveBeenCalledTimes(1);

    resolveFirst('done');
    await expect(first).resolves.toBe('done');

    await expect(second).resolves.toBe('b|c');
    await expect(third).resolves.toBe('b|c');
    expect(processBatch).toHaveBeenCalledTimes(2);
    expect(processBatch).toHaveBeenNthCalledWith(2, ['b', 'c']);
  });

  it('flush() runs the pending batch immediately and resolves with its result', async () => {
    const processBatch = jest.fn(async (inputs: number[]) =>
      inputs.reduce((sum, n) => sum + n, 0),
    );
    const batcher = createAsyncBatcher({ processBatch, delayMs: 1000 });

    const submitted = batcher.submit(1);
    batcher.submit(2);

    await expect(batcher.flush()).resolves.toBe(3);
    await expect(submitted).resolves.toBe(3);
    expect(processBatch).toHaveBeenCalledTimes(1);
  });

  it('flush() returns undefined when there is nothing pending', async () => {
    const processBatch = jest.fn(async () => 0);
    const batcher = createAsyncBatcher({ processBatch, delayMs: 100 });

    await expect(batcher.flush()).resolves.toBeUndefined();
    expect(processBatch).not.toHaveBeenCalled();
  });

  it('isPending reflects buffered inputs and in-flight processing', async () => {
    let resolveFirst!: (value: void) => void;
    const processBatch = jest
      .fn<Promise<void>, [number[]]>()
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      );

    const batcher = createAsyncBatcher({ processBatch, delayMs: 10 });

    expect(batcher.isPending()).toBe(false);

    const submitted = batcher.submit(1);
    expect(batcher.isPending()).toBe(true);

    await wait(20);
    expect(processBatch).toHaveBeenCalledTimes(1);
    expect(batcher.isPending()).toBe(true);

    resolveFirst();
    await submitted;
    expect(batcher.isPending()).toBe(false);
  });

  it('cancel rejects every pending submit and clears the buffer', async () => {
    const processBatch = jest.fn(async () => undefined);
    const batcher = createAsyncBatcher({ processBatch, delayMs: 100 });

    const a = batcher.submit('a');
    const b = batcher.submit('b');

    const reason = new Error('user navigated away');
    batcher.cancel(reason);

    await expect(a).rejects.toBe(reason);
    await expect(b).rejects.toBe(reason);

    await wait(150);
    expect(processBatch).not.toHaveBeenCalled();
    expect(batcher.isPending()).toBe(false);
  });
});
