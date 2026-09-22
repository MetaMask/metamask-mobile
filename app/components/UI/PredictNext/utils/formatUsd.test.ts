import { formatUsd } from './formatUsd';

describe('formatUsd', () => {
  it('prefixes a positive amount with a dollar sign', () => {
    expect(formatUsd('20.86')).toBe('$20.86');
  });

  it('keeps the sign before the dollar for negative amounts', () => {
    expect(formatUsd('-1.20')).toBe('-$1.20');
  });

  it('formats zero', () => {
    expect(formatUsd('0.00')).toBe('$0.00');
  });
});
