import { parseApy, toApyPercent } from './apy';

describe('parseApy', () => {
  it('parses a decimal rate string', () => {
    expect(parseApy('0.08')).toBe(0.08);
  });

  it('returns undefined for missing or non-finite values', () => {
    expect(parseApy(undefined)).toBeUndefined();
    expect(parseApy(null)).toBeUndefined();
    expect(parseApy('not-a-rate')).toBeUndefined();
  });
});

describe('toApyPercent', () => {
  it('converts a decimal to a one-decimal percentage with half-up rounding', () => {
    expect(toApyPercent(0.0377356238130822)).toBe(3.8);
  });

  it('returns undefined when the decimal is missing', () => {
    expect(toApyPercent(undefined)).toBeUndefined();
  });
});
