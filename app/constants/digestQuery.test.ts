import {
  DIGEST_QUERY_GC_TIME_MS,
  DIGEST_QUERY_STALE_TIME_MS,
  digestQueryCacheTimeMs,
  digestQueryCacheTimeOption,
} from './digestQuery';

describe('digestQueryCacheTimeMs', () => {
  it('uses a 10-minute cache for a successful payload', () => {
    expect(DIGEST_QUERY_STALE_TIME_MS).toBe(10 * 60 * 1000);
    expect(DIGEST_QUERY_GC_TIME_MS).toBe(DIGEST_QUERY_STALE_TIME_MS);
    expect(digestQueryCacheTimeMs({ headline: 'ok' })).toBe(
      DIGEST_QUERY_STALE_TIME_MS,
    );
  });

  it('does not cache a null miss', () => {
    expect(digestQueryCacheTimeMs(null)).toBe(0);
    expect(digestQueryCacheTimeMs(undefined)).toBe(0);
  });

  it('exposes a runtime cache-time function for React Query', () => {
    const cacheTime = digestQueryCacheTimeOption as unknown as (query: {
      state: { data: unknown };
    }) => number;

    expect(cacheTime({ state: { data: { ok: true } } })).toBe(
      DIGEST_QUERY_STALE_TIME_MS,
    );
    expect(cacheTime({ state: { data: null } })).toBe(0);
  });
});
