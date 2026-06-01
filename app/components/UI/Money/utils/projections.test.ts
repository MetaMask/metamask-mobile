import { calculateProjectedEarnings } from './projections';

describe('calculateProjectedEarnings', () => {
  it('returns zero when principal is zero', () => {
    const result = calculateProjectedEarnings(0, 4);

    expect(result).toBe(0);
  });

  it('returns zero when APY is zero', () => {
    const result = calculateProjectedEarnings(1000, 0);

    expect(result).toBe(0);
  });

  it('calculates 1-year earnings using the default year parameter', () => {
    const result = calculateProjectedEarnings(1000, 4);

    expect(result).toBe(40);
  });

  it('calculates multi-year earnings with an explicit year parameter', () => {
    const result = calculateProjectedEarnings(1000, 4, 5);

    expect(result).toBe(200);
  });

  it('uses linear projection, not compound', () => {
    const linear = calculateProjectedEarnings(1000, 4, 5);
    const compound = 1000 * (Math.pow(1 + 4 / 100, 5) - 1);

    expect(linear).toBe(200);
    expect(linear).not.toBeCloseTo(compound, 1);
  });

  it('handles fractional APY values', () => {
    const result = calculateProjectedEarnings(1000, 5.5, 1);

    expect(result).toBe(55);
  });

  it('handles fractional year values', () => {
    const result = calculateProjectedEarnings(1000, 4, 0.5);

    expect(result).toBe(20);
  });
});
