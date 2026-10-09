import {
  getPerpsFeeDiscount,
  getPerpsFeeDiscountPercentage,
} from './feeDiscount';

describe('getPerpsFeeDiscount', () => {
  it.each([
    ['rewards', 'vip'],
    ['grant', 'promotional'],
    ['subscription', 'generic'],
    [undefined, 'generic'],
  ] as const)('maps %s attribution to %s presentation', (feeSource, kind) => {
    expect(
      getPerpsFeeDiscount({
        feeSource,
        currentFeeRate: 0.00025,
        originalFeeRate: 0.001,
      }),
    ).toEqual({ percentage: 75, kind });
  });

  it.each([
    { feeSource: 'default' as const, currentFeeRate: 0.00025 },
    { feeSource: 'rewards' as const, currentFeeRate: 0.001 },
    { feeSource: 'grant' as const, currentFeeRate: 0.0015 },
  ])('omits presentation without an attributable reduction', (params) => {
    expect(getPerpsFeeDiscount({ ...params, originalFeeRate: 0.001 })).toEqual({
      kind: undefined,
    });
  });

  it('preserves a fully waived builder fee reduction', () => {
    expect(
      getPerpsFeeDiscount({
        feeSource: 'grant',
        currentFeeRate: 0,
        originalFeeRate: 0.001,
      }),
    ).toEqual({ percentage: 100, kind: 'promotional' });
  });

  it('rounds a 0.0009 versus 0.001 rate to a 10 percent savings', () => {
    const discount = getPerpsFeeDiscount({
      feeSource: 'rewards',
      currentFeeRate: 0.0009,
      originalFeeRate: 0.001,
    });

    expect(discount).toEqual({ percentage: 10, kind: 'vip' });
    expect(String(discount.percentage)).toBe('10');
  });

  it('rounds a 0.00035 versus 0.001 rate to a 65 percent savings', () => {
    const discount = getPerpsFeeDiscount({
      feeSource: 'rewards',
      currentFeeRate: 0.00035,
      originalFeeRate: 0.001,
    });

    expect(discount).toEqual({ percentage: 65, kind: 'vip' });
    expect(String(discount.percentage)).toBe('65');
  });

  it('keeps a fractional discount at hundredths', () => {
    const discount = getPerpsFeeDiscount({
      feeSource: 'grant',
      currentFeeRate: 0.000875,
      originalFeeRate: 0.001,
    });

    expect(discount).toEqual({ percentage: 12.5, kind: 'promotional' });
    expect(String(discount.percentage)).toBe('12.5');
  });
});

describe('getPerpsFeeDiscountPercentage', () => {
  it('rounds close-all builder totals that are not exact in binary', () => {
    const percentage = getPerpsFeeDiscountPercentage(25.5, 22.95);

    expect(percentage).toBe(10);
    expect(String(percentage)).toBe('10');
  });

  it('returns undefined when the rounded savings is zero', () => {
    const percentage = getPerpsFeeDiscountPercentage(0.001, 0.000999999);

    expect(percentage).toBeUndefined();
  });
});
