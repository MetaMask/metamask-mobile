import { resolveTimeout } from './policies';

describe('networking policies', () => {
  it.each([
    ['HIGH', 8000],
    ['MID', 15000],
    ['LOW', 30000],
    [null, 15000],
  ] as const)('resolves the timeout for %s', (hardware, timeout) => {
    const conditions = { hardware, network: null, latency: 'UNKNOWN' } as const;
    expect(resolveTimeout(conditions, true)).toBe(timeout);
    expect(resolveTimeout(conditions, false)).toBe(15000);
  });
});
