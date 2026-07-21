import { calculateProjectedEarnings } from './projections';

describe('calculateProjectedEarnings', () => {
  it('returns zero when principal is zero', () => {
    const result = calculateProjectedEarnings(0, 0.04);

    expect(result).toBe(0);
  });

  it('returns zero when APY is zero', () => {
    const result = calculateProjectedEarnings(1000, 0);

    expect(result).toBe(0);
  });

  it('calculates 1-year earnings using the default year parameter', () => {
    const result = calculateProjectedEarnings(1000, 0.04);

    expect(result).toBeCloseTo(40, 6);
  });

  it('compounds multi-year earnings with an explicit year parameter', () => {
    const result = calculateProjectedEarnings(1000, 0.04, 5);

    expect(result).toBeCloseTo(216.6529, 4);
  });

  it('compounds earnings rather than projecting linearly', () => {
    const compound = calculateProjectedEarnings(1000, 0.04, 5);
    const linear = 1000 * 0.04 * 5;

    expect(compound).toBeGreaterThan(linear);
  });

  it('handles fractional APY values', () => {
    const result = calculateProjectedEarnings(1000, 0.055, 1);

    expect(result).toBeCloseTo(55, 6);
  });

  it('compounds fractional year values below the linear estimate', () => {
    const result = calculateProjectedEarnings(1000, 0.04, 0.5);

    expect(result).toBeCloseTo(19.8039, 4);
  });
});
