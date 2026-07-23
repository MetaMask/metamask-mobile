import {
  validateQuickBuyEditAmounts,
  validateQuickBuyEditField,
} from './validateQuickBuyEditAmounts';

describe('validateQuickBuyEditAmounts', () => {
  it('accepts valid buy and sell presets', () => {
    const result = validateQuickBuyEditAmounts(
      [10, 50, 100, 250],
      [25, 50, 75, 100],
    );

    expect(result.isValid).toBe(true);
    expect(result.buyErrors).toEqual([null, null, null, null]);
    expect(result.sellErrors).toEqual([null, null, null, null]);
  });

  it('rejects buy amounts at or below zero', () => {
    expect(validateQuickBuyEditField('buy', 0)).toBe('buy_above_zero');
    expect(validateQuickBuyEditField('buy', -1)).toBe('buy_above_zero');
  });

  it('rejects buy amounts at or above the max', () => {
    expect(validateQuickBuyEditField('buy', 10_000)).toBe('buy_below_max');
    expect(validateQuickBuyEditField('buy', 9_999_999)).toBe('buy_below_max');
  });

  it('rejects sell percentages at or below zero', () => {
    expect(validateQuickBuyEditField('sell', 0)).toBe('sell_above_zero');
  });

  it('rejects sell percentages above 100', () => {
    expect(validateQuickBuyEditField('sell', 200)).toBe('sell_below_max');
    expect(validateQuickBuyEditField('sell', 100)).toBeNull();
  });
});
