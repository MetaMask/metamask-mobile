import { getBuyQuickAmounts } from './quickBuyQuickAmounts';
import {
  BUY_AMOUNT_MAX_VALID_USD,
  getBuyAmountMaxValid,
  validateQuickBuyEditAmounts,
  validateQuickBuyEditField,
} from './validateQuickBuyEditAmounts';

describe('validateQuickBuyEditAmounts', () => {
  it('accepts valid buy and sell presets', () => {
    const result = validateQuickBuyEditAmounts(
      [10, 50, 100, 250],
      [25, 50, 75, 100],
      { currency: 'USD', usdToCurrentCurrencyRate: 1 },
    );

    expect(result.isValid).toBe(true);
    expect(result.buyErrors).toEqual([null, null, null, null]);
    expect(result.sellErrors).toEqual([null, null, null, null]);
  });

  it('accepts converted JPY default quick-buy tiers', () => {
    const jpyDefaults = getBuyQuickAmounts('JPY', 150).map(
      (option) => option.value,
    );

    const result = validateQuickBuyEditAmounts(jpyDefaults, [25, 50, 75, 100], {
      currency: 'JPY',
      usdToCurrentCurrencyRate: 150,
    });

    expect(result.isValid).toBe(true);
    expect(jpyDefaults).toContain(15_000);
    expect(jpyDefaults).toContain(50_000);
  });

  it('rejects buy amounts at or below zero', () => {
    expect(validateQuickBuyEditField('buy', 0)).toBe('buy_above_zero');
    expect(validateQuickBuyEditField('buy', -1)).toBe('buy_above_zero');
  });

  it('rejects USD buy amounts above the USD max', () => {
    expect(
      validateQuickBuyEditField('buy', BUY_AMOUNT_MAX_VALID_USD + 1, {
        currency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    ).toBe('buy_below_max');
    expect(
      validateQuickBuyEditField('buy', 9_999_999, {
        currency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    ).toBe('buy_below_max');
    expect(
      validateQuickBuyEditField('buy', BUY_AMOUNT_MAX_VALID_USD, {
        currency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    ).toBeNull();
  });

  it('scales the buy max for non-USD currencies', () => {
    const jpyMax = getBuyAmountMaxValid('JPY', 150);

    expect(jpyMax).toBeGreaterThan(50_000);
    expect(
      validateQuickBuyEditField('buy', 50_000, {
        currency: 'JPY',
        usdToCurrentCurrencyRate: 150,
      }),
    ).toBeNull();
    expect(
      validateQuickBuyEditField('buy', jpyMax + 1, {
        currency: 'JPY',
        usdToCurrentCurrencyRate: 150,
      }),
    ).toBe('buy_below_max');
  });

  it('accepts default quick-buy tiers across high-magnitude currencies', () => {
    const cases = [
      { currency: 'USD', rate: 1 },
      { currency: 'EUR', rate: 0.92 },
      { currency: 'GBP', rate: 0.79 },
      { currency: 'JPY', rate: 150 },
      { currency: 'KRW', rate: 1400 },
      { currency: 'IDR', rate: 16_000 },
      { currency: 'INR', rate: 90 },
      { currency: 'BRL', rate: 5.5 },
      { currency: 'VND', rate: 25_000 },
    ] as const;

    for (const { currency, rate } of cases) {
      const defaults = getBuyQuickAmounts(currency, rate).map(
        (option) => option.value,
      );
      const result = validateQuickBuyEditAmounts(defaults, [25, 50, 75, 100], {
        currency,
        usdToCurrentCurrencyRate: rate,
      });

      expect(result.isValid).toBe(true);
      expect(
        defaults.every(
          (amount) => amount <= getBuyAmountMaxValid(currency, rate),
        ),
      ).toBe(true);
    }
  });

  it('rejects sell percentages at or below zero', () => {
    expect(validateQuickBuyEditField('sell', 0)).toBe('sell_above_zero');
  });

  it('rejects sell percentages above 100', () => {
    expect(validateQuickBuyEditField('sell', 200)).toBe('sell_below_max');
    expect(validateQuickBuyEditField('sell', 100)).toBeNull();
  });
});
