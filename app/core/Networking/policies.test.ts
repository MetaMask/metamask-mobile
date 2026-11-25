import { CancelledError } from '@tanstack/react-query';
import { string, validate } from '@metamask/superstruct';
import type { NetworkConditions } from '../../util/deviceCapability/conditions';
import { HttpError, OfflineError, ParseError } from './errors';
import {
  allowsPrefetch,
  isRetryableError,
  resolveGcTime,
  resolvePoll,
  resolveRetryDelay,
  resolveTimeout,
  shouldRetryQuery,
  STALE_TIMES,
} from './policies';

const unknown: NetworkConditions = {
  hardware: null,
  network: null,
  latency: 'UNKNOWN',
};
const constrained: NetworkConditions = {
  hardware: 'LOW',
  network: 'SLOW_CELLULAR',
  latency: 'SLOW',
};

describe('networking policies', () => {
  it.each([
    ['HIGH', 8000, 86400000],
    ['MID', 15000, 3600000],
    ['LOW', 30000, 300000],
    [null, 15000, 86400000],
  ] as const)('resolves timeout and GC for %s', (hardware, timeout, gcTime) => {
    const conditions = { ...unknown, hardware };
    expect(resolveTimeout(conditions, true)).toBe(timeout);
    expect(resolveGcTime(conditions, true)).toBe(gcTime);
    expect(resolveTimeout(conditions, false)).toBe(15000);
    expect(resolveGcTime(conditions, false)).toBe(86400000);
  });

  it.each([
    ['realtime', 5000, 20000],
    ['frequent', 30000, 120000],
    ['background', 300000, false],
    ['manual', false, false],
  ] as const)(
    'resolves poll profile %s and caps combined multipliers',
    (profile, base, slow) => {
      expect(resolvePoll(profile, unknown, true)).toBe(base);
      expect(resolvePoll(profile, constrained, true)).toBe(slow);
      expect(resolvePoll(profile, constrained, false)).toBe(base);
    },
  );

  it('applies each poll modifier independently', () => {
    expect(resolvePoll('realtime', { ...unknown, hardware: 'LOW' }, true)).toBe(
      10000,
    );
    expect(
      resolvePoll('realtime', { ...unknown, network: 'SLOW_CELLULAR' }, true),
    ).toBe(15000);
    expect(resolvePoll('realtime', { ...unknown, latency: 'SLOW' }, true)).toBe(
      10000,
    );
    expect(resolvePoll('frequent', { ...unknown, hardware: 'LOW' }, true)).toBe(
      30000,
    );
    expect(
      resolvePoll('background', { ...unknown, latency: 'SLOW' }, true),
    ).toBe(false);
  });

  it.each([
    { hardware: 'LOW' },
    { network: 'NONE' },
    { network: 'SLOW_CELLULAR' },
    { latency: 'SLOW' },
  ] satisfies Partial<NetworkConditions>[])(
    'blocks prefetch for %j only when enabled',
    (override) => {
      expect(allowsPrefetch({ ...unknown, ...override }, true)).toBe(false);
      expect(allowsPrefetch({ ...unknown, ...override }, false)).toBe(true);
      expect(allowsPrefetch(unknown, true)).toBe(true);
    },
  );

  it.each([
    new OfflineError(),
    new ParseError(),
    new CancelledError(),
    Object.assign(new Error(), { name: 'AbortError' }),
    validate(12, string())[0],
    new HttpError(401, 'example.org'),
    new HttpError(429, 'example.org', 60001),
  ])('rejects non-retryable failures: %p', (error) => {
    expect(isRetryableError(error)).toBe(false);
  });

  it('uses tier retry limits and honours a bounded Retry-After when enabled or disabled', () => {
    const error = new HttpError(429, 'example.org', 60000);
    expect(shouldRetryQuery(0, error, constrained, true)).toBe(true);
    expect(shouldRetryQuery(1, error, constrained, true)).toBe(false);
    expect(shouldRetryQuery(1, error, constrained, false)).toBe(true);
    expect(shouldRetryQuery(2, error, unknown, true)).toBe(false);
    expect(resolveRetryDelay(0, error, constrained, true)).toBe(60000);
    expect(resolveRetryDelay(0, error, constrained, false)).toBe(60000);
  });

  it('uses tier jitter and caps delay, while disabled uses core-backend backoff', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(resolveRetryDelay(0, undefined, unknown, true)).toBe(500);
      expect(resolveRetryDelay(0, undefined, constrained, true)).toBe(1000);
      expect(resolveRetryDelay(10, undefined, constrained, true)).toBe(15000);
      expect(resolveRetryDelay(10, undefined, constrained, false)).toBe(2500);
    } finally {
      random.mockRestore();
    }
  });

  it('defines the four freshness profiles independently of tier policies', () => {
    expect(STALE_TIMES).toEqual({
      realtime: 0,
      live: 30000,
      standard: 300000,
      static: 3600000,
    });
  });
});
