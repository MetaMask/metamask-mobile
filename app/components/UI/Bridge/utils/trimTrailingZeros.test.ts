import { trimTrailingZeros } from './trimTrailingZeros';

describe('trimTrailingZeros', () => {
  it('removes trailing zeros after decimal', () => {
    expect(trimTrailingZeros('1.5000')).toBe('1.5');
  });

  it('removes decimal point when all fractional digits are zero', () => {
    expect(trimTrailingZeros('2.00')).toBe('2');
  });

  it('returns integer strings unchanged', () => {
    expect(trimTrailingZeros('42')).toBe('42');
  });

  it('preserves significant fractional digits', () => {
    expect(trimTrailingZeros('3.14')).toBe('3.14');
  });

  it('handles a single trailing zero', () => {
    expect(trimTrailingZeros('0.10')).toBe('0.1');
  });

  it('handles value that is just zero', () => {
    expect(trimTrailingZeros('0')).toBe('0');
  });

  it('handles zero with decimal', () => {
    expect(trimTrailingZeros('0.0')).toBe('0');
  });

  it('handles empty string', () => {
    expect(trimTrailingZeros('')).toBe('');
  });
});
