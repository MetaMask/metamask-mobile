import { formatSlippagePct } from './slippageFormat';

describe('formatSlippagePct', () => {
  it('returns ">10%" when insufficientLiquidity is true', () => {
    expect(formatSlippagePct(5, true)).toBe('>10%');
  });

  it('returns "—" when estimatedPct is null', () => {
    expect(formatSlippagePct(null, false)).toBe('—');
  });

  it('returns "<0.01%" for very small non-zero values', () => {
    expect(formatSlippagePct(0.005, false)).toBe('<0.01%');
  });

  it('formats normal values with 2 decimal places', () => {
    expect(formatSlippagePct(1.23, false)).toBe('1.23%');
  });

  it('formats zero as "0.00%"', () => {
    expect(formatSlippagePct(0, false)).toBe('0.00%');
  });

  it('formats value at floor boundary exactly', () => {
    expect(formatSlippagePct(0.01, false)).toBe('0.01%');
  });

  it('prioritizes insufficientLiquidity over null', () => {
    expect(formatSlippagePct(null, true)).toBe('>10%');
  });
});
