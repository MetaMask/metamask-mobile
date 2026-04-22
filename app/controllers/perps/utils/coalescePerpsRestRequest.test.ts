import {
  coalescePerpsRestRequest,
  resetPerpsRestCacheForTests,
} from './coalescePerpsRestRequest';

describe('coalescePerpsRestRequest', () => {
  beforeEach(() => {
    resetPerpsRestCacheForTests();
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetPerpsRestCacheForTests();
  });

  it('returns the fetcher result on first call', async () => {
    const fetcher = jest.fn().mockResolvedValue('v1');

    const result = await coalescePerpsRestRequest('k', fetcher);

    expect(result).toBe('v1');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shares the in-flight promise across concurrent callers', async () => {
    let resolveFetch!: (v: string) => void;
    const fetcher = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = coalescePerpsRestRequest('k', fetcher);
    const p2 = coalescePerpsRestRequest('k', fetcher);
    const p3 = coalescePerpsRestRequest('k', fetcher);

    resolveFetch('shared');
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1).toBe('shared');
    expect(r2).toBe('shared');
    expect(r3).toBe('shared');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves cached value within the TTL window', async () => {
    const fetcher = jest.fn().mockResolvedValue('cached');

    const first = await coalescePerpsRestRequest('k', fetcher, {
      ttlMs: 1000,
    });
    jest.setSystemTime(500);
    const second = await coalescePerpsRestRequest('k', fetcher, {
      ttlMs: 1000,
    });

    expect(first).toBe('cached');
    expect(second).toBe('cached');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const a = await coalescePerpsRestRequest('k', fetcher, { ttlMs: 1000 });
    jest.setSystemTime(1001);
    const b = await coalescePerpsRestRequest('k', fetcher, { ttlMs: 1000 });

    expect(a).toBe('first');
    expect(b).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('scopes cache by key', async () => {
    const fetcherA = jest.fn().mockResolvedValue('A');
    const fetcherB = jest.fn().mockResolvedValue('B');

    const rA = await coalescePerpsRestRequest('a', fetcherA);
    const rB = await coalescePerpsRestRequest('b', fetcherB);

    expect(rA).toBe('A');
    expect(rB).toBe('B');
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when forceRefresh is true', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('stale')
      .mockResolvedValueOnce('fresh');

    await coalescePerpsRestRequest('k', fetcher);
    const forced = await coalescePerpsRestRequest('k', fetcher, {
      forceRefresh: true,
    });

    expect(forced).toBe('fresh');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not let a stale in-flight resolution clobber a forceRefresh result', async () => {
    let resolveStale!: (v: string) => void;
    const staleFetcher = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveStale = resolve;
        }),
    );
    const freshFetcher = jest.fn().mockResolvedValue('fresh');

    const stalePromise = coalescePerpsRestRequest('k', staleFetcher);
    const freshPromise = coalescePerpsRestRequest('k', freshFetcher, {
      forceRefresh: true,
    });
    const freshResult = await freshPromise;

    resolveStale('stale');
    await stalePromise;

    // Next cached read must return the fresh value, not the late stale one.
    const cachedFetcher = jest.fn();
    const cachedResult = await coalescePerpsRestRequest('k', cachedFetcher);

    expect(freshResult).toBe('fresh');
    expect(cachedResult).toBe('fresh');
    expect(cachedFetcher).not.toHaveBeenCalled();
  });

  it('does not cache the value when the fetcher rejects', async () => {
    const rejectingFetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const retryFetcher = jest.fn().mockResolvedValue('ok');

    await expect(
      coalescePerpsRestRequest('k', rejectingFetcher),
    ).rejects.toThrow('boom');
    const retry = await coalescePerpsRestRequest('k', retryFetcher);

    expect(retry).toBe('ok');
    expect(retryFetcher).toHaveBeenCalledTimes(1);
  });

  it('evicts expired entries on TTL-miss', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    // Populate under key A and let it expire.
    await coalescePerpsRestRequest('a', fetcher, { ttlMs: 1000 });
    jest.setSystemTime(1001);
    // Next call under key A must evict the stale entry before running.
    const refreshed = await coalescePerpsRestRequest('a', fetcher, {
      ttlMs: 1000,
    });

    expect(refreshed).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('resetPerpsRestCacheForTests clears cache and in-flight entries', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await coalescePerpsRestRequest('k', fetcher);
    resetPerpsRestCacheForTests();
    const after = await coalescePerpsRestRequest('k', fetcher);

    expect(after).toBe('second');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
