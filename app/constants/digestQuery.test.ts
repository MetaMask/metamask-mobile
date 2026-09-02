import {
  DIGEST_QUERY_GC_TIME_MS,
  DIGEST_QUERY_STALE_TIME_MS,
  digestQueryStaleTime,
} from './digestQuery';

describe('digestQueryStaleTime', () => {
  it('uses a 10-minute stale time for a successful payload', () => {
    expect(DIGEST_QUERY_STALE_TIME_MS).toBe(10 * 60 * 1000);
    expect(DIGEST_QUERY_GC_TIME_MS).toBe(DIGEST_QUERY_STALE_TIME_MS);
    expect(digestQueryStaleTime({ state: { data: { headline: 'ok' } } })).toBe(
      DIGEST_QUERY_STALE_TIME_MS,
    );
  });

  it('marks a null miss as immediately stale', () => {
    expect(digestQueryStaleTime({ state: { data: null } })).toBe(0);
    expect(digestQueryStaleTime({ state: { data: undefined } })).toBe(0);
  });
});
