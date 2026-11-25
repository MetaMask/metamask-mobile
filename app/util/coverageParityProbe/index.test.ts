import { clampPercentage, formatPercentage } from '.';

describe('coverageParityProbe', () => {
  it('clamps values into the 0-100 range', () => {
    expect(clampPercentage(150)).toBe(100);
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(42)).toBe(42);
  });

  it('formats a mid-range percentage with one decimal', () => {
    expect(formatPercentage(42)).toBe('42.0%');
  });
});
