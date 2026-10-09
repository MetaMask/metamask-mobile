import { getPerpsFeeDiscount } from './feeDiscount';

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
});
