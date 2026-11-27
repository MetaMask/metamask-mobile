import { formatPercentage } from './formatPercentage';

describe('formatPercentage', () => {
  it('rounds percentages to one decimal place using half-up rounding', () => {
    expect(formatPercentage('0.1235')).toBe('12.4%');
  });

  it('shows a lower bound for positive percentages below one tenth of a percent', () => {
    expect(formatPercentage('0.0005')).toBe('<0.1%');
  });

  it('formats exactly one tenth of a percent', () => {
    expect(formatPercentage('0.001')).toBe('0.1%');
  });

  it('throws for invalid percentage data', () => {
    expect(() => formatPercentage('not-a-decimal')).toThrow(
      "Cannot format percentage from invalid value 'not-a-decimal'",
    );
  });
});
