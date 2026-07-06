import {
  formatCurrency,
  getCurrencySymbol,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import {
  CURATED_QUICK_BUY_AMOUNTS,
  formatQuickBuyPillLabel,
  getBuyQuickAmounts,
  USD_QUICK_BUY_BASE,
} from './quickBuyQuickAmounts';

jest.mock('../../../../../../UI/Bridge/utils/currencyUtils', () => ({
  formatCurrency: jest.fn(
    (amount: number, currency: string) => `${currency}:${amount}`,
  ),
  getCurrencySymbol: jest.fn((currency: string) => `$${currency}`),
}));

describe('quickBuyQuickAmounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatQuickBuyPillLabel', () => {
    it('uses full currency formatting for standard-magnitude currencies', () => {
      expect(formatQuickBuyPillLabel(500, 'USD')).toBe('USD:500');
      expect(formatCurrency).toHaveBeenCalledWith(500, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false,
      });
    });

    it('uses compact K labels for BRL amounts at or above the threshold', () => {
      expect(formatQuickBuyPillLabel(2500, 'BRL')).toBe('$BRL2.5K');
      expect(formatQuickBuyPillLabel(12500, 'BRL')).toBe('$BRL12.5K');
      expect(formatCurrency).not.toHaveBeenCalled();
    });

    it('uses compact K/M labels for CNY, JPY, INR, and KRW', () => {
      expect(formatQuickBuyPillLabel(3500, 'CNY')).toBe('$CNY3.5K');
      expect(formatQuickBuyPillLabel(25000, 'CNY')).toBe('$CNY25K');
      expect(formatQuickBuyPillLabel(75000, 'JPY')).toBe('$JPY75K');
      expect(formatQuickBuyPillLabel(125000, 'INR')).toBe('$INR125K');
      expect(formatQuickBuyPillLabel(700000, 'KRW')).toBe('$KRW700K');
      expect(formatQuickBuyPillLabel(3500000, 'KRW')).toBe('$KRW3.5M');
    });
  });

  describe('getBuyQuickAmounts', () => {
    it('returns curated amounts for supported currencies without conversion', () => {
      const options = getBuyQuickAmounts('EUR', 0.92);

      expect(options).toHaveLength(4);
      expect(options[0]).toEqual({
        value: 500,
        label: 'EUR:500',
        isUsdFallback: false,
      });
      expect(options.map((option) => option.value)).toEqual(
        Array.from(CURATED_QUICK_BUY_AMOUNTS.EUR ?? []),
      );
      expect(formatCurrency).toHaveBeenCalledWith(500, 'EUR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false,
      });
    });

    it('returns compact labels for high-magnitude curated currencies', () => {
      const jpy = getBuyQuickAmounts('JPY', undefined);
      const brl = getBuyQuickAmounts('BRL', undefined);

      expect(jpy[0]).toEqual({
        value: 75000,
        label: '$JPY75K',
        isUsdFallback: false,
      });
      expect(brl[2]).toEqual({
        value: 12500,
        label: '$BRL12.5K',
        isUsdFallback: false,
      });
      expect(getCurrencySymbol).toHaveBeenCalledWith('JPY');
    });

    it('normalizes lowercase currency codes against the curated table', () => {
      const options = getBuyQuickAmounts('jpy', undefined);

      expect(options[0]?.value).toBe(75000);
      expect(options[0]?.label).toBe('$JPY75K');
      expect(options[0]?.isUsdFallback).toBe(false);
    });

    it('falls back to USD labels with converted values for unlisted currencies', () => {
      const options = getBuyQuickAmounts('SEK', 10.5);

      expect(options).toHaveLength(USD_QUICK_BUY_BASE.length);
      expect(options[0]).toEqual({
        value: 500 * 10.5,
        label: 'USD:500',
        isUsdFallback: true,
      });
      expect(formatCurrency).toHaveBeenCalledWith(500, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false,
      });
    });

    it('uses a 1:1 multiplier when the USD conversion rate is unavailable', () => {
      const options = getBuyQuickAmounts('SEK', undefined);

      expect(options[0]?.value).toBe(500);
      expect(options[0]?.isUsdFallback).toBe(true);
    });
  });
});
