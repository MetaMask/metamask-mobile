import { wait } from './wait';

describe('wait', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve after specified duration', async () => {
    const promise = wait(100);
    jest.advanceTimersByTime(100);
    await promise;
    expect(promise).resolves.toBeUndefined();
  });

  it('should handle zero duration', async () => {
    const promise = wait(0);
    jest.advanceTimersByTime(0);
    await promise;
    expect(promise).resolves.toBeUndefined();
  });

  it('should return a Promise that resolves to undefined', async () => {
    const promise = wait(10);
    jest.advanceTimersByTime(10);
    const result = await promise;
    expect(result).toBeUndefined();
  });
});
