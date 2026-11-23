import type { DeleGatorEnvironment } from '..';
import { timestampBuilder } from './timestampBuilder';

const ENVIRONMENT_MOCK = {
  caveatEnforcers: {
    TimestampEnforcer: '0x1234567890123456789012345678901234567890',
  },
} as unknown as DeleGatorEnvironment;

describe('timestampBuilder', () => {
  it('encodes thresholds as packed uint128 values', () => {
    const caveat = timestampBuilder(ENVIRONMENT_MOCK, 1, 1_700_000_000);

    expect(caveat).toStrictEqual({
      args: '0x',
      enforcer: ENVIRONMENT_MOCK.caveatEnforcers.TimestampEnforcer,
      terms: `0x${'1'.padStart(32, '0')}${(1_700_000_000).toString(16).padStart(32, '0')}`,
    });
  });

  it('supports no lower bound', () => {
    const caveat = timestampBuilder(ENVIRONMENT_MOCK, 0, 1_700_000_000);

    expect(caveat.terms).toBe(
      `0x${'0'.repeat(32)}${(1_700_000_000).toString(16).padStart(32, '0')}`,
    );
  });

  it('supports no upper bound', () => {
    const caveat = timestampBuilder(ENVIRONMENT_MOCK, 1_700_000_000, 0);

    expect(caveat.terms).toBe(
      `0x${(1_700_000_000).toString(16).padStart(32, '0')}${'0'.repeat(32)}`,
    );
  });

  it.each([
    ['negative', -1],
    ['non-integer', 1.5],
  ])('throws if a threshold is %s', (_name, threshold) => {
    expect(() => timestampBuilder(ENVIRONMENT_MOCK, threshold, 0)).toThrow(
      'Invalid threshold: must be a non-negative integer',
    );

    expect(() => timestampBuilder(ENVIRONMENT_MOCK, 0, threshold)).toThrow(
      'Invalid threshold: must be a non-negative integer',
    );
  });

  it('throws if beforeThreshold is not greater than afterThreshold', () => {
    expect(() => timestampBuilder(ENVIRONMENT_MOCK, 100, 100)).toThrow(
      'Invalid thresholds: beforeThreshold must be greater than afterThreshold',
    );
  });
});
