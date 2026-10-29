import type { FeeCalculationResult } from '@metamask/perps-controller';
import {
  formatCombinedFeePercentage,
  formatOriginalCombinedFeePercentage,
  getPresentedOriginalMetamaskFeeRate,
  getPerpsFeeDiscount,
  getPerpsFeeDiscountPercentage,
} from './feeDiscount';

const createFeeCalculationResult = (
  overrides: Partial<FeeCalculationResult> = {},
): FeeCalculationResult => ({
  feeRate: 0.0007,
  feeAmount: 0.7,
  protocolFeeRate: 0.00045,
  protocolFeeAmount: 0.45,
  metamaskFeeRate: 0.00025,
  metamaskFeeAmount: 0.25,
  ...overrides,
});

describe('getPresentedOriginalMetamaskFeeRate', () => {
  it('uses the controller-provided undiscounted rate', () => {
    const fees = createFeeCalculationResult({
      feeSource: 'grant',
      metamaskFeeRate: 0.00025,
      undiscountedMetamaskFeeRate: 0.0008,
    });

    const originalRate = getPresentedOriginalMetamaskFeeRate(fees);

    expect(originalRate).toBe(0.0008);
  });

  it('uses the current rate when Core reports no discount', () => {
    const fees = createFeeCalculationResult({
      feeSource: 'grant',
      metamaskFeeRate: 0.00025,
      chargesMetamaskBuilderFee: true,
    });

    const originalRate = getPresentedOriginalMetamaskFeeRate(fees);

    expect(originalRate).toBe(0.00025);
  });

  it('preserves an unavailable current rate as undefined', () => {
    const fees = createFeeCalculationResult({
      feeSource: 'grant',
      metamaskFeeRate: undefined,
      chargesMetamaskBuilderFee: true,
    });

    const originalRate = getPresentedOriginalMetamaskFeeRate(fees);

    expect(originalRate).toBeUndefined();
  });
});

describe('getPerpsFeeDiscount', () => {
  it.each([
    ['rewards', 'vip'],
    ['grant', 'promotional'],
    ['subscription', 'member'],
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

describe('formatCombinedFeePercentage', () => {
  it('formats a positive combined rate to 3 decimals', () => {
    expect(formatCombinedFeePercentage(0.00043, 0.0002)).toBe('0.063');
  });

  it('includes a confirmed zero rate in the total', () => {
    expect(formatCombinedFeePercentage(0, 0.0002)).toBe('0.020');
    expect(formatCombinedFeePercentage(0.00043, 0)).toBe('0.043');
  });

  it('returns undefined when the protocol rate is missing', () => {
    expect(formatCombinedFeePercentage(undefined, 0.0002)).toBeUndefined();
  });

  it('returns undefined when the MetaMask rate is missing', () => {
    expect(formatCombinedFeePercentage(0.00043, undefined)).toBeUndefined();
  });

  it('returns undefined when the confirmed rates sum to zero', () => {
    expect(formatCombinedFeePercentage(0, 0)).toBeUndefined();
  });

  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [0, Number.NEGATIVE_INFINITY],
  ])(
    'returns undefined when the combined rate is not finite',
    (protocolFeeRate, metamaskFeeRate) => {
      const result = formatCombinedFeePercentage(
        protocolFeeRate,
        metamaskFeeRate,
      );

      expect(result).toBeUndefined();
    },
  );

  it('returns undefined when the combined rate is negative', () => {
    const result = formatCombinedFeePercentage(-0.00043, 0.0002);

    expect(result).toBeUndefined();
  });
});

describe('formatOriginalCombinedFeePercentage', () => {
  it('returns the pre-discount combined rate when it is higher', () => {
    expect(formatOriginalCombinedFeePercentage(0.00043, 0.0002, 0.001)).toBe(
      '0.143',
    );
  });

  it('omits the original rate when it matches the discounted rate', () => {
    expect(
      formatOriginalCombinedFeePercentage(0.00045, 0, undefined),
    ).toBeUndefined();
  });

  it('returns undefined when the protocol rate is missing', () => {
    expect(
      formatOriginalCombinedFeePercentage(undefined, 0.0002, 0.001),
    ).toBeUndefined();
  });

  it('returns undefined when the MetaMask rate is missing', () => {
    expect(
      formatOriginalCombinedFeePercentage(0.00043, undefined, 0.001),
    ).toBeUndefined();
  });
});
